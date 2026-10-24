import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const sql = (await import('fs')).readFileSync('docs/migrations/20261024_resolve_girls_ties_from_track_criteria.sql', 'utf8')
const rows = [...sql.matchAll(/\('([0-9a-f-]{36})'::uuid,\s*(\d+)\)/g)].map(m => ({ id: m[1], w: +m[2] }))
if (rows.length !== 15) throw new Error('expected 15 rows, got ' + rows.length)
let n = 0
for (const r of rows) {
  const { data: m } = await db.from('dual_meets_girls').select('*').eq('id', r.id).single()
  if (!m || m.team1_score !== m.team2_score || ![m.team1_school_id, m.team2_school_id].includes(r.w)) { console.log('SKIP', r.id); continue }
  const { error } = await db.from('dual_meets_girls').update({
    team1_score: m.team1_score + (r.w === m.team1_school_id ? 1 : 0),
    team2_score: m.team2_score + (r.w === m.team2_school_id ? 1 : 0),
    criteria_winner_school_id: r.w, tiebreaker_pending: false,
  }).eq('id', r.id).eq('team1_score', m.team1_score).eq('team2_score', m.team2_score)
  if (error) throw error
  const { error: e2 } = await db.from('microcheck_tasks').update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('task_type', 'tie_resolution').eq('gender', 'F').eq('entity_id', r.id).eq('status', 'pending')
  if (e2) throw e2
  n++
}
console.log('resolved', n)
const CL = 'ad9c7933-2c9d-483f-92f8-9245112da6db'
const { data: c, error: e3 } = await db.from('dual_meets_girls').update({ team1_score: 45, team2_score: 18, tiebreaker_pending: false })
  .eq('id', CL).eq('team1_school_id', 50).eq('team2_school_id', 58).eq('team1_score', 0).eq('team2_score', 0).select('id')
if (e3) throw e3
if (c?.length) await db.from('microcheck_tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('task_type', 'tie_resolution').eq('gender', 'F').eq('entity_id', CL).eq('status', 'pending')
console.log('clifton fixed', c?.length)
const { count: pt } = await db.from('dual_meets_girls').select('*', { count: 'exact', head: true }).eq('season_id', 2026).eq('tiebreaker_pending', true)
const { count: pk } = await db.from('microcheck_tasks').select('*', { count: 'exact', head: true }).eq('task_type', 'tie_resolution').eq('gender', 'F').eq('status', 'pending')
console.log('pending ties', pt, 'pending tasks', pk)
const { data: chk } = await db.from('dual_meets_girls').select('team1_school_name_raw,team1_score,team2_score,team2_school_name_raw,criteria_winner_school_id').in('id', [...rows.map(r => r.id), CL])
console.table(chk)
