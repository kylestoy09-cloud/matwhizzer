import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const b = JSON.parse(fs.readFileSync('docs/migrations/backups/20261105_split_six_before.json', 'utf8'))
for (const [k, v] of Object.entries(b) as [string, any][]) {
  if (k.includes(' ')) continue
  const n = b[`${k} new`]
  const nw = (await db.from('wrestlers').select('first_name, last_name, grade, is_active').eq('id', n)).data![0], old = (await db.from('wrestlers').select('grade, is_active').eq('id', k)).data![0]
  let ok = 0, tot = 0
  for (const r of v.dm) { tot++; const x = (await db.from('dual_meet_matches').select('wrestler_a_id, wrestler_b_id').eq('id', r.id)).data![0]; if ([x.wrestler_a_id, x.wrestler_b_id].includes(n)) ok++ }
  for (const r of v.tb) { tot++; const x = (await db.from('tournament_bouts').select('wrestler1_id, wrestler2_id').eq('id', r.id)).data![0]; if ([x.wrestler1_id, x.wrestler2_id].includes(n)) ok++ }
  for (const r of v.te) { tot++; const x = (await db.from('tournament_entries').select('wrestler_id').eq('id', r.id)).data![0]; if (x.wrestler_id === n) ok++ }
  console.log(`${nw.first_name} ${nw.last_name}: new (${nw.grade ?? 'no grade'}, active ${nw.is_active}) holds ${ok}/${tot} | senior grade ${old.grade}, active ${old.is_active}`)
}
