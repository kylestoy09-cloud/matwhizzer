import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const t = (await db.from('tournaments').select('id').eq('gender', 'M').eq('season_id', 2025).eq('name', 'Boy_s Districts District 23')).data![0].id
console.log('2024-25 D23 stored rows still there:', (await db.from('precomputed_team_scores').select('id', { count: 'exact', head: true }).eq('tournament_id', t)).count)
