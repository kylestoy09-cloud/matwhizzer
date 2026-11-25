import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log('precomputed_team_scores cols:', Object.keys((await db.from('precomputed_team_scores').select('*').limit(1)).data![0]).join(','))
console.log(JSON.stringify((await db.from('precomputed_team_scores').select('*').eq('tournament_id', 147).eq('school_id', 42)).data))
