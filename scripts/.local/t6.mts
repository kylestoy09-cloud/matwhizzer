import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data } = await db.from('matches').select('id, tournament_id, fall_time_seconds, winner_score, loser_score, round, w:winner_entry_id(wrestler_id, wrestler:wrestlers(first_name,last_name))').in('win_type', ['TF','TF-1.5']).lte('fall_time_seconds', 15)
console.log(JSON.stringify(data))
for (const n of [16, 20, 30]) { const r = await db.from('matches').select('id', { count: 'exact', head: true }).in('win_type', ['TF','TF-1.5']).lte('fall_time_seconds', n); console.log('<=', n, r.count) }
