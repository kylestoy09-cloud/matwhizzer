import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const n of ['Reynaliz','Maruam','Jill Falzon','Mya Ochoa','Elena Pinedo']) {
  const { data } = await db.from('dual_meet_matches_girls').select('wrestler_a_name_raw, wrestler_b_name_raw, dual_meets_girls(meet_date, meet_kind)').or(`wrestler_a_name_raw.ilike.%${n}%,wrestler_b_name_raw.ilike.%${n}%`)
  console.log(n, JSON.stringify(data))
  const { data: t } = await db.from('tournament_bouts_girls').select('wrestler1_name_raw, wrestler2_name_raw, in_season_tournament_id').or(`wrestler1_name_raw.ilike.%${n}%,wrestler2_name_raw.ilike.%${n}%`).limit(3)
  console.log('  tb', JSON.stringify(t))
}
