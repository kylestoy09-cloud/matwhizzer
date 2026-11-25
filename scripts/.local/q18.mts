import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: w } = await db.from('wrestlers').select('*').eq('first_name','Sydney').eq('last_name','Johnson'); console.log(w)
for (const x of w ?? []) {
  console.log('aliases', (await db.from('wrestler_name_aliases').select('*').eq('wrestler_id', x.id)).data)
  console.log('tb', (await db.from('tournament_bouts_girls').select('id,in_season_tournament_id,weight_class,wrestler1_id,wrestler2_id,wrestler1_school_id,wrestler2_school_id,wrestler1_name_raw,wrestler2_name_raw').or(`wrestler1_id.eq.${x.id},wrestler2_id.eq.${x.id}`)).data)
  console.log('dual', (await db.from('dual_meet_matches_girls').select('id').or(`wrestler_a_id.eq.${x.id},wrestler_b_id.eq.${x.id}`)).data)
  console.log('entries', (await db.from('tournament_entries').select('id').eq('wrestler_id', x.id)).data)
}
