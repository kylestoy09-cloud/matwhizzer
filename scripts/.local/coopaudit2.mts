import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log('girls_schools combined:', JSON.stringify((await db.from('girls_schools').select('school_id, display_name').eq('is_combined', true)).data))
console.log('boys_schools combined:', JSON.stringify((await db.from('boys_schools').select('school_id, display_name').eq('is_combined', true)).data))
console.log('inactive (all):', JSON.stringify((await db.from('inactive_school_seasons').select('school_id, season_id, gender, merged_into_school_id').order('school_id')).data))
console.log('school_coops:', JSON.stringify((await db.from('school_coops').select('*')).data))
