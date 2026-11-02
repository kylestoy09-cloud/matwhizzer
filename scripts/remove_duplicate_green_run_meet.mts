// St. Augustine 80 - 0 Green Run (2026-01-09) was imported twice on 2026-08-02, once against
// "Green Run" (770, kept) and once against "Green Run, VA" (772). Removes the copy, its 14
// bouts and their rows in the rating match log, then the unused school record 772.
// Approved 2026-11-01. Backup: docs/migrations/backups/20261101_duplicate_green_run_meet.json
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const COPY = 'ec39ba3f-efba-4ea6-a355-8bd0faa2d43b', KEEP = '262e4935-fe93-4f67-99fa-05b3817f90e6', DUP_SCHOOL = 772

const { data: meet } = await db.from('dual_meets').select('*').eq('id', COPY).single()
const { data: bouts } = await db.from('dual_meet_matches').select('*').eq('dual_meet_id', COPY)
const { data: keepBouts } = await db.from('dual_meet_matches').select('id').eq('dual_meet_id', KEEP)
if (meet?.team2_school_id !== DUP_SCHOOL || bouts?.length !== 14 || keepBouts?.length !== 14) throw new Error('not in the state checked: stopping')
const ids = bouts.map(b => b.id)
const { data: log } = await db.from('wrestler_match_score_log').select('*').in('source_id', [...ids, COPY])
const { data: school } = await db.from('schools').select('*').eq('id', DUP_SCHOOL).single()
fs.writeFileSync('docs/migrations/backups/20261101_duplicate_green_run_meet.json', JSON.stringify({ meet, bouts, rating_log: log, school }, null, 1))
console.log(`backed up: 1 meet, ${bouts.length} bouts, ${log?.length} rating log rows, school ${school?.display_name}`)

const run = async (label: string, q: any) => { const { data, error } = await q.select('id'); if (error) throw new Error(`${label}: ${error.message}`); console.log(`deleted ${data.length} ${label}`) }
await run('rating log rows', db.from('wrestler_match_score_log').delete().in('source_id', [...ids, COPY]))
await run('bouts', db.from('dual_meet_matches').delete().eq('dual_meet_id', COPY))
await run('meet', db.from('dual_meets').delete().eq('id', COPY))
// An error here means something else still uses the school: stop, don't force it
await run('school record (Green Run, VA)', db.from('schools').delete().eq('id', DUP_SCHOOL))
