import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const L = JSON.parse(fs.readFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/lost.json', 'utf8'))
const WC: Record<string, number> = {106:53,113:54,120:55,126:56,132:57,138:58,144:59,150:60,157:61,165:62,175:63,190:64,215:65,285:66} as any
const n = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z]/g, '')
const filler = /forf|\bFF\b|^[A-Z] F/i
const ge = new Set(L.goneE.map((e: any) => e.entry_id))
const res: any[] = []
for (const m of L.lost.filter((m: any) => m.gender === 'M' && m.season_id === '1' && !filler.test(`${m.winner_name} ${m.loser_name}`))) {
  const ms = (await db.from('matches').select('id, round, win_type, w:winner_entry_id(wrestlers(first_name,last_name)), l:loser_entry_id(wrestlers(first_name,last_name))').eq('tournament_id', Number(m.tournament_id)).eq('weight_class_id', WC[m.weight])).data as any[]
  const nm = (x: any) => n(`${x?.wrestlers?.first_name ?? ''}${x?.wrestlers?.last_name ?? ''}`)
  const same = ms.filter(x => nm(x.w) === n(m.winner_name) && nm(x.l) === n(m.loser_name))
  const sameRound = ms.filter(x => x.round === m.round)
  const wEnt = (await db.from('tournament_entries').select('id').eq('id', m.winner_entry_id)).data!.length, lEnt = m.loser_entry_id ? (await db.from('tournament_entries').select('id').eq('id', m.loser_entry_id)).data!.length : 1
  res.push({ m, same: same.map(x => x.round), sameRound: sameRound.map(x => `${nm(x.w)}>${nm(x.l)}`), wEnt, lEnt })
}
for (const r of res) console.log(`${r.m.tournament_name.replace('Boy_s ', '')} ${r.m.weight} ${r.m.round}: ${r.m.winner_name} over ${r.m.loser_name} | now same pair in rounds ${JSON.stringify(r.same)} | entries exist w${r.wEnt} l${r.lEnt} | bouts in that round now ${JSON.stringify(r.sameRound)}`)
fs.writeFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/l25.json', JSON.stringify(res, null, 1))
