import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const { data } = await db
  .from('power_points')
  .select('power_points, overall_wins, overall_losses, schools!inner(display_name)')
  .ilike('schools.display_name', '%cedar grove%')
  .eq('season_id', 2)
  .eq('gender', 'M')

console.log(data)
