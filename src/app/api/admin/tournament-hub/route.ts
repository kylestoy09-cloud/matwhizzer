import { NextRequest, NextResponse } from 'next/server'
import { getWorkingSeason } from '@/lib/season-context'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { applySlate, previousSeasonLabel, rolloverStatus, seasonTournaments, tournamentTable } from '@/lib/tournamentSlate'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: appUser } = await supabase
    .from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

type StrengthRow = {
  tournament_id: string
  has_finals: boolean
  has_3rd_place: boolean
  has_5th_place: boolean
  has_7th_place: boolean
  district_champs: number
  region_top4: number
  state_qualifiers: number
  total_nj_wrestlers: number
}

// GET /api/admin/tournament-hub?season=<label>&gender=F  (season defaults to the season in progress)
export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gender = (req.nextUrl.searchParams.get('gender') as 'M' | 'F') ?? 'F'
  const season = req.nextUrl.searchParams.get('season') ?? (await getWorkingSeason(gender)).label

  const db = createSupabaseAdmin()

  // Resolve current season_id so we can derive the prior postseason season_id
  const { data: seasonRow } = await db
    .from('seasons')
    .select('id')
    .eq('year_label', season)
    .maybeSingle()
  if (!seasonRow) return NextResponse.json({ error: `Unknown season: ${season}` }, { status: 400 })
  const currentSeasonId: number = seasonRow.id
  const postseasonSeasonId: number = currentSeasonId - 1

  const [registryRes, strengthRes] = await Promise.all([
    db
      .from('tournament_registry')
      .select('*')
      .eq('season', season)
      .in('gender', [gender, 'both'])
      .order('date_start', { ascending: true, nullsFirst: false }),
    db.rpc('tournament_strength_report', {
      p_season: season,
      p_postseason_season_id: postseasonSeasonId,
      p_gender: gender,
    }),
  ])

  if (registryRes.error) return NextResponse.json({ error: registryRes.error.message }, { status: 500 })
  if (strengthRes.error) {
    console.error('[tournament-hub] strength RPC error:', strengthRes.error.message)
  }

  const tournamentIds = (registryRes.data ?? [])
    .map(r => r.in_season_tournament_id)
    .filter(Boolean) as string[]

  type CountsRow = { tournament_id: string; bout_count: number; participant_count: number }

  const [countsRes, placementsRes, scoresRes] = await Promise.all([
    tournamentIds.length > 0
      ? db.rpc('tournament_hub_counts', { p_tournament_ids: tournamentIds, p_gender: gender })
      : Promise.resolve({ data: [] as CountsRow[], error: null }),
    // Paged: the API caps each request at 1,000 rows regardless of .limit()
    tournamentIds.length > 0
      ? fetchAllRows((from, to) => db.from('tournament_placements').select('in_season_tournament_id').in('in_season_tournament_id', tournamentIds).order('id').range(from, to))
      : Promise.resolve({ data: [] }),
    tournamentIds.length > 0
      ? fetchAllRows((from, to) => db.from('in_season_tournament_team_scores').select('tournament_id').in('tournament_id', tournamentIds).order('id').range(from, to))
      : Promise.resolve({ data: [] }),
  ])

  const boutCounts   = new Map<string, number>()
  const schoolCounts = new Map<string, number>()
  for (const r of (countsRes.data ?? []) as CountsRow[]) {
    if (r.tournament_id) {
      boutCounts.set(r.tournament_id,   r.bout_count)
      schoolCounts.set(r.tournament_id, r.participant_count)
    }
  }

  function buildCountMap(rows: { [key: string]: string }[] | null, key: string): Map<string, number> {
    const m = new Map<string, number>()
    for (const r of rows ?? []) {
      const id = r[key]
      if (id) m.set(id, (m.get(id) ?? 0) + 1)
    }
    return m
  }

  const placementCounts = buildCountMap(placementsRes.data as { [k: string]: string }[] | null, 'in_season_tournament_id')
  const scoreCounts     = buildCountMap(scoresRes.data as { [k: string]: string }[] | null, 'tournament_id')

  // Active = this season's edition of last season's tournament; New = first season (src/lib/tournamentSlate.ts).
  // Last season's tournaments with no edition this season are listed apart as not set up yet.
  const [current, prior] = await Promise.all([seasonTournaments(db, gender, season), seasonTournaments(db, gender, previousSeasonLabel(season))])
  const priorOf = new Map(current.map(t => [t.id, (t.prior_id as string | null | undefined) ?? null]))
  const roll = rolloverStatus(prior, current)
  const slim = (p: (typeof prior)[number]) => ({ id: p.id, name: p.name, start_date: p.start_date, end_date: (p.end_date as string | null) ?? null, is_oos: !!p.is_oos })
  const notSetUp = roll.open.map(slim)
  const notReturning = roll.notReturning.map(slim)

  const strengthMap = new Map<string, StrengthRow>(
    ((strengthRes.data ?? []) as StrengthRow[]).map(r => [r.tournament_id, r])
  )

  const rows = (registryRes.data ?? []).map(reg => {
    const s   = reg.in_season_tournament_id ? (strengthMap.get(reg.in_season_tournament_id) ?? null) : null
    const tid = reg.in_season_tournament_id ?? null
    return {
      registry_id:             reg.id,
      slate:                   tid ? (priorOf.get(tid) ? 'active' : 'new') : null,
      name:                    reg.name,
      date_start:              reg.date_start,
      date_end:                reg.date_end,
      event_type:              reg.event_type,
      point_value:             reg.point_value,
      imported:                reg.imported,
      in_season_tournament_id: tid,
      notes:                   reg.notes,
      has_finals:              s?.has_finals       ?? null,
      has_3rd_place:           s?.has_3rd_place    ?? null,
      has_5th_place:           s?.has_5th_place    ?? null,
      has_7th_place:           s?.has_7th_place    ?? null,
      district_champs:         s?.district_champs  ?? null,
      region_top4:             s?.region_top4      ?? null,
      state_qualifiers:        s?.state_qualifiers ?? null,
      total_nj_wrestlers:      s?.total_nj_wrestlers ?? null,
      school_count:            tid ? (schoolCounts.get(tid)    ?? 0) : null,
      bout_count:              tid ? (boutCounts.get(tid)      ?? 0) : null,
      placement_count:         tid ? (placementCounts.get(tid) ?? 0) : null,
      team_score_count:        tid ? (scoreCounts.get(tid)     ?? 0) : null,
    }
  })

  return NextResponse.json({ rows, notSetUp, notReturning, rollover: { pct: roll.pct, rolled: roll.rolled.length, notReturning: notReturning.length, total: prior.length }, priorSeason: previousSeasonLabel(season) })
}

