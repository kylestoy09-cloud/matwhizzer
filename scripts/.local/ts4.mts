import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log('Fort Lee D8:', JSON.stringify((await db.from('precomputed_team_scores').select('total_points').eq('tournament_id', 147).eq('school_id', 42)).data))
const r = await db.rpc('top_postseason_team_scores', { p_gender: 'M', p_season: 2026, p_type: 'districts', p_limit: 5 } as any); console.log('top_postseason_team_scores:', r.error?.message ?? JSON.stringify(r.data).slice(0, 300))
