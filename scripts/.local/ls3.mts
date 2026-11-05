import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const d = (await db.from('dual_meet_matches').select('id, created_at, dual_meet_id').eq('wrestler_a_name_raw', 'Lerrod Smalls')).data
const d2 = (await db.from('dual_meet_matches').select('id, created_at').eq('wrestler_b_name_raw', 'Lerrod Smalls')).data
console.log('NYMA bout imported:', JSON.stringify([...(d ?? []), ...(d2 ?? [])].map((x: any) => x.created_at)))
