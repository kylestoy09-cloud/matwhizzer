import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
for (const id of ['92a836ab-2409-4acb-a515-3e77bd772b71', '114e64c7-1cb6-4ab6-b132-927eb759c7a9', '5661e0d5-c92e-421a-ace4-a75ee4909319']) {
  const e = (await db.from('tournament_entries').select('id, school_id, weight_class_id, tournaments(name, season_id)').eq('wrestler_id', id)).data ?? []
  const al = (await db.from('wrestler_name_aliases').select('raw_name, school_id').eq('wrestler_id', id)).data ?? []
  const d = (await db.from('dual_meet_matches').select('id', { count: 'exact', head: true }).or(`wrestler_a_id.eq.${id},wrestler_b_id.eq.${id}`)).count
  const m = e.length ? (await db.from('matches').select('id', { count: 'exact', head: true }).or(e.map((x: any) => `winner_entry_id.eq.${x.id},loser_entry_id.eq.${x.id}`).join(','))).count : 0
  console.log(id.slice(0, 8), JSON.stringify(e.map((x: any) => `${x.tournaments.season_id} ${x.tournaments.name} ${names.get(x.school_id)}`)), '| postseason bouts', m, '| duals', d, '| links', JSON.stringify(al.map((a: any) => `${a.raw_name}@${names.get(a.school_id)}`)))
}
