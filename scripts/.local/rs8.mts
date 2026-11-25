import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const [t, s] of [[147, 42], [157, 178], [171, 264], [171, 281]]) console.log(t, s, JSON.stringify((await db.from('precomputed_team_scores').select('school_name, total_points').eq('tournament_id', t).eq('school_id', s)).data))
const r = await db.rpc('district_team_score', { p_district: 8, p_gender: 'M', p_season: 2026 }); console.log('live D8 Fort Lee:', JSON.stringify((r.data ?? []).filter((x: any) => /fort lee/i.test(x.school_name))), r.error?.message ?? '')
const r2 = await db.rpc('district_team_score', { p_district: 32, p_gender: 'M', p_season: 2026 }); console.log('live D32 top:', JSON.stringify((r2.data ?? []).sort((a: any, b: any) => b.total_points - a.total_points).slice(0, 2)), r2.error?.message ?? '')
