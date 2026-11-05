import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: t } = await db.from('tournaments').select('id').eq('name', 'Girl_s Districts District 8').eq('season_id', 2026).single()
const { data: rows } = await db.from('tournament_entries').select('*').eq('tournament_id', t!.id).eq('school_id', 176).eq('school_context_raw', 'West Windsor-Plainsboro South')
fs.writeFileSync('docs/migrations/backups/20261103_wwp_south_girls_entries_before.json', JSON.stringify(rows, null, 1))
const { data, error } = await db.from('tournament_entries').update({ school_id: 177 }).in('id', rows!.map(r => r.id)).select('id, school_id')
console.log(error?.message ?? JSON.stringify(data))
