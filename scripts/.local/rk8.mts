import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const id of ['b2731464-9d88-4ddc-a645-d67a4a26e286']) console.log(JSON.stringify((await db.from('tournament_entries').select('id, tournament_id').eq('wrestler_id', id)).data))
const ce = (await db.from('wrestlers').select('*').ilike('id::text' as any, 'ce3511b1%')).data
console.log(JSON.stringify((await db.from('wrestlers').select('*').eq('first_name','Ryan').eq('last_name','Kim')).data))
