// Applies docs/migrations/20261028_girls_wl_reconciliation.sql via the service
// role, after saving every affected row to the backup file.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const BACKUP = 'docs/migrations/backups/20261028_girls_wl_reconciliation.json'
const sql = readFileSync('docs/migrations/20261028_girls_wl_reconciliation.sql', 'utf8')
const block = (from: string) => { const i = sql.indexOf(from); return sql.slice(i, sql.indexOf(');', i)) }
const uuids = (s: string) => [...s.matchAll(/'([0-9a-f-]{36})'/g)].map(m => m[1])
const DROP = uuids(block('SET counts_toward_record = false'))
const COUNT = uuids(block('SET counts_toward_record = true'))
const TIES = [...block('FOR r IN SELECT').matchAll(/\('([0-9a-f-]{36})'::uuid, (\d+)\)/g)].map(m => ({ id: m[1], winner: Number(m[2]) }))
if (DROP.length !== 180 || COUNT.length !== 5 || TIES.length !== 3) throw new Error(`counts ${DROP.length}/${COUNT.length}/${TIES.length}`)
const ok = <T,>(r: { data: T; error: any }) => { if (r.error) throw r.error; return r.data }
if (existsSync(BACKUP)) throw new Error('backup exists — already applied?')
const all = [...DROP, ...COUNT, ...TIES.map(t => t.id)]
const rows: any[] = []
for (let i = 0; i < all.length; i += 100) rows.push(...(ok(await db.from('dual_meets_girls').select('*').in('id', all.slice(i, i + 100))) as any[]))
const tasks = ok(await db.from('microcheck_tasks').select('*').eq('task_type', 'tie_resolution').eq('gender', 'F').in('entity_id', TIES.map(t => t.id))) as any[]
writeFileSync(BACKUP, JSON.stringify({ meets: rows, tasks }, null, 1))
console.log('backup:', rows.length, 'meets,', tasks.length, 'tasks')
let n = 0
for (let i = 0; i < DROP.length; i += 100) n += (ok(await db.from('dual_meets_girls').update({ counts_toward_record: false }).eq('season_id', 2026).in('id', DROP.slice(i, i + 100)).select('id')) as any[]).length
console.log('not counted', n)
console.log('counted', (ok(await db.from('dual_meets_girls').update({ counts_toward_record: true }).eq('season_id', 2026).in('id', COUNT).select('id')) as any[]).length)
for (const t of TIES) {
  const m = rows.find(r => r.id === t.id)
  if (m.team1_score !== m.team2_score || ![m.team1_school_id, m.team2_school_id].includes(t.winner)) { console.log('SKIP', t.id); continue }
  ok(await db.from('dual_meets_girls').update({
    team1_score: m.team1_score + (t.winner === m.team1_school_id ? 1 : 0), team2_score: m.team2_score + (t.winner === m.team2_school_id ? 1 : 0),
    criteria_winner_school_id: t.winner, tiebreaker_pending: false,
  }).eq('id', t.id))
  ok(await db.from('microcheck_tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('task_type', 'tie_resolution').eq('gender', 'F').eq('entity_id', t.id).eq('status', 'pending'))
  console.log('tie resolved', m.team1_school_name_raw, 'over', m.team2_school_name_raw)
}
const { count } = await db.from('dual_meets_girls').select('*', { count: 'exact', head: true }).eq('season_id', 2026).eq('tiebreaker_pending', true)
console.log('pending ties left', count)
