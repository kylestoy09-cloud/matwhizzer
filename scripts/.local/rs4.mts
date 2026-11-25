import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log(JSON.stringify((await db.from('matches').select('score_raw, winner_score, loser_score, fall_time_seconds').eq('win_type', 'TF-1.5').gte('tournament_id', 140).lte('tournament_id', 171).limit(5)).data))
