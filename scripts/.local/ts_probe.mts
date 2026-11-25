import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const [fn, args] of [['district_team_score', { p_district: 23, p_gender: 'M', p_season: 2013 }], ['region_team_pts', { p_region: 6, p_gender: 'M', p_season: 2013 }], ['state_team_score', { p_gender: 'M', p_season: 2013 }], ['girls_region_team_score', { p_region: '5', p_season: 2021 }], ['state_team_score', { p_gender: 'F', p_season: 2021 }]] as const) {
  const { data, error } = await db.rpc(fn, args as never)
  console.log(fn, JSON.stringify(args), error ? error.message : `${(data as any[]).length} rows, top: ${(data as any[]).sort((a, b) => b.total_points - a.total_points).slice(0, 3).map(r => `${r.school_name ?? r.school} ${r.total_points}`).join('; ')}`)
}
