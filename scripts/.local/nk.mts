import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const [f, l, dn] of [['Charles', 'Palmisano', 12], ['Arjun', 'Monga', 18], ['William', 'McSorley', 28]] as const) {
  const t = (await db.from('tournaments').select('id').eq('gender', 'M').eq('season_id', 2025).eq('name', `Boy_s Districts District ${dn}`)).data![0].id
  const ws = (await db.from('wrestlers').select('id').eq('first_name', f).eq('last_name', l)).data!.map((x: any) => x.id)
  const es = (await db.from('tournament_entries').select('id').eq('tournament_id', t).in('wrestler_id', ws)).data!
  for (const e of es as any[]) console.log(f, l, `D${dn}`, JSON.stringify((await db.from('matches').select('round, winner_entry_id, w:winner_entry_id(wrestlers(last_name)), l:loser_entry_id(wrestlers(last_name))').or(`winner_entry_id.eq.${e.id},loser_entry_id.eq.${e.id}`)).data!.map((m: any) => `${m.round} ${m.w?.wrestlers?.last_name} over ${m.l?.wrestlers?.last_name}`)))
  if (!es.length) console.log(f, l, `D${dn}: no entry`)
}
