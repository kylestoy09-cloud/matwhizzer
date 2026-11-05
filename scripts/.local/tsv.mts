import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const show = async (name: string) => { const { data: t } = await db.from('tournaments').select('id').eq('name', name).eq('season_id', 2026).single(); const { data } = await db.from('precomputed_team_scores').select('school_name, total_points').eq('tournament_id', t!.id).order('total_points', { ascending: false }).limit(5); console.log(name.replace("Girl_s ", ''), data!.map(r => `${r.school_name} ${r.total_points}`).join(' | ')) }
for (const n of ['Girl_s Districts District 1', 'Girl_s Districts District 9', 'Girl_s Regions r3', 'Girl_s States']) await show(n)
const { data } = await anon.rpc('top_postseason_team_scores', { p_gender: 'F', p_season: 2026, p_limit: 5 }); console.log('girls home leaderboard:', (data as any[]).map(r => `${r.school_name} ${r.total_points}`).join(' | '))
const { data: n } = await anon.rpc('district_placements', { p_district: 1, p_gender: 'F', p_season: 2026 }); console.log('D1 names sample:', [...new Set((n as any[]).map(x => x.school_name))].filter(x => /Ramsey|Jefferson|Demarest|Newton/.test(x)).join(', '))
