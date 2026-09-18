import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Dual meets
const { data: meets } = await db
  .from('dual_meets')
  .select('id, season_id, gender')
  .or('team1_school_id.eq.55,team2_school_id.eq.55')

// Wrestlers
const { data: wrestlers } = await db
  .from('wrestlers')
  .select('id, first_name, last_name')
  .eq('school_id', 55)

// Power points
const { data: pp } = await db
  .from('power_points')
  .select('season_id, gender, power_points')
  .eq('school_id', 55)

// Aliases
const { data: aliases } = await db
  .from('school_aliases')
  .select('alias, alias_type')
  .eq('school_id', 55)

console.log(`Dual meets: ${meets?.length ?? 0}`)
console.log(`Wrestlers: ${wrestlers?.length ?? 0}`)
console.log(`Power points entries: ${pp?.length ?? 0}`)
console.log(`Aliases:`, aliases)
