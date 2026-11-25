import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log(JSON.stringify((await db.from('precomputed_team_scores').select('tournament_type, total_points, season_id').eq('school_id', 18).eq('season_id', 2026)).data))
