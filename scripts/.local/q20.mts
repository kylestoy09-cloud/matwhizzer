import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const [t, mt, d] of [['dual_meet_matches_girls','dual_meets_girls','2026-01-19'],['dual_meet_matches','dual_meets','2026-02-11']]) {
  const { data: ms } = await db.from(mt).select('id,team1_school_id,team2_school_id,team1_score,team2_score,team1_school_name_raw,team2_school_name_raw').eq('meet_date', d)
  const m = ms!.find(x => [x.team1_school_name_raw, x.team2_school_name_raw].join().match(/Schalick.*Delran|Delran.*Schalick|Council Rock/i))!
  console.log(m)
  const { data } = await db.from(t).select('weight_class,wrestler_a_name_raw,wrestler_b_name_raw,result_type,result_detail,team1_points,team2_points,is_forfeit_win,is_double_forfeit').eq('dual_meet_id', m.id).order('weight_class')
  console.table(data)
}
