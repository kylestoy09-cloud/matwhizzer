import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const g of ['M', 'F']) for (const fn of ['lb_rs_refresh', 'lb_ps_refresh']) {
  const { data, error } = await db.rpc(fn, { p_gender: g, p_season: 2026 })
  console.log(g, fn, error?.message ?? JSON.stringify(data))
}
