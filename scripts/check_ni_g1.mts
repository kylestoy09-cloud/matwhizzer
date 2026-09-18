import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const { data } = await db
  .from('power_points')
  .select('power_points, overall_wins, overall_losses, schools!inner(display_name, section, classification)')
  .eq('season_id', 2)
  .eq('gender', 'M')
  .eq('schools.section', 'North I')
  .eq('schools.classification', '1')
  .order('power_points', { ascending: false })
  .limit(10)

for (const [i, r] of (data ?? []).entries()) {
  const s = r.schools as any
  console.log(`${i+1}. ${s.display_name}  ${r.overall_wins}-${r.overall_losses}  ${Number(r.power_points).toFixed(2)}`)
}
