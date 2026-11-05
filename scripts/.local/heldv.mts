import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const b = JSON.parse(fs.readFileSync('docs/migrations/backups/20261105_held_boys_before.json', 'utf8'))
for (const [k, v] of Object.entries(b) as [string, any][]) {
  if (k.startsWith('A ')) { const id = k.slice(2); const w = (await db.from('wrestlers').select('first_name, last_name, is_active, grade').eq('id', id)).data![0]; const r = (await db.from('roster_grade_import').select('wrestler_id, grade, status').eq('id', v.roster.id)).data![0]; console.log(`A ${w.first_name} ${w.last_name}: active ${w.is_active}, grade ${w.grade} | Track row → ${r.wrestler_id === id ? 'this profile' : r.wrestler_id} (${r.status}, ${r.grade})`) }
  if (k.startsWith('move ')) { const name = k.split(' ').slice(2).join(' '); let ok = 0, n = 0
    for (const t of v.tb) { n++; const x = (await db.from('tournament_bouts').select('wrestler1_id, wrestler2_id, wrestler1_name_raw, wrestler2_name_raw').eq('id', t.id)).data![0]; const id = x.wrestler1_name_raw === name ? x.wrestler1_id : x.wrestler2_id; const w = (await db.from('wrestlers').select('first_name, last_name').eq('id', id)).data![0]; if (`${w.first_name} ${w.last_name}` === name) ok++ }
    for (const t of v.dm) { n++; const x = (await db.from('dual_meet_matches').select('wrestler_a_id, wrestler_b_id, wrestler_a_name_raw').eq('id', t.id)).data![0]; const id = x.wrestler_a_name_raw === name ? x.wrestler_a_id : x.wrestler_b_id; const w = (await db.from('wrestlers').select('first_name, last_name, is_oos, grade').eq('id', id)).data![0]; if (`${w.first_name} ${w.last_name}` === name) ok++; if (name === 'Lerrod Smalls' || name === 'Romeo Roman') console.log(`   ${name}: is_oos ${w.is_oos}, grade ${w.grade}`) }
    console.log(`move "${name}": ${ok}/${n} bouts now on a profile named ${name}`) }
}
