import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const a = JSON.parse(fs.readFileSync('docs/migrations/backups/20261105_split_five_and_links_before.json', 'utf8'))
const b = JSON.parse(fs.readFileSync('docs/migrations/backups/20261105_split_six_before.json', 'utf8'))
const seniors = [...Object.keys(a), ...Object.keys(b)].filter(k => !k.includes(' '))
for (const id of seniors) {
  const w = (await db.from('wrestlers').select('first_name, last_name').eq('id', id)).data![0]
  const rows = (await db.from('roster_grade_import').select('first_name_raw, last_name_raw, grade, school_id, season_id').eq('wrestler_id', id)).data ?? []
  console.log(`${w.first_name} ${w.last_name} (senior): Track rows still linked ${rows.length ? rows.map((r: any) => `${r.first_name_raw} ${r.last_name_raw} ${r.grade} @ ${names.get(r.school_id)} ${r.season_id}`).join(', ') : 'none'}`)
}
