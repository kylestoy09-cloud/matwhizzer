import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const b = JSON.parse(fs.readFileSync('docs/migrations/backups/20261105_duplicates_before.json', 'utf8'))
const p = b.pairs.find((x: any) => /Steinert/.test(x.who))
for (const id of [p.from, p.into]) { const w = b[`wrestler ${id}`][0]; console.log(id === p.into ? 'KEPT' : 'MERGED', `${w.first_name}|${w.last_name}`, w.grade, w.grade_confirmed_source, (w.grade_confirmed_at ?? '').slice(0, 10)) }
console.log('Track rows now on kept:', JSON.stringify((await db.from('roster_grade_import').select('first_name_raw, last_name_raw, grade, status').eq('wrestler_id', p.into)).data))
const names = (await db.from('tournament_bouts').select('wrestler1_id, wrestler1_name_raw, wrestler2_name_raw').or(`wrestler1_id.eq.${p.into},wrestler2_id.eq.${p.into}`)).data ?? []
console.log('names on bout sheets:', JSON.stringify([...new Set(names.map((x: any) => x.wrestler1_id === p.into ? x.wrestler1_name_raw : x.wrestler2_name_raw))]))
const e = (await db.from('tournament_entries').select('grade_label, tournaments(season_id, name)').eq('wrestler_id', p.into)).data
console.log('postseason entries:', JSON.stringify(e))
