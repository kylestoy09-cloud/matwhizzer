import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const b = JSON.parse(fs.readFileSync('docs/migrations/backups/20261105_boys_active_rule_before.json', 'utf8'))
let ok = 0; for (const t of b.trackLinks) { const r = (await db.from('roster_grade_import').select('wrestler_id, grade').eq('id', t.row.id)).data![0]; const w = (await db.from('wrestlers').select('grade').eq('id', t.wrestler.id)).data![0]; if (r.wrestler_id === t.wrestler.id && w.grade === r.grade) ok++ }
console.log(`Track rows linked with grade written: ${ok}/${b.trackLinks.length}`)
const lg = (await db.from('wrestlers').select('is_active, grade').eq('first_name', 'Luke').eq('last_name', 'Goss')).data
console.log('Luke Goss still', JSON.stringify(lg))
