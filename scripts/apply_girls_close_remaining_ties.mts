// Applies docs/migrations/20261028_girls_close_remaining_ties.sql via the
// service role, after saving the affected rows to the backup file.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const BACKUP = 'docs/migrations/backups/20261028_girls_close_remaining_ties.json'
const sql = readFileSync('docs/migrations/20261028_girls_close_remaining_ties.sql', 'utf8')
const i = sql.indexOf('AND id IN ('); const IDS = [...sql.slice(i, sql.indexOf(');', i)).matchAll(/'([0-9a-f-]{36})'/g)].map(m => m[1])
if (IDS.length !== 45) throw new Error(`expected 45 ids, got ${IDS.length}`)
const ok = <T,>(r: { data: T; error: any }) => { if (r.error) throw r.error; return r.data }
if (existsSync(BACKUP)) throw new Error('backup exists — already applied?')
const meets = ok(await db.from('dual_meets_girls').select('*').in('id', IDS)) as any[]
const tasks = ok(await db.from('microcheck_tasks').select('*').eq('task_type', 'tie_resolution').eq('gender', 'F').in('entity_id', IDS)) as any[]
writeFileSync(BACKUP, JSON.stringify({ meets, tasks }, null, 1))
console.log('backup:', meets.length, 'meets,', tasks.length, 'tasks')
const closed = ok(await db.from('dual_meets_girls').update({ tiebreaker_pending: false }).eq('season_id', 2026).eq('tiebreaker_pending', true).in('id', IDS).select('id,team1_score,team2_score')) as any[]
if (closed.some(m => m.team1_score !== m.team2_score)) throw new Error('a closed meet is not tied')
const done = ok(await db.from('microcheck_tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('task_type', 'tie_resolution').eq('gender', 'F').eq('status', 'pending').in('entity_id', IDS).select('id')) as any[]
console.log('closed ties', closed.length, 'tasks completed', done.length)
const { count: pm } = await db.from('dual_meets_girls').select('*', { count: 'exact', head: true }).eq('season_id', 2026).eq('tiebreaker_pending', true)
const { count: pt } = await db.from('microcheck_tasks').select('*', { count: 'exact', head: true }).eq('task_type', 'tie_resolution').eq('gender', 'F').eq('status', 'pending')
console.log('verify: pending ties', pm, 'pending girls tie tasks', pt)
