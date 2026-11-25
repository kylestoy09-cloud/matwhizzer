import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const wc = new Map((await db.from('weight_classes').select('id, weight')).data!.map((r: any) => [r.weight, r.id]))
for (const tname of ['Boy_s Districts District 8', 'Boy_s Regions r2']) {
  const t = (await db.from('tournaments').select('id').eq('gender', 'M').eq('season_id', 2026).eq('name', tname)).data![0]
  const ents = (await db.from('tournament_entries').select('id, wrestler_id, school_id, seed, wrestlers(first_name, last_name)').eq('tournament_id', t.id).eq('weight_class_id', wc.get(165))).data ?? []
  console.log(`\n${tname} 165: ${ents.length} entries`)
  for (const e of ents as any[]) {
    const m = (await db.from('matches').select('id', { count: 'exact', head: true }).or(`winner_entry_id.eq.${e.id},loser_entry_id.eq.${e.id}`)).count
    console.log(`   ${e.wrestlers?.first_name} ${e.wrestlers?.last_name} (${names.get(e.school_id)}) seed ${e.seed ?? '-'} | bouts ${m} wrestler ${e.wrestler_id?.slice(0, 8)}`)
  }
  const all = (await db.from('matches').select('id, round, winner_entry_id, loser_entry_id, win_type').eq('tournament_id', t.id).eq('weight_class_id', wc.get(165))).data ?? []
  const ids = new Set(ents.map((e: any) => e.id))
  const orphan = all.filter((m: any) => (m.winner_entry_id && !ids.has(m.winner_entry_id)) || (m.loser_entry_id && !ids.has(m.loser_entry_id)))
  console.log(`   bouts in this bracket: ${all.length}; pointing at an entry not in this bracket: ${orphan.length}`)
}
