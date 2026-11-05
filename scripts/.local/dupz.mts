import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ev = async (id: string) => {
  const d = (await db.from('dual_meet_matches_girls').select('dual_meet_id').or(`wrestler_a_id.eq.${id},wrestler_b_id.eq.${id}`)).data ?? []
  const t = (await db.from('tournament_bouts_girls').select('in_season_tournament_id').or(`wrestler1_id.eq.${id},wrestler2_id.eq.${id}`)).data ?? []
  const e = (await db.from('tournament_entries').select('tournament_id').eq('wrestler_id', id)).data ?? []
  return { n: `${d.length} duals, ${t.length} tourn, ${e.length} entries`, s: new Set([...d.map((x: any) => 'D' + x.dual_meet_id), ...t.map((x: any) => 'T' + x.in_season_tournament_id), ...e.map((x: any) => 'E' + x.tournament_id)]) }
}
const w = (await db.from('wrestlers').select('*').eq('id', 'd3e218bb-e7a3-4385-8cdd-39fa52fa15ad')).data
console.log(JSON.stringify(w?.map((x: any) => ({ n: `${x.first_name}|${x.last_name}`, g: x.gender, grade: x.grade, wt: x.main_weight, c: x.created_at }))))
const a = await ev('6da4fa41-1ad3-4668-8c80-ef7fbe207ad3'), b = await ev('d3e218bb-e7a3-4385-8cdd-39fa52fa15ad')
console.log('Farber', a.n, '| Fraber', b.n, '| shared', [...a.s].filter(x => b.s.has(x)))
for (const [x, y, n] of [['59b0f8c5-1ad9-4390-ab3e-e720b3130a63', '104693f0-ac0e-4396-88b3-cb80525358ad', 'Ihori/Khori'], ['63f2f295-c752-4317-8f52-4456328bd1db', 'f8ed474f-46d5-4eb4-b7a3-a31919cbaaf7', 'Izzabella/Izzy'], ['af9d4501-4668-4626-9cc4-427ce1d86a84', 'f882b7f5-67fd-4136-a9df-323dd20b9d60', 'Janizza/Janeeza']]) {
  const A = await ev(x), B = await ev(y); console.log(n, 'shared', [...A.s].filter(z => B.s.has(z)).length)
}