// PATCH /api/admin/tournament-hub — update point_value and/or imported flag, or create a tournament record
export async function PATCH(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { registry_id, in_season_tournament_id, point_value, imported, action } = body

  // Mark last season's tournament as not coming back this season (or undo): counts toward the Tournament Rollover %
  if (action === 'not_returning') {
    const g = body.gender === 'F' ? 'F' : 'M'
    if (!body.prior_id) return NextResponse.json({ error: 'Missing prior_id' }, { status: 400 })
    const db = createSupabaseAdmin()
    const { error } = await db.from(tournamentTable(g)).update({ not_returning_at: body.on === false ? null : new Date().toISOString() }).eq('id', body.prior_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Set up last season's tournament for this season: same settings, dates a year on (same weekday)
  if (action === 'set_up_prior') {
    const g = body.gender === 'F' ? 'F' : 'M'
    if (!body.prior_id || !body.season) return NextResponse.json({ error: 'Missing prior_id or season' }, { status: 400 })
    const db = createSupabaseAdmin()
    const { data: p, error } = await db.from(tournamentTable(g)).select('id, name, start_date, end_date, is_oos').eq('id', body.prior_id).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!p) return NextResponse.json({ error: "Last season's tournament not found" }, { status: 404 })
    const { data: reg } = await db.from('tournament_registry').select('state').eq('in_season_tournament_id', p.id).maybeSingle()
    const later = (d: string | null) => (d ? new Date(Date.parse(d) + 364 * 86400000).toISOString().slice(0, 10) : null)
    const state = p.is_oos ? (reg?.state && reg.state !== 'NJ' ? reg.state : 'OOS') : 'NJ'
    const r = await applySlate(db, g, body.season, [{ event: { name: p.name, date_start: later(p.start_date), date_end: later(p.end_date), state, event_type: 'tournament' }, link: { kind: 'prior', id: p.id } }])
    if (r.errors.length) return NextResponse.json({ error: r.errors.join('; ') }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Merge a New tournament into last season's (Kyle 2026-11-16: "Gary Vittorio Holiday Classic" is "Parsippany Hills
  // Holiday Tournament"): it becomes this season's edition — prior_id set, last season's settings copied — and keeps
  // this season's name and dates
  if (action === 'merge_prior') {
    const g = body.gender === 'F' ? 'F' : 'M'
    const T = tournamentTable(g)
    const { tournament_id, prior_id } = body
    if (!tournament_id || !prior_id) return NextResponse.json({ error: 'Missing tournament_id or prior_id' }, { status: 400 })
    const db = createSupabaseAdmin()
    const [{ data: t, error: tErr }, { data: p, error: pErr }] = await Promise.all([
      db.from(T).select('id, season, prior_id').eq('id', tournament_id).maybeSingle(),
      db.from(T).select('*').eq('id', prior_id).maybeSingle(),
    ])
    if (tErr || pErr) return NextResponse.json({ error: (tErr ?? pErr)!.message }, { status: 500 })
    if (!t || !p) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    if (t.prior_id) return NextResponse.json({ error: 'That tournament is already linked to last season' }, { status: 400 })
    if (p.season !== previousSeasonLabel(t.season)) return NextResponse.json({ error: `Pick one of ${previousSeasonLabel(t.season)}'s tournaments` }, { status: 400 })
    const { data: taken } = await db.from(T).select('name').eq('prior_id', prior_id).maybeSingle()
    if (taken) return NextResponse.json({ error: `${p.name} already continues as ${taken.name}` }, { status: 400 })
    const patch: Record<string, unknown> = { prior_id }
    for (const k of ['location', 'source_format', 'tournament_type', 'venue_name', 'venue_address', 'location_school_id', 'banner_bg', 'banner_fg', 'podium_depth', 'point_value']) patch[k] = p[k] ?? null
    const { error } = await db.from(T).update(patch).eq('id', tournament_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (p.point_value != null) await db.from('tournament_registry').update({ point_value: p.point_value }).eq('in_season_tournament_id', tournament_id).is('point_value', null)
    return NextResponse.json({ ok: true })
  }

  if (!registry_id) return NextResponse.json({ error: 'Missing registry_id' }, { status: 400 })

  const db = createSupabaseAdmin()

  // Create a bare in_season_tournaments record from the registry row and link it back
  if (action === 'create_tournament_record') {
    const { name, date_start, date_end, season, gender } = body
    if (!name || !season || !gender) return NextResponse.json({ error: 'Missing name, season, or gender' }, { status: 400 })
    const createTable = gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'
    const ins = await db.from(createTable).insert({
      name,
      season,
      start_date: date_start ?? null,
      end_date: date_end ?? null,
      source_format: null,
      tournament_type: 'inside',
    }).select('id').single()
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 })
    const tid = ins.data.id
    await db.from('tournament_registry').update({ in_season_tournament_id: tid }).eq('id', registry_id)
    return NextResponse.json({ ok: true, in_season_tournament_id: tid })
  }

  const regPatch: Record<string, unknown> = {}
  if (point_value !== undefined) regPatch.point_value = point_value
  if (imported    !== undefined) regPatch.imported    = imported

  const saves: PromiseLike<unknown>[] = []

  if (Object.keys(regPatch).length > 0) {
    saves.push(db.from('tournament_registry').update(regPatch).eq('id', registry_id))
  }
  if (point_value !== undefined && in_season_tournament_id) {
    const { gender: patchGender } = body
    const patchTable = patchGender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'
    saves.push(db.from(patchTable).update({ point_value }).eq('id', in_season_tournament_id))
  }

  await Promise.all(saves.map(s => Promise.resolve(s)))
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/tournament-hub?id=<registry_id>
export async function DELETE(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const db = createSupabaseAdmin()
  const { error } = await db.from('tournament_registry').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
