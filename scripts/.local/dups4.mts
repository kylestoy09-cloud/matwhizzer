import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const pairs = [['Quishpe', '7c681a47-b07d-407a-9ff5-3ae9c0fcde9d', '5caafa3a-22b7-4c80-b9d6-425af3310f95'], ['Vazquez', '057e83ee-9aa3-486d-ad0a-d02db52d7816', 'a5f7de8d'], ['Carire Cruz', '84a51f26-499a-47b9-8cad-3e90552b6179', 'b80eb800-6a41-4bc9-9da5-2dc5d2d6c87c']]
// full id for the Vazquez and Cruz duplicates
const full = async (prefix: string, last: string) => (await db.from('wrestlers').select('id').eq('gender', 'F').ilike('last_name', last)).data!.map((r: any) => r.id).find((i: string) => i.startsWith(prefix))!
pairs[1][2] = await full('a5f7de8d', 'Vazquez'); pairs[2][2] = await full('b80eb800', 'Cruz')
for (const [who, a, b] of pairs) {
  const meets = async (id: string) => {
    const d = (await db.from('dual_meet_matches_girls').select('dual_meet_id').or(`wrestler_a_id.eq.${id},wrestler_b_id.eq.${id}`)).data!.map((r: any) => 'D' + r.dual_meet_id)
    const t = (await db.from('tournament_bouts_girls').select('in_season_tournament_id, weight_class').or(`wrestler1_id.eq.${id},wrestler2_id.eq.${id}`)).data!.map((r: any) => 'T' + r.in_season_tournament_id + '@' + r.weight_class)
    const e = (await db.from('tournament_entries').select('tournament_id').eq('wrestler_id', id)).data!.map((r: any) => 'E' + r.tournament_id)
    return new Set([...d, ...t, ...e])
  }
  const A = await meets(a), B = await meets(b)
  const both = [...A].filter(x => B.has(x))
  const vsEach = (await db.from('dual_meet_matches_girls').select('id', { count: 'exact', head: true }).or(`and(wrestler_a_id.eq.${a},wrestler_b_id.eq.${b}),and(wrestler_a_id.eq.${b},wrestler_b_id.eq.${a})`)).count
  console.log(who, 'keep', a.slice(0, 8), A.size, 'events | dup', b.slice(0, 8), B.size, 'events | shared events:', both.length, JSON.stringify(both), '| faced each other:', vsEach, '| dup id', b)
}
