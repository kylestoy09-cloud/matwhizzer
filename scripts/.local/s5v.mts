import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const b = JSON.parse(fs.readFileSync('docs/migrations/backups/20261105_d2_east_side_before.json', 'utf8'))
for (const e of b.entries) console.log('entry', e.id.slice(0, 8), (await db.from('tournament_entries').select('school_id').eq('id', e.id)).data![0].school_id)
console.log('team', JSON.stringify((await db.from('precomputed_team_scores').select('school_id, school_name, total_points').eq('id', b.team[0].id)).data))
