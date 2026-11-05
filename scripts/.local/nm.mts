import { createClient } from '@supabase/supabase-js'
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const co = new Set([24, 76, 4, 287, 267, 18, 314, 56, 78])
const look = (label: string, rows: any[], idk = 'school_id', nk = 'school_name') => { const hit = (rows ?? []).filter(r => co.has(r[idk])); console.log(label.padEnd(36), [...new Set(hit.map(r => `${r[idk]}:${r[nk] ?? r.school}`))].slice(0, 6).join(', ') || '(no co-op rows)') }
look('top_postseason_team_scores', (await a.rpc('top_postseason_team_scores', { p_gender: 'F', p_season: 2026, p_limit: 60 })).data as any[])
look('district_mat_time D1', (await a.rpc('district_mat_time', { p_district: 1, p_gender: 'F', p_season: 2026 })).data as any[])
look('girls_region_mat_time r1', (await a.rpc('girls_region_mat_time', { p_region: '1', p_season: 2026 })).data as any[])
look('state_mat_time F', (await a.rpc('state_mat_time', { p_gender: 'F', p_season: 2026 })).data as any[])
for (const fn of ['lb_gp_mat_time', 'lb_gp_wrestler_points', 'lb_gp_fastest_pin']) look(fn, (await a.rpc(fn, { p_pool: 'state', p_season: 2026 })).data as any[])
look('school_directory F', (await a.rpc('school_directory', { p_gender: 'F', p_season: 2026 })).data as any[])
const { data: lb } = await db.from('lb_rs_team').select('*').eq('gender', 'F').eq('season_id', 2026).in('school_id', [...co]).limit(5); console.log('lb_rs_team columns', lb?.[0] ? Object.keys(lb[0]).join(',') : 'none', JSON.stringify(lb?.slice(0, 3)))
