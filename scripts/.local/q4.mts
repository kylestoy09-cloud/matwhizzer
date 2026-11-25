import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: one } = await db.from('dual_meet_matches_girls').select('*').limit(1)
console.log(Object.keys(one?.[0]??{}).join(','))
const { data: tb } = await db.from('tournament_bouts_girls').select('*').limit(1)
console.log(Object.keys(tb?.[0]??{}).join(','))
