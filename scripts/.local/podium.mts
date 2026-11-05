import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const fn of ['lb_district_podium_placers', 'lb_district_strength', 'lb_weight_competitiveness']) {
  const r = await db.rpc(fn, { p_gender: 'F', p_season: 2026 })
  console.log(fn, r.error?.message ?? '', JSON.stringify((r.data ?? []).slice(0, 2)))
}
const sp = await db.rpc('state_placements', { p_gender: 'F', p_season: 2026 })
console.log('state_placements F places:', [...new Set((sp.data ?? []).map((x: any) => x.place))].sort())
