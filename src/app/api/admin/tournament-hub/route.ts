import { NextRequest, NextResponse } from 'next/server'
import { getWorkingSeason } from '@/lib/season-context'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { fetchAllRows } from '@/lib/fetchAllRows'

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

  const strengthMap = new Map<string, StrengthRow>(
    ((strengthRes.data ?? []) as StrengthRow[]).map(r => [r.tournament_id, r])
  )

  const rows = (registryRes.data ?? []).map(reg => {
    const s   = reg.in_season_tournament_id ? (strengthMap.get(reg.in_season_tournament_id) ?? null) : null
    const tid = reg.in_season_tournament_id ?? null
    return {
      registry_id:             reg.id,
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

  return NextResponse.json({ rows })
}

// PATCH /api/admin/tournament-hub — update point_value and/or imported flag, or create a tournament record
export async function PATCH(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { registry_id, in_season_tournament_id, point_value, imported, action } = body
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
