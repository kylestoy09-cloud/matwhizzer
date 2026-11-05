import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ids = [32, 123, 24, 391, 18, 4, 56, 76, 370, 163, 158, 162, 259, 247, 188]
const gs = (await db.from('girls_schools').select('school_id, display_name').in('school_id', ids)).data!
console.log('in girls_schools:', gs.length, JSON.stringify(gs))
const r = await db.from('girls_schools').select('school_id, display_name').in('school_id', ids)
console.log(r.error)
console.log('total girls_schools', (await db.from('girls_schools').select('*', { count: 'exact', head: true })).count)
