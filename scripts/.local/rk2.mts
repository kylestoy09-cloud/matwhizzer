import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const wc = new Map((await db.from('weight_classes').select('id, weight')).data!.map((r: any) => [r.id, r.weight]))
const ws = (await db.from('wrestlers').select('id, first_name, last_name, grade, is_active, created_at').eq('gender', 'M').eq('first_name', 'Ryan').eq('last_name', 'Kim')).data!
console.log('Ryan Kim profiles:', ws.length)
for (const w of ws) {
  const e = (await db.from('tournament_entries').select('id, school_id, school_context_raw, weight_class_id, seed, wins, losses, region_placement, tournaments(name, season_id)').eq('wrestler_id', w.id)).data ?? []
  console.log(`\n${w.id.slice(0, 8)} grade ${w.grade ?? '-'} active ${w.is_active} created ${w.created_at.slice(0, 10)}`)
  for (const x of e as any[]) {
    const m = (await db.from('matches').select('id', { count: 'exact', head: true }).or(`winner_entry_id.eq.${x.id},loser_entry_id.eq.${x.id}`)).count
    const pl = (await db.from('placements').select('place').eq('entry_id', x.id)).data
    console.log(`   ${x.tournaments.season_id} ${x.tournaments.name}: ${names.get(x.school_id)} (sheet "${x.school_context_raw}") ${wc.get(x.weight_class_id)}lb seed ${x.seed ?? '-'} record ${x.wins ?? '-'}-${x.losses ?? '-'} | postseason bouts ${m} | placement ${JSON.stringify(pl?.map((p: any) => p.place))}`)
  }
}
