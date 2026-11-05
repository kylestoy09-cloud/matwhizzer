import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
for (const [fn, p] of [['lb_p_mat_time', { p_gender: 'M', p_pool: 'state', p_season: 2026 }], ['lb_p_fastest_pin', { p_gender: 'M', p_pool: 'state', p_season: 2026 }], ['lb_p_fastest_tf', { p_gender: 'M', p_pool: 'state', p_season: 2026 }], ['lb_p_team_points', { p_gender: 'M', p_pool: 'state', p_season: 2026 }], ['lb_p_wrestler_points', { p_gender: 'M', p_pool: 'state', p_season: 2026 }], ['lb_gp_mat_time', { p_pool: 'state', p_season: 2026 }], ['lb_gp_wrestler_points', { p_pool: 'state', p_season: 2026 }], ['lb_gp_fastest_pin', { p_pool: 'state', p_season: 2026 }]] as const) {
  const { data, error } = await db.rpc(fn, p as any)
  console.log(fn, error?.message ?? `${data?.length} rows; ${JSON.stringify(data?.[0])}`)
}
