// Kyle 2026-11-16: "remove roll over tournaments from the task list" (the Roll Over tool was retired; the Tournament
// Hub does the job). Deletes the two preseason admin_tasks rows (boys, girls; never completed). Backup first.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data, error } = await db.from('admin_tasks').select('*').eq('process_key', 'tournament_rollover')
if (error) throw error
writeFileSync('docs/migrations/backups/20261116_rollover_tasks.json', JSON.stringify(data, null, 1))
const { error: dErr } = await db.from('admin_tasks').delete().eq('process_key', 'tournament_rollover')
if (dErr) throw dErr
const { count } = await db.from('admin_tasks').select('id', { count: 'exact', head: true }).eq('process_key', 'tournament_rollover')
console.log('backed up', data.length, 'left', count)
