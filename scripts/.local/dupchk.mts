import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const [a, b] of [['0b2ebfc9', '15a94ac5'], ['f5a8199c', '22b60ad6']]) {
  for (const pre of [a, b]) {
    const { data: w } = await db.from('wrestlers').select('id, first_name, last_name').eq('gender', 'F').ilike('first_name', pre === a || pre === b ? '%' : '%').limit(5000)
    const x = w!.find(r => r.id.startsWith(pre))!
    const { data: e } = await db.from('tournament_entries').select('tournaments(name), weight_classes(weight), schools(display_name)').eq('wrestler_id', x.id)
    const { count: d } = await db.from('dual_meet_matches_girls').select('id', { count: 'exact', head: true }).or(`wrestler_a_id.eq.${x.id},wrestler_b_id.eq.${x.id}`)
    const { count: t } = await db.from('tournament_bouts_girls').select('id', { count: 'exact', head: true }).or(`wrestler1_id.eq.${x.id},wrestler2_id.eq.${x.id}`)
    console.log(`${x.first_name} ${x.last_name} (${pre}): entries ${(e as any[]).map(z => `${z.tournaments.name.replace("Girl_s ", '')} ${z.weight_classes.weight} ${z.schools?.display_name}`).join('; ')} | duals ${d} | tourn bouts ${t}`)
  }
}
