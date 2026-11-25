// Finishes the boys Season Rollover of 2026-11-11, which stopped after moving grade_season to 2027 and
// advancing the roster pool: its single .in('id', ...) update was too long (400 Bad Request), so no
// wrestler grade changed. Same selection and order as /api/admin/season-rollover POST, batched, and
// without repeating the grade_season or roster pool steps. Backup first.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const gs = (await db.from('grade_season').select('season_end').eq('gender', 'M').single()).data!
if (gs.season_end !== 2027) throw new Error(`grade_season M is ${gs.season_end}, expected 2027`)
const rows: { id: string; grade: string; is_active: boolean; graduation_year: number | null }[] = []
for (let i = 0; ; i += 1000) {
  const { data, error } = await db.from('wrestlers').select('id, grade, is_active, graduation_year').not('grade', 'is', null).eq('is_active', true).eq('is_oos', false).eq('gender', 'M').order('id').range(i, i + 999)
  if (error) throw error; rows.push(...data!); if (data!.length < 1000) break
}
writeFileSync('docs/migrations/backups/20261111_boys_grade_rollover.json', JSON.stringify(rows))
const NEXT: Record<string, string | null> = { Fr: 'So', So: 'Jr', Jr: 'Sr', Sr: null }
const groups: Record<string, string[]> = { So: [], Jr: [], Sr: [], graduate: [] }
for (const r of rows) { const n = NEXT[r.grade]; if (n) groups[n].push(r.id); else if (r.grade === 'Sr') groups.graduate.push(r.id) }
console.log('backup', rows.length, 'advance', { So: groups.So.length, Jr: groups.Jr.length, Sr: groups.Sr.length }, 'graduate', groups.graduate.length)
const now = new Date().toISOString()
for (const g of ['So', 'Jr', 'Sr']) for (let i = 0; i < groups[g].length; i += 300) {
  const { error } = await db.from('wrestlers').update({ grade: g, grade_confirmed_at: now, grade_confirmed_source: 'manual' }).in('id', groups[g].slice(i, i + 300))
  if (error) throw new Error(`advance to ${g} at ${i}: ${error.message}`)
}
for (let i = 0; i < groups.graduate.length; i += 300) {
  const { error } = await db.from('wrestlers').update({ is_active: false }).in('id', groups.graduate.slice(i, i + 300))
  if (error) throw new Error(`graduate at ${i}: ${error.message}`)
}
await db.rpc('log_admin_activity', { p_admin_email: 'kyle.stoy09@gmail.com', p_action: 'season_rollover', p_entity_type: 'wrestlers', p_entity_id: null, p_details: { advanced: groups.So.length + groups.Jr.length + groups.Sr.length, graduated: groups.graduate.length, finished_by: 'scripts/finish_boys_grade_rollover_20261111.mts' } })
// check: a wrestler's class must not move (graduation_year from the trigger with grade_season 2027)
const after: any[] = []
for (let i = 0; ; i += 1000) { const { data } = await db.from('wrestlers').select('id, grade, is_active, graduation_year').eq('gender', 'M').eq('is_oos', false).order('id').range(i, i + 999); after.push(...data!); if (data!.length < 1000) break }
const before = new Map(rows.map(r => [r.id, r]))
let moved = 0, gradChanged = 0
for (const a of after) { const b = before.get(a.id); if (!b) continue; if (a.grade !== b.grade || a.is_active !== b.is_active) moved++; if (a.graduation_year !== b.graduation_year) gradChanged++ }
console.log('changed', moved, 'graduation_year changed (should be 0)', gradChanged)
