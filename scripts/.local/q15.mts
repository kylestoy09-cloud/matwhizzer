import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log(Object.keys((await db.from('wrestlers').select('*').limit(1)).data![0]).join(','))
console.log(Object.keys((await db.from('tournaments').select('*').limit(1)).data![0]).join(','))
console.log(Object.keys((await db.from('tournament_entries').select('*').limit(1)).data![0]).join(','))
console.log(Object.keys((await db.from('wrestler_name_aliases').select('*').limit(1)).data![0]).join(','))
