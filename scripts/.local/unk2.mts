import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const d = (await db.from('dual_meet_matches_girls').select('school_a_id, school_b_id, wrestler_a_id').or('wrestler_a_id.eq.a2786492-0000-0000-0000-000000000000,wrestler_b_id.eq.x').limit(1))
const u = (await db.from('wrestlers').select('id').eq('first_name', 'Unknown').eq('gender', 'F')).data![0].id
const b = (await db.from('dual_meet_matches_girls').select('school_a_id, school_b_id, wrestler_a_id').or(`wrestler_a_id.eq.${u},wrestler_b_id.eq.${u}`).limit(1)).data![0]
console.log(b.wrestler_a_id === u ? b.school_a_id : b.school_b_id)
