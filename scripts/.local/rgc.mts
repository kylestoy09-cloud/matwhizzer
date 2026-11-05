import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const r = await db.from('roster_grade_school_complete').select('school_id, gender, season_id')
console.log(r.error, r.data?.length, ['M', 'F'].map(g => `${g}: ${r.data?.filter(x => x.gender === g).length}`))
