import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
for (const id of ['031c6969-58e6-40f1-a217-500a2ff42ae5', '3a49d8f0-d7ff-41e7-a8db-5a5ffe30b6ce']) {
  const al = (await db.from('wrestler_name_aliases').select('raw_name, school_id').eq('wrestler_id', id)).data ?? []
  const dg = (await db.from('dual_meet_matches_girls').select('weight_class, dual_meets_girls(meet_date)').or(`wrestler_a_id.eq.${id},wrestler_b_id.eq.${id}`)).data ?? []
  const db_ = (await db.from('dual_meet_matches').select('weight_class, school_a_id, school_b_id, wrestler_a_id, dual_meets(meet_date)').or(`wrestler_a_id.eq.${id},wrestler_b_id.eq.${id}`)).data ?? []
  const tb = (await db.from('tournament_bouts').select('weight_class, wrestler1_id, wrestler1_school_raw, wrestler2_school_raw').or(`wrestler1_id.eq.${id},wrestler2_id.eq.${id}`)).data ?? []
  console.log(id.slice(0, 8), 'aliases', JSON.stringify(al.map((a: any) => `${a.raw_name}@${names.get(a.school_id)}`)), '| girls duals', JSON.stringify(dg.map((d: any) => `${d.dual_meets_girls?.meet_date} ${d.weight_class}`)), '| boys duals', JSON.stringify(db_.map((d: any) => `${d.dual_meets?.meet_date} ${d.weight_class} ${names.get(d.wrestler_a_id === id ? d.school_a_id : d.school_b_id)}`)), '| boys tourn', tb.length, [...new Set(tb.map((b: any) => b.wrestler1_id === id ? b.wrestler1_school_raw : b.wrestler2_school_raw))])
}
