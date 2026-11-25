import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log(JSON.stringify((await db.from('tournaments').select('id, name, tournament_type').eq('gender', 'M').eq('season_id', 2026).neq('tournament_type', 'districts')).data))
console.log('stored types:', JSON.stringify([...new Set(((await db.from('precomputed_team_scores').select('tournament_type').eq('season_id', 2026).limit(5000)).data ?? []).map((r: any) => r.tournament_type))]))
