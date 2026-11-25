// Hide the dual events from the hubs (Kyle 2026-11-12: individual tournaments only). Hidden, not deleted.
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const DUALS = ['NHSCA National Duals', 'AAU Scholastic Duals (Disney Duals)', 'Tyrant Fall & Spring Duals', "Who's Number One (FloWrestling WNO)",
  'NHSCA National Duals (MS Division)', 'National Freestyle Duals (MS Boys Division)', 'Virginia Challenge Holiday Duals (VAC Duals)', 'Easter National Youth Duals / NUWAY Duals']
for (const t of ['boys_hub_tournaments', 'girls_hub_tournaments', 'mixed_hub_tournaments']) {
  const { data, error } = await db.from(t).update({ is_active: false }).in('name', DUALS).select('name')
  if (error) throw error
  const { count } = await db.from(t).select('*', { count: 'exact', head: true }).eq('is_active', true)
  console.log(t, 'hidden:', (data ?? []).map(r => r.name).join('; ') || 'none', '| still shown:', count)
}
