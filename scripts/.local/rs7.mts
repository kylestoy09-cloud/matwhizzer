import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log('RBC entries in D32:', (await db.from('tournament_entries').select('id', { count: 'exact', head: true }).eq('tournament_id', 171).eq('school_id', 264)).count)
console.log('D32 top totals:', JSON.stringify((await db.from('precomputed_team_scores').select('school_name, total_points').eq('tournament_id', 171).order('total_points', { ascending: false }).limit(4)).data))
