import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const g of ['M', 'F']) for (const s of ['2024-25', '2025-26', '2026-27']) {
  const { count } = await db.from('wrestler_hammer_scores').select('*', { count: 'exact', head: true }).eq('gender', g).eq('season', s)
  console.log(g, s, count)
}
const { data } = await db.from('season_gender_state').select('season_id, gender, stage, is_public_default').order('season_id')
console.log(data)
