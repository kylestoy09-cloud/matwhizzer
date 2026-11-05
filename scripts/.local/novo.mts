import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ev = async (id: string) => { const d = (await db.from('dual_meet_matches_girls').select('dual_meet_id, weight_class').or(`wrestler_a_id.eq.${id},wrestler_b_id.eq.${id}`)).data ?? []; const t = (await db.from('tournament_bouts_girls').select('in_season_tournament_id, weight_class').or(`wrestler1_id.eq.${id},wrestler2_id.eq.${id}`)).data ?? []; return { n: `${d.length} duals, ${t.length} tourn, wts ${[...new Set([...d, ...t].map((x: any) => x.weight_class))]}`, s: new Set([...d.map((x: any) => 'D' + x.dual_meet_id), ...t.map((x: any) => 'T' + x.in_season_tournament_id)]) } }
const id = (await db.from('wrestlers').select('id, first_name, last_name, grade, created_at').eq('gender', 'F').ilike('last_name', 'novo')).data!
console.log(JSON.stringify(id))
const A = await ev('5e965f4c-31fd-40dd-8ae3-21208a4ff289'), B = await ev(id[0].id)
console.log('Nova', A.n, '| Novo', B.n, '| shared', [...A.s].filter(x => B.s.has(x)).length)
