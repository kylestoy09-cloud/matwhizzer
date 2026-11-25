// Kyle 2026-11-19: "pat smith from oklahoma st is not pat smith from seton hall prep". The college loader carried a
// match into a wrestler's other years at the same college without checking timing (fixed in src/lib/ncaa/save.ts);
// an audit of every matched year against his high school years found these. Not ours (college years before or during
// his high school years — a different wrestler): every year of that name at that college. Back to review (6–9 years
// after high school — maybe extra years, maybe not): those years only. Anthony Ashnault and Nick Gravina (Rutgers 2019,
// sixth years) stay. Backs up the rows first. Dry run unless --apply.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const NOT_OURS: [string, string][] = [['Pat Smith', 'Oklahoma State'], ['Joshua Rodriguez', 'North Dakota State'], ['Ryan Jack', 'NC State'], ['Mike Mann', 'Iowa State'], ['Pat Murphy', 'Chattanooga']]
// Trent Johnson (Lindsey Wilson): only 2019 clashes with Pennsville's class of 2019 — a grade off by one would explain it
const REVIEW: [string, string, number][] = [['Keith Taylor', 'West Virginia', 1995], ['Jim Sloan', 'Montclair State', 1993], ...[2019, 2020, 2021, 2023].map(y => ['Trent Johnson', 'Lindsey Wilson', y] as [string, string, number])]
const backup: unknown[] = []
const stamp = { reviewed_at: new Date().toISOString(), reviewed_by: 'kyle (via claude)' }
for (const [name, college] of NOT_OURS) {
  const { data: c } = await db.from('colleges').select('id, name').ilike('name', `${college}%`)
  const ids = (c ?? []).map(x => x.id)
  const { data: rows } = await db.from('boys_college_entries').select('*, event:boys_college_events(year, level)').eq('name', name).in('college_id', ids).in('match_status', ['auto', 'review', 'none'])
  console.log('not ours:', name, '|', (c ?? []).map(x => x.name).join('/'), '|', (rows ?? []).map(r => `${r.event.level} ${r.event.year}`).join(', '))
  backup.push(...(rows ?? []))
  if (APPLY && rows?.length) { const { error } = await db.from('boys_college_entries').update({ wrestler_id: null, match_status: 'not_ours', ...stamp }).in('id', rows.map(r => r.id)); if (error) throw error }
}
for (const [name, college, year] of REVIEW) {
  const { data: c } = await db.from('colleges').select('id').ilike('name', `${college}%`)
  const { data: rows } = await db.from('boys_college_entries').select('*, event:boys_college_events!inner(year, level)').eq('name', name).in('college_id', (c ?? []).map(x => x.id)).eq('event.year', year).eq('match_status', 'auto')
  console.log('review:', name, college, year, (rows ?? []).length)
  backup.push(...(rows ?? []))
  if (APPLY && rows?.length) { const { error } = await db.from('boys_college_entries').update({ match_status: 'review', match_note: JSON.stringify({ note: '6–9 years after high school: extra years, or another wrestler?', candidates: [] }) }).in('id', rows.map(r => r.id)); if (error) throw error }
}
if (APPLY) writeFileSync('docs/migrations/backups/20261119_college_bad_timing.json', JSON.stringify(backup, null, 1))
console.log(APPLY ? 'applied' : 'dry run', backup.length, 'rows')
