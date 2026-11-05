import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: w } = await db.from('wrestlers').select('id, first_name, last_name, created_at').ilike('last_name', 'Beaumont%')
for (const x of w!) {
  const { data: e } = await db.from('tournament_entries').select('tournaments(name), weight_classes(weight)').eq('wrestler_id', x.id)
  const { count: d } = await db.from('dual_meet_matches_girls').select('id', { count: 'exact', head: true }).or(`wrestler_a_id.eq.${x.id},wrestler_b_id.eq.${x.id}`)
  const { data: t } = await db.from('tournament_bouts_girls').select('weight_class, in_season_tournaments_girls(name)').or(`wrestler1_id.eq.${x.id},wrestler2_id.eq.${x.id}`)
  const { data: h } = await db.from('wrestler_hammer_scores').select('season').eq('wrestler_id', x.id)
  const { data: al } = await db.from('wrestler_name_aliases').select('raw_name, school_id').eq('wrestler_id', x.id)
  console.log(x.id, x.first_name, x.last_name, '| entries', JSON.stringify((e as any[]).map(z => `${z.tournaments.name} ${z.weight_classes.weight}`)), '| duals', d, '| tourn', JSON.stringify((t as any[]).map(z => `${z.in_season_tournaments_girls.name} ${z.weight_class}`)), '| ratings', h!.length, '| aliases', JSON.stringify(al))
}
