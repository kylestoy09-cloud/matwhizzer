import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

function extractNum(name: string): number {
  const m = name.match(/(\d+)/)
  return m ? parseInt(m[1]) : 0
}

export async function GET(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = createSupabaseAdmin()

  const { data: tournament, error: tErr } = await db
    .from('tournaments')
    .select('*')
    .eq('id', Number(id))
    .single()

  if (tErr || !tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })

  const num = extractNum(tournament.name as string)

  // Entries with wrestler + school join
  const { data: rawEntries } = await db
    .from('tournament_entries')
    .select('id, tournament_id, wrestler_id, weight, seed, wrestlers(first_name, last_name, schools(display_name))')
    .eq('tournament_id', Number(id))
    .order('weight')
    .order('seed', { ascending: true, nullsFirst: false })

  const entries = (rawEntries ?? []).map((e: any) => ({
    id: e.id,
    tournament_id: e.tournament_id,
    wrestler_id: e.wrestler_id,
    weight: e.weight,
    seed: e.seed,
    wrestler_name: e.wrestlers
      ? `${e.wrestlers.first_name ?? ''} ${e.wrestlers.last_name ?? ''}`.trim()
      : null,
    school_name: e.wrestlers?.schools?.display_name ?? null,
  }))

  // Placements
  const { data: placements } = await db
    .from('tournament_placements')
    .select('*')
    .eq('tournament_id', Number(id))
    .order('weight')
    .order('place')

  // Team scores via RPC
  let teamScores: any[] = []
  try {
    const isDistrict = (tournament.tournament_type as string) === 'districts'
    const rpcName = isDistrict ? 'district_team_score' : 'region_team_score'
    const paramName = isDistrict ? 'p_district' : 'p_region'
    const { data: scores } = await (db.rpc as any)(rpcName, {
      [paramName]: num,
      p_gender: tournament.gender,
      p_season: tournament.season_id,
    })
    teamScores = scores ?? []
  } catch {
    teamScores = []
  }

  return NextResponse.json({
    tournament: { ...tournament, num },
    entries,
    placements: placements ?? [],
    teamScores,
  })
}

export async function POST(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action } = body
  const db = createSupabaseAdmin()

  if (action === 'update_seed') {
    const { entry_id, seed } = body
    const { error } = await db
      .from('tournament_entries')
      .update({ seed: seed ?? null })
      .eq('id', entry_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'save_placements') {
    const { tournament_id, placements } = body
    // Delete existing
    await db.from('tournament_placements').delete().eq('tournament_id', Number(tournament_id))
    if (placements?.length > 0) {
      const rows = placements.map((p: any) => ({
        tournament_id: Number(tournament_id),
        weight: p.weight,
        place: p.place,
        wrestler_name: p.wrestler_name ?? '',
        school_name: p.school_name ?? null,
        wrestler_id: p.wrestler_id ?? null,
      }))
      const { error } = await db.from('tournament_placements').insert(rows)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, count: placements?.length ?? 0 })
  }

  // save_team_scores: team scores are managed via precomputed_team_scores, skip for now
  if (action === 'save_team_scores') {
    return NextResponse.json({ error: 'Team scores are managed via the scoring RPCs. Use the district/region team score pipeline.' }, { status: 400 })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
}
