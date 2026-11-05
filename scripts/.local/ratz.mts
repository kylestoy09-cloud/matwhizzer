import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const id = 'b5140db1-94b9-4257-8396-d040f8f242c7'
console.log('aliases', JSON.stringify((await db.from('wrestler_name_aliases').select('raw_name, school_id').eq('wrestler_id', id)).data))
const a = (await db.from('dual_meet_matches').select('wrestler_a_name_raw, wrestler_b_name_raw, wrestler_a_id').or(`wrestler_a_id.eq.${id},wrestler_b_id.eq.${id}`).limit(20)).data ?? []
console.log('dual raw', [...new Set(a.map((r: any) => r.wrestler_a_id === id ? r.wrestler_a_name_raw : r.wrestler_b_name_raw))])
const e = (await db.from('tournament_entries').select('wrestler_name_raw').eq('wrestler_id', id)).data
console.log('entries raw', JSON.stringify(e))
