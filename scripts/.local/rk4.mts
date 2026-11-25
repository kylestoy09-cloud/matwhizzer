import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const rk = (await db.from('wrestlers').select('id').eq('first_name', 'Ryan').eq('last_name', 'Kim').eq('gender', 'M')).data!.map((w: any) => w.id).find((x: string) => x.startsWith('ce3511b1'))!
const mine = (await db.from('tournament_entries').select('id, tournament_id, weight_class_id, tournaments(name)').eq('wrestler_id', rk)).data!
for (const me of mine as any[]) {
  const ents = (await db.from('tournament_entries').select('id, wrestler_id, school_id, seed, wrestlers(first_name, last_name)').eq('tournament_id', me.tournament_id).eq('weight_class_id', me.weight_class_id)).data ?? []
  const ms = (await db.from('matches').select('id, round, winner_entry_id, loser_entry_id, win_type, winner_context_raw').eq('tournament_id', me.tournament_id).eq('weight_class_id', me.weight_class_id)).data ?? []
  const ids = new Map(ents.map((e: any) => [e.id, e]))
  console.log(`\n${me.tournaments.name} (Ryan's entry ${me.id.slice(0, 8)}): ${ents.length} entries, ${ms.length} bouts`)
  for (const e of (ents as any[]).sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99))) { const n = ms.filter((m: any) => m.winner_entry_id === e.id || m.loser_entry_id === e.id).length; console.log(`   seed ${e.seed ?? '-'} ${e.wrestlers?.first_name} ${e.wrestlers?.last_name} (${names.get(e.school_id)}) bouts ${n}${e.id === me.id ? '  ← Ryan' : ''}`) }
  const orphan = ms.filter((m: any) => (m.winner_entry_id && !ids.has(m.winner_entry_id)) || (m.loser_entry_id && !ids.has(m.loser_entry_id)))
  console.log(`   bouts naming an entry outside this bracket: ${orphan.length}`)
  for (const m of orphan as any[]) { for (const eid of [m.winner_entry_id, m.loser_entry_id]) if (eid && !ids.has(eid)) { const x = (await db.from('tournament_entries').select('wrestler_id, school_id, wrestlers(first_name, last_name)').eq('id', eid)).data?.[0] as any; console.log(`      ${m.round} ${m.win_type}: entry ${eid.slice(0, 8)} → ${x ? `${x.wrestlers?.first_name} ${x.wrestlers?.last_name} (${names.get(x.school_id)})` : 'MISSING entry'}`) } }
}
