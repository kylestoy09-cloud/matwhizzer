import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const { data: pp } = await db
  .from('power_points')
  .select('power_points, overall_wins, overall_losses, schools!inner(id, display_name, section, classification, is_combined)')
  .eq('season_id', 2)
  .eq('gender', 'M')
  .eq('school_id', 3)

console.log('Emerson Boro PP entry:', pp)
