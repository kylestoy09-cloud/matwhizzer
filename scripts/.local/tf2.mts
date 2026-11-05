import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const senior = (await db.from('wrestlers').select('id').eq('first_name', 'Tyler').eq('last_name', 'French').eq('is_active', false)).data![0].id
const waldwick = (await db.from('wrestlers').select('id').eq('first_name', 'Tyler').eq('last_name', 'French').eq('is_active', true)).data![0].id
const row = (await db.from('roster_grade_import').select('*').eq('wrestler_id', senior).eq('last_name_raw', 'FFrench')).data![0]
fs.writeFileSync('docs/migrations/backups/20261105_tyler_ffrench_row_before.json', JSON.stringify(row, null, 1))
await db.from('roster_grade_import').update({ wrestler_id: waldwick }).eq('id', row.id)
await db.from('wrestlers').update({ grade: row.grade, grade_confirmed_source: 'roster_upload', grade_confirmed_at: new Date().toISOString() }).eq('id', waldwick)
console.log('row now →', (await db.from('roster_grade_import').select('wrestler_id').eq('id', row.id)).data![0].wrestler_id === waldwick ? 'Waldwick profile' : 'WRONG', '| Waldwick:', JSON.stringify((await db.from('wrestlers').select('grade, is_active').eq('id', waldwick)).data), '| Lacey senior:', JSON.stringify((await db.from('wrestlers').select('grade, is_active').eq('id', senior)).data))
