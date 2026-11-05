import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const sch = new Map((await db.from('schools').select('id, display_name')).data!.map(s => [s.id, s.display_name]))
const gs = new Map((await db.from('girls_schools').select('school_id, display_name, is_combined')).data!.map(s => [s.school_id, s]))
// girls co-ops: [co-op record, secondary member]
const girls: [number, number][] = [[4, 26], [18, 35], [287, 294], [267, 268], [314, 6], [24, 315], [76, 77], [56, 87], [78, 64]]
const tours = (await db.from('tournaments').select('id, season_id, gender')).data!
const seasonT = (s: number, g: string) => tours.filter(t => t.season_id === s && t.gender === g).map(t => t.id)
const { data: ist } = await db.from('in_season_tournaments_girls').select('id, season')
const istBy = (lbl: string) => ist!.filter(x => x.season === lbl).map(x => x.id)
async function counts(sid: number, season: number) {
  const lbl = season === 2026 ? '2025-26' : '2024-25'
  const c = async (q: any) => (await q).count ?? 0
  return {
    entries: await c(db.from('tournament_entries').select('id', { count: 'exact', head: true }).eq('school_id', sid).in('tournament_id', seasonT(season, 'F'))),
    duals: await c(db.from('dual_meets_girls').select('id', { count: 'exact', head: true }).or(`team1_school_id.eq.${sid},team2_school_id.eq.${sid}`).eq('season_id', season)),
    tbouts: await c(db.from('tournament_bouts_girls').select('id', { count: 'exact', head: true }).or(`wrestler1_school_id.eq.${sid},wrestler2_school_id.eq.${sid}`).in('in_season_tournament_id', istBy(lbl))),
    pp: await c(db.from('power_points').select('school_id', { count: 'exact', head: true }).eq('school_id', sid).eq('gender', 'F').eq('season_id', season)),
    teamScores: await c(db.from('precomputed_team_scores').select('id', { count: 'exact', head: true }).eq('school_id', sid).in('tournament_id', seasonT(season, 'F'))),
    district: await c(db.from('girls_school_districts').select('school_id', { count: 'exact', head: true }).eq('school_id', sid).eq('season_id', season)),
  }
}
const fmt = (o: any) => Object.entries(o).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ') || '—'
const { data: ina } = await db.from('inactive_school_seasons').select('school_id, season_id, gender').eq('gender', 'F')
for (const season of [2025, 2026]) {
  console.log(`\n=== girls ${season === 2026 ? '2025-26' : '2024-25'} ===`)
  for (const [coop, mem] of girls) {
    const inactive = ina!.some(r => r.school_id === mem && r.season_id === season)
    console.log(`${(gs.get(coop)?.display_name ?? sch.get(coop) ?? '').padEnd(28)} [${coop}] ${fmt(await counts(coop, season)).padEnd(70)} | member ${sch.get(mem)} [${mem}]${inactive ? ' (inactive)' : ''}: ${fmt(await counts(mem, season))}`)
  }
}
