import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const R = JSON.parse(fs.readFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/l25.json', 'utf8'))
const SOT = JSON.parse(fs.readFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/sot.json', 'utf8'))
const WC: Record<string, number> = {106:53,113:54,120:55,126:56,132:57,138:58,144:59,150:60,157:61,165:62,175:63,190:64,215:65,285:66} as any
for (const r of R.filter((r: any) => !r.same.length && !r.m.tournament_name.includes('District 23'))) {
  const m = r.m, goneId = r.wEnt ? m.loser_entry_id : m.winner_entry_id, who = r.wEnt ? m.loser_name : m.winner_name
  const old = SOT.entries.find((e: any) => e.entry_id === goneId)
  const ws = (await db.from('wrestlers').select('id').eq('gender', 'M').eq('first_name', old.first_name).eq('last_name', old.last_name)).data!.map((w: any) => w.id)
  const inBracket = ws.length ? (await db.from('tournament_entries').select('id, school_id, wrestler_id').eq('tournament_id', Number(m.tournament_id)).eq('weight_class_id', WC[m.weight]).in('wrestler_id', ws)).data as any[] : []
  const elsewhere = ws.length ? (await db.from('tournament_entries').select('school_id, weight_class_id, tournaments(name, season_id)').in('wrestler_id', ws)).data as any[] : []
  const yr = elsewhere.filter(e => e.tournaments.season_id === 2025 && e.tournaments.name.includes('Districts'))
  console.log(`${m.tournament_name.replace('Boy_s ', '')} ${m.weight} ${m.round}: lost side ${who} (${old.school}, seed ${old.seed || '-'}) | profiles ${ws.length} | in this bracket now ${inBracket.length ? inBracket.map(e => `${e.id.slice(0, 8)} @${names.get(e.school_id)}`) : 'NO'} | his 2024-25 district entries now ${JSON.stringify(yr.map(e => `${e.tournaments.name.replace('Boy_s Districts ', '')} @${names.get(e.school_id)}`))}`)
}
