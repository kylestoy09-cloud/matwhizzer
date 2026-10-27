import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const t of ['wrestler_match_score_log', 'wrestler_hammer_scores']) for (const s of ['2025-26', '2026-27']) for (const g of ['M', 'F']) {
  const { count } = await db.from(t).select('*', { count: 'exact', head: true }).eq('season', s).eq('gender', g); console.log(t, s, g, count)
}
const { data } = await db.from('wrestler_match_score_log').select('match_source,match_date,created_at').eq('season', '2026-27').limit(3); console.log(data)
const { data: sgs } = await db.from('season_gender_state').select('*'); console.log(sgs)
