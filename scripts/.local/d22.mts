import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const R = JSON.parse(fs.readFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/l25.json', 'utf8')).filter((r: any) => r.m.tournament_name.includes('District 23'))
const WC: Record<string, number> = {106:53,113:54,120:55,126:56,132:57,138:58,144:59,150:60,157:61,165:62,175:63,190:64,215:65,285:66} as any
const d22 = (await db.from('tournaments').select('id').eq('gender', 'M').eq('season_id', 2025).eq('name', 'Boy_s Districts District 22')).data![0].id
const n = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z]/g, '')
let found = 0
for (const r of R) {
  const ms = (await db.from('matches').select('round, w:winner_entry_id(wrestlers(first_name,last_name)), l:loser_entry_id(wrestlers(first_name,last_name))').eq('tournament_id', d22).eq('weight_class_id', WC[r.m.weight]).eq('round', 'F')).data as any[]
  const ok = ms.some(m => n(`${m.w?.wrestlers?.first_name}${m.w?.wrestlers?.last_name}`) === n(r.m.winner_name) && n(`${m.l?.wrestlers?.first_name}${m.l?.wrestlers?.last_name}`) === n(r.m.loser_name))
  if (ok) found++; else console.log('not in D22:', r.m.weight, r.m.winner_name, 'over', r.m.loser_name)
}
console.log(`the ${R.length} "lost" 2024-25 D23 finals: ${found} are District 22 finals already in the database`)
