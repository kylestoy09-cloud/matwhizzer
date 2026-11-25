import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const e = (await db.from('tournament_entries').select('id').eq('tournament_id', 171).eq('weight_class_id', 60).eq('seed', 1)).data
console.log('D32 150 seed-1 entry now:', JSON.stringify(e))
console.log('D8 165 bouts:', (await db.from('matches').select('id', { count: 'exact', head: true }).eq('tournament_id', 147).eq('weight_class_id', 62)).count)
