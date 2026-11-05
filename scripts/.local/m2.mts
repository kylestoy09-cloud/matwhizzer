import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data } = await db.from('dual_meet_matches').select('weight_class, wrestler_a_id, wrestler_b_id, wrestler_a_name_raw, wrestler_b_name_raw, result_type, winner_id').eq('dual_meet_id', 'fbdd3110-e8ae-40e6-a05d-7197ee3f6eb0').eq('weight_class', 138)
console.log(data)
