import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const o = (await db.from('schools').select('id, display_name, town, is_nj').eq('is_nj', false).order('id', { ascending: false }).limit(25)).data
console.log(JSON.stringify(o?.map((s: any) => `${s.id} ${s.display_name} [${s.town ?? ''}]`)))
console.log(JSON.stringify((await db.from('schools').select('id, display_name').eq('is_nj', false).or('display_name.ilike.%(VA)%,display_name.ilike.%, VA%,display_name.ilike.%Virginia%,display_name.ilike.%West Springfield%')).data))
const ev = async (id: string) => new Set([
  ...((await db.from('dual_meet_matches_girls').select('dual_meet_id').or(`wrestler_a_id.eq.${id},wrestler_b_id.eq.${id}`)).data ?? []).map((x: any) => 'D' + x.dual_meet_id),
  ...((await db.from('tournament_bouts_girls').select('in_season_tournament_id, weight_class').or(`wrestler1_id.eq.${id},wrestler2_id.eq.${id}`)).data ?? []).map((x: any) => 'T' + x.in_season_tournament_id),
])
const A = await ev('a970435d-63f3-4ea5-99cc-8a6b73a7eff7'), B = await ev('8a3357b3-d753-4903-8899-abf44acec8ac')
console.log('Cristy/Liz shared events:', [...A].filter(x => B.has(x)))
const t = (await db.from('tournament_bouts_girls').select('in_season_tournament_id, weight_class, round, wrestler1_name_raw, wrestler2_name_raw').or('wrestler1_id.eq.8a3357b3-d753-4903-8899-abf44acec8ac,wrestler2_id.eq.8a3357b3-d753-4903-8899-abf44acec8ac')).data!
const tn = new Map(((await db.from('in_season_tournaments_girls').select('id, name, start_date').in('id', t.map((x: any) => x.in_season_tournament_id))).data ?? []).map((x: any) => [x.id, `${x.name} ${x.start_date}`]))
for (const b of t) console.log('Liz bout:', tn.get(b.in_season_tournament_id), b.weight_class, b.round, b.wrestler1_name_raw, 'vs', b.wrestler2_name_raw)
const ow = (await db.from('wrestlers').select('id, is_oos').eq('id', 'd1421eca-fdc4-45c5-bccd-8d33e4d87c29')).data
console.log('Lily is_oos', JSON.stringify(ow), 'rated:', (await db.from('wrestler_hammer_scores').select('*', { count: 'exact', head: true }).eq('wrestler_id', 'd1421eca-fdc4-45c5-bccd-8d33e4d87c29')).count)
