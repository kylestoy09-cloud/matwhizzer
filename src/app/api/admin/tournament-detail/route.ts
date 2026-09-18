import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

// GET /api/admin/tournament-detail?id={registry_id}
export async function GET(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const registryId = req.nextUrl.searchParams.get('id')
  if (!registryId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = createSupabaseAdmin()

  const { data: reg, error: regErr } = await db
    .from('tournament_registry')
    .select('*')
    .eq('id', registryId)
    .single()

  if (regErr || !reg) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const tid = reg.in_season_tournament_id as string | null
  const regGender = (reg as any).gender as 'M' | 'F' | 'both' | null
  const isGirls   = regGender === 'F'
  const istTable          = isGirls ? 'in_season_tournaments_girls'              : 'in_season_tournaments'
  const participantsTable = isGirls ? 'in_season_tournament_participants_girls'  : 'in_season_tournament_participants'
  const seedsTable        = isGirls ? 'in_season_tournament_seeds_girls'         : 'in_season_tournament_seeds'
  const boutTable         = isGirls ? 'tournament_bouts_girls'                   : 'tournament_bouts'

  if (!tid) {
    return NextResponse.json({
      registry: reg,
      tournament: null,
      participants: [],
      seeds: [],
      placements: [],
      team_scores: [],
      bout_count: 0,
    })
  }

  const [tourRes, participantsRes, seedsRes, placementsRes, scoresRes, boutsRes] = await Promise.all([
    db.from(istTable).select('*').eq('id', tid).single(),
    db
      .from(participantsTable)
      .select('id, school_id, added_via, schools(id, display_name)')
      .eq('in_season_tournament_id', tid)
      .order('school_id'),
    db
      .from(seedsTable)
      .select('*')
      .eq('in_season_tournament_id', tid)
      .order('weight_class')
      .order('seed'),
    db
      .from('tournament_placements')
      .select('*')
      .eq('in_season_tournament_id', tid)
      .order('weight_class')
      .order('place'),
    db
      .from('in_season_tournament_team_scores')
      .select('*')
      .eq('tournament_id', tid)
      .order('place'),
    db
      .from(boutTable)
      .select('id', { count: 'exact', head: true })
      .eq('in_season_tournament_id', tid),
  ])

  return NextResponse.json({
    registry: reg,
    tournament: tourRes.data ?? null,
    participants: participantsRes.data ?? [],
    seeds: seedsRes.data ?? [],
    placements: placementsRes.data ?? [],
    team_scores: scoresRes.data ?? [],
    bout_count: boutsRes.count ?? 0,
  })
}

// PATCH /api/admin/tournament-detail — update registry + tournament fields
export async function PATCH(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { registry_id, in_season_tournament_id, gender: patchGender, ...fields } = body

  if (!registry_id) return NextResponse.json({ error: 'registry_id required' }, { status: 400 })

  const db = createSupabaseAdmin()
  const patchIstTable = patchGender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'

  const regFields: Record<string, unknown> = {}
  const tourFields: Record<string, unknown> = {}

  const REG_COLS = ['name', 'date_start', 'date_end', 'point_value', 'event_type', 'notes', 'imported']
  const TOUR_COLS = ['name', 'start_date', 'end_date', 'location', 'tournament_type', 'source_format', 'point_value']

  for (const [k, v] of Object.entries(fields)) {
    if (REG_COLS.includes(k)) regFields[k] = v
    if (TOUR_COLS.includes(k)) tourFields[k] = v
  }

  const saves: PromiseLike<unknown>[] = []

  if (Object.keys(regFields).length > 0) {
    saves.push(
      db.from('tournament_registry').update(regFields).eq('id', registry_id).then(r => {
        if (r.error) throw new Error(r.error.message)
      })
    )
  }

  if (in_season_tournament_id && Object.keys(tourFields).length > 0) {
    saves.push(
      db.from(patchIstTable).update(tourFields).eq('id', in_season_tournament_id).then(r => {
        if (r.error) throw new Error(r.error.message)
      })
    )
  }

  await Promise.all(saves.map(s => Promise.resolve(s)))
  return NextResponse.json({ ok: true })
}

// POST /api/admin/tournament-detail — seed/participant/placement upsert + create/link
export async function POST(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, in_season_tournament_id, gender: postGender } = body

  const db = createSupabaseAdmin()

  // ── Create a new in_season_tournament and link it to the registry row ──
  if (action === 'create_and_link') {
    const { registry_id } = body
    if (!registry_id) return NextResponse.json({ error: 'registry_id required' }, { status: 400 })

    const { data: reg, error: regErr } = await db
      .from('tournament_registry').select('*').eq('id', registry_id).single()
    if (regErr || !reg) return NextResponse.json({ error: 'Registry row not found' }, { status: 404 })

    const createTable = (reg as any).gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'
    const { data: created, error: createErr } = await db
      .from(createTable)
      .insert({
        name:       reg.name,
        start_date: reg.date_start ?? new Date().toISOString().slice(0, 10),
        end_date:   reg.date_end ?? null,
        season:     reg.season,
      })
      .select('id')
      .single()
    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })

    const { error: linkErr } = await db
      .from('tournament_registry')
      .update({ in_season_tournament_id: created.id, imported: true })
      .eq('id', registry_id)
    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, in_season_tournament_id: created.id })
  }

  // ── Link an existing in_season_tournament to a registry row ──
  if (action === 'link_existing') {
    const { registry_id, existing_tournament_id } = body
    if (!registry_id || !existing_tournament_id)
      return NextResponse.json({ error: 'registry_id and existing_tournament_id required' }, { status: 400 })
    const { error } = await db
      .from('tournament_registry')
      .update({ in_season_tournament_id: existing_tournament_id, imported: true })
      .eq('id', registry_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (!in_season_tournament_id) return NextResponse.json({ error: 'in_season_tournament_id required' }, { status: 400 })

  const postIsGirls       = postGender === 'F'
  const postSeedsTable    = postIsGirls ? 'in_season_tournament_seeds_girls'        : 'in_season_tournament_seeds'
  const postPartTable     = postIsGirls ? 'in_season_tournament_participants_girls'  : 'in_season_tournament_participants'
  const postBoutTable     = postIsGirls ? 'tournament_bouts_girls'                  : 'tournament_bouts'

  if (action === 'save_seeds') {
    const seeds: Array<{ weight_class: number; seed: number; wrestler_name_raw: string; school_name_raw: string }> = body.seeds ?? []
    await db.from(postSeedsTable).delete().eq('in_season_tournament_id', in_season_tournament_id)
    if (seeds.length > 0) {
      const rows = seeds.map(s => ({ ...s, in_season_tournament_id }))
      const { error } = await db.from(postSeedsTable).insert(rows)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, count: seeds.length })
  }

  if (action === 'add_participant') {
    const { school_id } = body
    if (!school_id) return NextResponse.json({ error: 'school_id required' }, { status: 400 })
    const { error } = await db.from(postPartTable).upsert(
      { in_season_tournament_id, school_id, added_via: 'manual' },
      { onConflict: 'in_season_tournament_id,school_id' }
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'remove_participant') {
    const { school_id } = body
    await db.from(postPartTable)
      .delete()
      .eq('in_season_tournament_id', in_season_tournament_id)
      .eq('school_id', school_id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'sync_participants_from_bouts') {
    const { data: boutRows, error: boutErr } = await db
      .from(postBoutTable)
      .select('wrestler1_school_id, wrestler2_school_id')
      .eq('in_season_tournament_id', in_season_tournament_id)
    if (boutErr) return NextResponse.json({ error: boutErr.message }, { status: 500 })
    const schoolIds = new Set<number>()
    for (const row of boutRows ?? []) {
      if (row.wrestler1_school_id) schoolIds.add(row.wrestler1_school_id)
      if (row.wrestler2_school_id) schoolIds.add(row.wrestler2_school_id)
    }
    if (schoolIds.size > 0) {
      const rows = [...schoolIds].map(school_id => ({ in_season_tournament_id, school_id, added_via: 'manual' }))
      const { error } = await db.from(postPartTable).upsert(rows, { onConflict: 'in_season_tournament_id,school_id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, synced: schoolIds.size })
  }

  if (action === 'save_placements') {
    const placements: Array<{ weight_class: number; place: number; wrestler_name_raw: string; school_name_raw: string; school_id: number | null; wrestler_id: string | null }> = body.placements ?? []
    await db.from('tournament_placements').delete().eq('in_season_tournament_id', in_season_tournament_id)
    if (placements.length > 0) {
      const rows = placements.map(p => ({ ...p, in_season_tournament_id }))
      const { error } = await db.from('tournament_placements').insert(rows)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, count: placements.length })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
