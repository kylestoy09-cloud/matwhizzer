import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(high school|high|hs|academy|prep|school|athletics)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// GET /api/admin/oos-schools?gender=M|F
// Out-of-state school rows are shared by boys and girls. Each side lists the OOS
// schools that appear in its own tournament data, counted from that gender's
// tables, plus schools no data points at for either gender (left to clean up).
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gender = req.nextUrl.searchParams.get('gender') === 'F' ? 'F' : 'M'
  const db = createSupabaseAdmin()

  const [schoolsRes, boysBoutsRes, girlsBoutsRes, placementsRes, aliasRes, tsRes, boysTRes, girlsTRes] = await Promise.all([
    db.from('schools').select('id, display_name').eq('is_nj', false).order('display_name'),
    db.from('tournament_bouts').select('wrestler1_school_id, wrestler2_school_id'),
    db.from('tournament_bouts_girls').select('wrestler1_school_id, wrestler2_school_id'),
    db.from('tournament_placements').select('school_id, in_season_tournament_id'),
    db.from('wrestler_name_aliases').select('school_id'),
    db.from('in_season_tournament_team_scores').select('school_id, tournament_id'),
    db.from('in_season_tournaments').select('id'),
    db.from('in_season_tournaments_girls').select('id'),
  ])

  if (schoolsRes.error) return NextResponse.json({ error: schoolsRes.error.message }, { status: 500 })

  const boysT  = new Set((boysTRes.data ?? []).map(t => t.id as string))
  const girlsT = new Set((girlsTRes.data ?? []).map(t => t.id as string))
  const mineT  = gender === 'F' ? girlsT : boysT

  const bump = (m: Map<number, number>, id: number | null | undefined) => { if (id) m.set(id, (m.get(id) ?? 0) + 1) }
  const boutsBy = (rows: { wrestler1_school_id: number | null; wrestler2_school_id: number | null }[] | null) => {
    const m = new Map<number, number>()
    for (const r of rows ?? []) { bump(m, r.wrestler1_school_id); bump(m, r.wrestler2_school_id) }
    return m
  }
  const boysBouts  = boutsBy(boysBoutsRes.data)
  const girlsBouts = boutsBy(girlsBoutsRes.data)
  const boutCount  = gender === 'F' ? girlsBouts : boysBouts

  const plCount = new Map<number, number>()
  const anyPl   = new Set<number>()
  for (const r of placementsRes.data ?? []) {
    if (!r.school_id) continue
    anyPl.add(r.school_id)
    if (mineT.has(r.in_season_tournament_id)) bump(plCount, r.school_id)
  }
  // Aliases are not tied to a gender: shown on both sides
  const aliasCount = new Map<number, number>()
  for (const r of aliasRes.data ?? []) bump(aliasCount, r.school_id)
  const tsCount = new Map<number, number>()
  const anyTs   = new Set<number>()
  for (const r of tsRes.data ?? []) {
    if (!r.school_id) continue
    anyTs.add(r.school_id)
    if (mineT.has(r.tournament_id)) bump(tsCount, r.school_id)
  }

  const schools = (schoolsRes.data ?? []).map(s => ({
    id: s.id as number,
    display_name: s.display_name as string,
    bout_count: boutCount.get(s.id) ?? 0,
    placement_count: plCount.get(s.id) ?? 0,
    alias_count: aliasCount.get(s.id) ?? 0,
    team_score_count: tsCount.get(s.id) ?? 0,
  })).filter(s => {
    const mine = s.bout_count + s.placement_count + s.team_score_count
    const anywhere = (boysBouts.get(s.id) ?? 0) + (girlsBouts.get(s.id) ?? 0) + (anyPl.has(s.id) ? 1 : 0) + (anyTs.has(s.id) ? 1 : 0)
    return mine > 0 || anywhere === 0
  })

  // Detect duplicates: group by normalized name
  const normMap = new Map<string, typeof schools>()
  for (const s of schools) {
    const key = normalizeName(s.display_name)
    if (!normMap.has(key)) normMap.set(key, [])
    normMap.get(key)!.push(s)
  }
  const duplicates = [...normMap.values()].filter(g => g.length > 1)

  return NextResponse.json({ schools, duplicates })
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, keep_id, merge_id } = await req.json()

  if (action === 'merge') {
    if (!keep_id || !merge_id || keep_id === merge_id) {
      return NextResponse.json({ error: 'Invalid keep_id / merge_id' }, { status: 400 })
    }
    const db = createSupabaseAdmin()

    // Update all references from merge_id → keep_id.
    // wrestler_name_aliases has unique(raw_name, school_id): delete conflicting rows first.
    const conflictAliases = await db
      .from('wrestler_name_aliases')
      .select('raw_name')
      .eq('school_id', keep_id)
    const keepNames = new Set((conflictAliases.data ?? []).map((r: { raw_name: string }) => r.raw_name))
    if (keepNames.size > 0) {
      await db.from('wrestler_name_aliases')
        .delete()
        .eq('school_id', merge_id)
        .in('raw_name', [...keepNames])
    }

    await Promise.all([
      db.from('tournament_bouts').update({ wrestler1_school_id: keep_id }).eq('wrestler1_school_id', merge_id),
      db.from('tournament_bouts').update({ wrestler2_school_id: keep_id }).eq('wrestler2_school_id', merge_id),
      db.from('tournament_bouts_girls').update({ wrestler1_school_id: keep_id }).eq('wrestler1_school_id', merge_id),
      db.from('tournament_bouts_girls').update({ wrestler2_school_id: keep_id }).eq('wrestler2_school_id', merge_id),
      db.from('tournament_placements').update({ school_id: keep_id }).eq('school_id', merge_id),
      db.from('wrestler_name_aliases').update({ school_id: keep_id }).eq('school_id', merge_id),
      db.from('in_season_tournament_team_scores').update({ school_id: keep_id }).eq('school_id', merge_id),
      db.from('in_season_tournament_participants').update({ school_id: keep_id }).eq('school_id', merge_id),
      // school_aliases uses notes field to store OOS school_id as a string
      db.from('school_aliases').update({ notes: String(keep_id) }).eq('notes', String(merge_id)).eq('alias_type', 'oos'),
    ])

    const { error } = await db.from('schools').delete().eq('id', merge_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
