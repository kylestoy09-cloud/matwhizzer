import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const u = (await db.from('schools').select('id, display_name').ilike('display_name', 'union%')).data!
console.log(JSON.stringify(u))
for (const s of u) {
  const al = (await db.from('wrestler_name_aliases').select('wrestler_id, raw_name, wrestlers!inner(gender, first_name, last_name)').eq('school_id', s.id).eq('wrestlers.gender', 'F')).data ?? []
  const hit = al.filter((a: any) => /ari|nov/i.test(a.raw_name))
  console.log(s.display_name, JSON.stringify(hit.map((a: any) => `${a.raw_name} → ${a.wrestlers.first_name}|${a.wrestlers.last_name} ${a.wrestler_id.slice(0, 8)}`)))
}
const ev = async (id: string) => new Set([...((await db.from('dual_meet_matches_girls').select('dual_meet_id').or(`wrestler_a_id.eq.${id},wrestler_b_id.eq.${id}`)).data ?? []).map((x: any) => 'D' + x.dual_meet_id), ...((await db.from('tournament_bouts_girls').select('in_season_tournament_id').or(`wrestler1_id.eq.${id},wrestler2_id.eq.${id}`)).data ?? []).map((x: any) => 'T' + x.in_season_tournament_id)])
for (const [a, b, n] of [['4e65e291-6883-44dd-912a-1cd8e11d8409', '03505b14-bae9-4f96-b280-611775c1c244', 'Herrera'], ['39a811d5-2995-47bc-a36c-8a70970fa59e', '0b9270b0-6a2c-4981-b460-c558361091e7', 'Walpola'], ['c33f3293-7b2b-4b9c-970b-b92cab9c89d0', '2f55dabe-3e32-47ec-8804-4b3b4b3e8f9d', 'Bennet'], ['ee946c2b-3cac-48bb-892f-617b62f3b05f', 'b8ae69a5-d0ae-45f1-9554-7c019c3622b6', 'Rodriguez']]) {
  const A = await ev(a), B = await ev(b); console.log(n, 'shared', [...A].filter(x => B.has(x)).length)
}
