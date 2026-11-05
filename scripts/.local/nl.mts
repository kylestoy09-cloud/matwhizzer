import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log(JSON.stringify((await db.from('wrestlers').select('id, first_name, last_name, gender').or('and(first_name.ilike.niah%,last_name.ilike.lopez),and(first_name.ilike.kim,last_name.ilike.lopez),and(first_name.ilike.kassandra%,last_name.ilike.lucero)')).data))
