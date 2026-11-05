import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const b = JSON.parse(fs.readFileSync('docs/migrations/backups/20261105_reactivate_boys_before.json', 'utf8'))
const ids = b.wrestlers.map((w: any) => w.id)
let active = 0; for (let i = 0; i < ids.length; i += 200) active += (await db.from('wrestlers').select('id', { count: 'exact', head: true }).in('id', ids.slice(i, i + 200)).eq('is_active', true)).count ?? 0
let linked = 0, graded = 0
for (const r of b.roster) { const x = (await db.from('roster_grade_import').select('wrestler_id, status, grade').eq('id', r.id)).data![0]; if (x.status === 'confirmed' && ids.includes(x.wrestler_id)) { linked++; const g = (await db.from('wrestlers').select('grade').eq('id', x.wrestler_id)).data![0].grade; if (g === x.grade) graded++ } }
const lg = (await db.from('wrestlers').select('is_active, grade').eq('first_name', 'Luke').eq('last_name', 'Goss')).data![0]
console.log(`now active ${active}/${ids.length} | Track rows confirmed to them ${linked}/${b.roster.length} | grade equals Track grade ${graded}/${b.roster.length} | Luke Goss ${JSON.stringify(lg)}`)
