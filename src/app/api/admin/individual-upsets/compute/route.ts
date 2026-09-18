import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function requireAdmin() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data: appUser } = await sb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

// Chunk an array into sub-arrays of at most `size`
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// POST /api/admin/individual-upsets/compute
// Body: { week_id: number, gender: 'M'|'F', weight_class: number }
//
// Derives Mon–Sun date window from the week's publish date (Sunday).
// Finds all matches in wrestler_match_score_log where:
//   - Both wrestlers are NJ competitors at this weight_class (per wrestler_hammer_scores)
//   - The winner had a lower pre-match hammer than the loser (upset)
//   - match_source is 'dual_meet' or 'tournament_bout' (no postseason)
//   - match_date falls in the Mon–Sun window
// Joins source tables to get result_type (Fall/MD/Dec/TF/etc.).
// UPSERTS into individual_upsets — ON CONFLICT DO NOTHING to preserve editorial choices.
// Returns the full upset list for this week+gender+weight (already stored rows).

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { week_id, gender, weight_class } = body as { week_id: number; gender: 'M' | 'F'; weight_class: number }
  if (!week_id || !gender || !weight_class) {
    return NextResponse.json({ error: 'week_id, gender, and weight_class are required' }, { status: 400 })
  }

  const db = createSupabaseAdmin()

  // ── 1. Resolve week → date range + season ────────────────────────────────────

  const { data: week } = await db
    .from('individual_ranking_weeks')
    .select('id, week_number, week_date, season_id')
    .eq('id', week_id)
    .single()
  if (!week) return NextResponse.json({ error: 'week_id not found' }, { status: 404 })

  if ((week as any).week_number === 1) {
    return NextResponse.json({
      inserted: 0,
      upsets:   [],
      message:  'Upset tracking begins Week 2 — no prior rankings exist to define what counts as an upset.',
    })
  }

  const { data: season } = await db
    .from('seasons')
    .select('id, year_label')
    .eq('id', week.season_id)
    .single()
  if (!season) return NextResponse.json({ error: 'Season for this week not found' }, { status: 500 })

  const seasonLabel = season.year_label as string
  const endDate     = week.week_date as string                     // Sunday (publish day)
  const startDate   = offsetDate(endDate, -6)                      // previous Monday

  // ── 2. Load all wrestlers at this weight+gender (geo context included) ────────

  type HammerRow = {
    wrestler_id: string
    district:    number | null
    region:      number | null
    section:     string | null
  }

  const wrestlerGeoMap = new Map<string, HammerRow>()
  {
    let offset = 0
    while (true) {
      const { data } = await db
        .from('wrestler_hammer_scores')
        .select('wrestler_id, district, region, section')
        .eq('season',       seasonLabel)
        .eq('gender',       gender)
        .eq('weight_class', weight_class)
        .not('district', 'is', null)     // NJ only (has a district assignment)
        .range(offset, offset + 499)
      if (!data?.length) break
      for (const r of data as HammerRow[]) wrestlerGeoMap.set(r.wrestler_id, r)
      if (data.length < 500) break
      offset += 500
    }
  }

  if (!wrestlerGeoMap.size) {
    return NextResponse.json({ inserted: 0, upsets: [], message: 'No wrestlers found at this weight for this season' })
  }

  const weightWrestlerIds = [...wrestlerGeoMap.keys()]

  // ── 3. Query match log for upsets in the date window ─────────────────────────
  //
  // We only want is_winner=true rows (one row per winner per match).
  // Upset condition: opponent_pre_match_hammer > pre_match_hammer.
  // Both wrestlers must be in our weight set.

  type LogRow = {
    wrestler_id:               string
    match_date:                string
    match_source:              string
    source_id:                 string
    opponent_wrestler_id:      string | null
    pre_match_hammer:          number
    opponent_pre_match_hammer: number
  }

  const upsetLogs: LogRow[] = []
  for (const ids of chunk(weightWrestlerIds, 80)) {
    const { data } = await db
      .from('wrestler_match_score_log')
      .select('wrestler_id, match_date, match_source, source_id, opponent_wrestler_id, pre_match_hammer, opponent_pre_match_hammer')
      .eq('season',    seasonLabel)
      .eq('is_winner', true)
      .in('match_source', ['dual_meet', 'tournament_bout'])
      .gte('match_date', startDate)
      .lte('match_date', endDate)
      .in('wrestler_id', ids)
      .not('opponent_wrestler_id', 'is', null)
      .filter('opponent_pre_match_hammer', 'gt', 'pre_match_hammer')   // raw filter for upset condition
    upsetLogs.push(...((data ?? []) as LogRow[]))
  }

  // Post-filter: numeric comparison (Supabase filter above is a string comparison fallback)
  // and opponent must also be in the weight set
  const validUpsets = upsetLogs.filter(l =>
    l.opponent_pre_match_hammer > l.pre_match_hammer &&
    l.opponent_wrestler_id !== null &&
    wrestlerGeoMap.has(l.opponent_wrestler_id!)
  )

  if (!validUpsets.length) {
    return NextResponse.json({ inserted: 0, upsets: [], message: 'No upsets found in this window' })
  }

  // ── 4. Fetch result_type from source tables ───────────────────────────────────

  const dualIds       = validUpsets.filter(l => l.match_source === 'dual_meet').map(l => l.source_id)
  const tournamentIds = validUpsets.filter(l => l.match_source === 'tournament_bout').map(l => l.source_id)

  const resultTypeMap = new Map<string, string | null>()

  const dualMatchesTable = gender === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches'
  const boutTable        = gender === 'F' ? 'tournament_bouts_girls'  : 'tournament_bouts'
  for (const ids of chunk(dualIds, 100)) {
    const { data } = await db
      .from(dualMatchesTable)
      .select('id, result_type')
      .in('id', ids)
    for (const r of (data ?? []) as { id: string; result_type: string | null }[]) {
      resultTypeMap.set(r.id, r.result_type)
    }
  }

  for (const ids of chunk(tournamentIds, 100)) {
    const { data } = await db
      .from(boutTable)
      .select('id, result_type')
      .in('id', ids)
    for (const r of (data ?? []) as { id: string; result_type: string | null }[]) {
      resultTypeMap.set(r.id, r.result_type)
    }
  }

  // ── 5. Build rows for upsert ──────────────────────────────────────────────────

  type UpsertRow = {
    week_id:             number
    gender:              string
    weight_class:        number
    winner_id:           string
    loser_id:            string
    winner_pre_hammer:   number
    loser_pre_hammer:    number
    differential:        number
    win_type:            string | null
    match_date:          string
    match_source:        string
    source_id:           string
    winner_district:     number | null
    winner_region:       number | null
    winner_section:      string | null
    loser_district:      number | null
    loser_region:        number | null
    loser_section:       string | null
  }

  const rows: UpsertRow[] = validUpsets.map(l => {
    const winnerGeo = wrestlerGeoMap.get(l.wrestler_id)!
    const loserGeo  = wrestlerGeoMap.get(l.opponent_wrestler_id!)!
    return {
      week_id,
      gender,
      weight_class,
      winner_id:           l.wrestler_id,
      loser_id:            l.opponent_wrestler_id!,
      winner_pre_hammer:   l.pre_match_hammer,
      loser_pre_hammer:    l.opponent_pre_match_hammer,
      differential:        Math.round((l.opponent_pre_match_hammer - l.pre_match_hammer) * 100) / 100,
      win_type:            resultTypeMap.get(l.source_id) ?? null,
      match_date:          l.match_date,
      match_source:        l.match_source,
      source_id:           l.source_id,
      winner_district:     winnerGeo.district,
      winner_region:       winnerGeo.region,
      winner_section:      winnerGeo.section,
      loser_district:      loserGeo.district,
      loser_region:        loserGeo.region,
      loser_section:       loserGeo.section,
    }
  })

  // De-duplicate: one row per (winner, loser, date) in case the log had both perspectives
  const seen = new Set<string>()
  const deduped = rows.filter(r => {
    const key = `${r.winner_id}|${r.loser_id}|${r.match_date}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // ON CONFLICT DO NOTHING — preserves existing include_in_publish editorial choices
  const { error } = await db
    .from('individual_upsets')
    .upsert(deduped, {
      onConflict:       'week_id,gender,weight_class,winner_id,loser_id,match_date',
      ignoreDuplicates: true,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── 6. Return stored upset list for this week+weight (with editorial state) ───

  const { data: stored } = await db
    .from('individual_upsets')
    .select('*')
    .eq('week_id',      week_id)
    .eq('gender',       gender)
    .eq('weight_class', weight_class)
    .order('differential', { ascending: false })

  return NextResponse.json({ inserted: deduped.length, upsets: stored ?? [] })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function offsetDate(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
