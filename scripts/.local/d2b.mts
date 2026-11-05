import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const cols = Object.keys((await db.from('girls_school_districts').select('*').limit(1)).data![0])
console.log(cols.join(','))
console.log(JSON.stringify((await db.from('girls_school_districts').select('*').eq('season_id', 2026).in('school_id', [72, 122])).data))
