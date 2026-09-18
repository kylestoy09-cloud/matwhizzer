import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Try a direct UPDATE first
const { data: upd, error: updErr } = await db
  .from('power_points')
  .update({ power_points: 41.44, overall_wins: 20, overall_losses: 7, meets_counted: 27 })
  .eq('school_id', 60)
  .eq('season_id', 2)
  .eq('gender', 'M')
  .select()

console.log('UPDATE result:', upd)
console.log('UPDATE error:', updErr)
