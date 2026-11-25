import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ts = (await db.from('tournaments').select('id, name, season_id').eq('gender', 'M').in('season_id', [2025, 2026]).in('tournament_type', ['districts', 'regions', 'boys_state'])).data!
const empty: string[] = []
for (const t of ts) { const n = (await db.from('precomputed_team_scores').select('id', { count: 'exact', head: true }).eq('tournament_id', t.id)).count; if (!n) empty.push(`${t.season_id} ${t.name}`) }
console.log(`boys postseason tournaments 2024-25 + 2025-26: ${ts.length}; with no stored totals: ${empty.length}`, JSON.stringify(empty))
const ck = async (label: string, q: any) => { const r = await q; console.log(label, r.error?.message ?? JSON.stringify(r.data ?? r.count)) }
await ck('Ryan Kim (Fort Lee) D8 bouts:', db.from('matches').select('id', { count: 'exact', head: true }).or('winner_entry_id.eq.d3e8a854-4f2c-47f9-9371-8dd9efa5e053,loser_entry_id.eq.d3e8a854-4f2c-47f9-9371-8dd9efa5e053'))
await ck('Russo D32 entry bouts:', db.from('matches').select('id', { count: 'exact', head: true }).or('winner_entry_id.eq.575bd87d-735b-43a4-a6df-5c985642eff1,loser_entry_id.eq.575bd87d-735b-43a4-a6df-5c985642eff1'))
await ck('profiles with no last name (not Unknown):', db.from('wrestlers').select('id', { count: 'exact', head: true }).eq('last_name', '').neq('first_name', 'Unknown'))
await ck('emptied Charles/Terrance profiles still present:', db.from('wrestlers').select('id').in('id', ['e3c97685-b288-4142-bdaa-e772745576f4', 'b81a6c9d-af4a-44eb-9168-cd4248050ca0']))
const r = await db.from('wrestlers').insert({ first_name: 'Test', last_name: '', gender: 'M' }).select('id'); console.log('name rule blocks a blank last name:', r.error ? `yes (${r.error.message.slice(0, 60)})` : `NO — inserted ${JSON.stringify(r.data)}`)
if (!r.error && r.data?.[0]) await db.from('wrestlers').delete().eq('id', r.data[0].id)
