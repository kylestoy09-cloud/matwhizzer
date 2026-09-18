import { createClient } from '@supabase/supabase-js'
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Emerson Boro: #1 in North I Group 1, 17-11, 39.44 PP per official RTF
const row = {
  school_id: 3,
  season_id: 2,
  gender: 'M',
  power_points: 39.44,
  overall_wins: 17,
  overall_losses: 11,
  meets_counted: 28,
}

const { data, error } = await client
  .from('power_points')
  .upsert(row, { onConflict: 'school_id,season_id,gender' })
  .select()

console.log('Result:', data)
console.log('Error:', error)
