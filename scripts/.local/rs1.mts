import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const L = JSON.parse(fs.readFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/lost.json', 'utf8'))
const SOT = JSON.parse(fs.readFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/sot.json', 'utf8'))
const WC: Record<string, number> = {106:53,113:54,120:55,126:56,132:57,138:58,144:59,150:60,157:61,165:62,175:63,190:64,215:65,285:66} as any
console.log('placements cols:', Object.keys((await db.from('placements').select('*').limit(1)).data![0]).join(','))
for (const e of L.goneE.filter((e: any) => e.gender === 'M' && e.season_id === '2')) {
  const cur = (await db.from('tournament_entries').select('id, wrestler_id, school_id, seed, school_context_raw, wrestlers(first_name,last_name)').eq('tournament_id', Number(e.tournament_id)).eq('weight_class_id', WC[e.weight])).data as any[]
  const same = cur.filter(c => c.wrestlers.first_name === e.first_name && c.wrestlers.last_name === e.last_name)
  const pl = SOT.placements.filter((p: any) => p.entry_id === e.entry_id).map((p: any) => p.place)
  console.log(`${e.tournament_name} ${e.weight} ${e.first_name} ${e.last_name} (${e.school}) seed ${e.seed} placed ${JSON.stringify(pl)} → now: ${JSON.stringify(same.map(c => `${c.id.slice(0, 8)} w${c.wrestler_id.slice(0, 8)} ${names.get(c.school_id)} seed ${c.seed}`))}`)
  for (const m of L.lost.filter((m: any) => m.winner_entry_id === e.entry_id || m.loser_entry_id === e.entry_id)) {
    const other = m.winner_entry_id === e.entry_id ? m.loser_entry_id : m.winner_entry_id
    const o = (await db.from('tournament_entries').select('id').eq('id', other)).data!.length
    console.log(`    ${m.round} ${m.winner_name} over ${m.loser_name} ${m.win_type} ${m.winner_score}-${m.loser_score} ft ${m.fall_time_seconds} | opponent entry exists ${o}`)
  }
}
