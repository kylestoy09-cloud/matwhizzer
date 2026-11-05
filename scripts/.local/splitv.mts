import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const b = JSON.parse(fs.readFileSync('docs/migrations/backups/20261105_split_five_and_links_before.json', 'utf8'))
for (const [k, v] of Object.entries(b) as [string, any][]) {
  if (k.includes(' ') ) continue
  const n = b[`${k} new`]
  const old = (await db.from('wrestlers').select('first_name, last_name, grade, is_active').eq('id', k)).data![0]
  const nw = (await db.from('wrestlers').select('first_name, last_name, suffix, grade, is_active').eq('id', n)).data![0]
  let ok = 0, tot = 0
  for (const r of v.dm) { tot++; const x = (await db.from('dual_meet_matches').select('wrestler_a_id, wrestler_b_id').eq('id', r.id)).data![0]; if (x.wrestler_a_id === n || x.wrestler_b_id === n) ok++ }
  for (const r of v.tb) { tot++; const x = (await db.from('tournament_bouts').select('wrestler1_id, wrestler2_id').eq('id', r.id)).data![0]; if (x.wrestler1_id === n || x.wrestler2_id === n) ok++ }
  const tr = (await db.from('roster_grade_import').select('wrestler_id').eq('id', v.track.id)).data![0].wrestler_id === n
  const left26 = ((await db.from('dual_meet_matches').select('id, dual_meets!inner(season_id)').or(`wrestler_a_id.eq.${k},wrestler_b_id.eq.${k}`).eq('dual_meets.season_id', 2026)).data ?? []).length
  console.log(`${nw.first_name} ${nw.last_name}${nw.suffix ? ' ' + nw.suffix : ''}: new (${nw.grade}, active ${nw.is_active}) holds ${ok}/${tot} moved bouts, Track row ${tr ? 'linked' : 'NOT linked'} | senior ${old.first_name} ${old.last_name}: grade ${old.grade}, active ${old.is_active}, 2025-26 duals left ${left26}`)
}
for (const [raw, s, pre] of [['Joseph Paretti', 'Elmwood Park', '89411bde'], ['Alexander Reyes', 'North Brunswick', '773f3915'], ['Ryan Kim', 'Fort Lee', 'ce3511b1']]) {
  const sid = (await db.from('schools').select('id').eq('display_name', s)).data![0].id
  console.log(`link "${raw}"@${s} → ${(await db.from('wrestler_name_aliases').select('wrestler_id').eq('raw_name', raw).eq('school_id', sid)).data![0].wrestler_id.slice(0, 8)} (expected ${pre})`)
}
