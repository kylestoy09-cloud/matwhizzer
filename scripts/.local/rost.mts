import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
// largest per-school tournament bout counts (all seasons), against the code's limit of 5000
for (const g of ['M', 'F']) {
  const t = g === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts'
  let best = { id: 0, n: 0 }
  for (const id of [18, 4, 76, 61, 5, 128, 135, 24, 32]) {
    const n = (await db.from(t).select('id', { count: 'exact', head: true }).or(`wrestler1_school_id.eq.${id},wrestler2_school_id.eq.${id}`)).count ?? 0
    if (n > best.n) best = { id, n }
  }
  console.log(g, 'largest school tournament-bout count among samples:', JSON.stringify(best))
}
// does the girls dual table have rows where a school's wrestler sits on the "other" side column?
const sideMix = (await db.from('dual_meet_matches_girls').select('id', { count: 'exact', head: true }).not('school_a_id', 'is', null).filter('school_a_id', 'eq', 'school_b_id')).count
console.log('girls bouts with the same school on both sides:', sideMix)
