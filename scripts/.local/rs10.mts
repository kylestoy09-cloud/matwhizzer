import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log('dirty queue:', JSON.stringify((await db.from('team_score_cache_dirty').select('*')).data))
const r = await db.rpc('refresh_boys_team_score_cache', { p_season: 2026 }); console.log('refresh:', r.error?.message ?? 'ok', JSON.stringify(r.data)?.slice(0, 100))
for (const [t, s] of [[147, 42], [171, 264], [171, 281]]) console.log(t, s, JSON.stringify((await db.from('precomputed_team_scores').select('total_points').eq('tournament_id', t).eq('school_id', s)).data))
