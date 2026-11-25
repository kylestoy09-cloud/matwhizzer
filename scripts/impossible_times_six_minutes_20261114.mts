// Kyle 2026-11-14: times that can't happen count as 6:00 — a tech fall over 6:00 (techs end in regulation) or a pin over
// 8:00 (the longest a match runs with overtime). Backup with the old times: docs/migrations/backups/20261114_impossible_times.json
// (undo: put each fall_time_seconds back). Dry run unless --apply.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const techs = await db.from('matches').select('id, tournament_id, win_type, fall_time_seconds, score_raw').in('win_type', ['TF', 'TF-1.5']).gt('fall_time_seconds', 360)
const pins = await db.from('matches').select('id, tournament_id, win_type, fall_time_seconds, score_raw').eq('win_type', 'FALL').gt('fall_time_seconds', 480)
if (techs.error || pins.error) throw techs.error ?? pins.error
const rows = [...techs.data, ...pins.data]
for (const r of rows) console.log(r.win_type, r.fall_time_seconds, r.score_raw)
console.log('techs', techs.data.length, 'pins', pins.data.length)
if (process.argv.includes('--apply')) {
  writeFileSync('docs/migrations/backups/20261114_impossible_times.json', JSON.stringify(rows, null, 1))
  const { error } = await db.from('matches').update({ fall_time_seconds: 360 }).in('id', rows.map(r => r.id))
  if (error) throw error
  console.log('set to 6:00:', rows.length)
}
