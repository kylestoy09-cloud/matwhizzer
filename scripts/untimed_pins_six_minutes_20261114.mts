// Kyle 2026-11-14: a pin or tech fall with no time on file counts as 6:00 (the full match). Sets fall_time_seconds = 360
// on every FALL / TF / TF-1.5 bout with none. Backup of the ids: docs/migrations/backups/20261114_untimed_pins.json
// (undo: set fall_time_seconds back to null for those ids). Dry run unless --apply.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data, error } = await db.from('matches').select('id, tournament_id, win_type').in('win_type', ['FALL', 'TF', 'TF-1.5']).is('fall_time_seconds', null)
if (error) throw error
console.log('untimed pins/techs:', data.length)
if (process.argv.includes('--apply')) {
  writeFileSync('docs/migrations/backups/20261114_untimed_pins.json', JSON.stringify(data, null, 1))
  for (let i = 0; i < data.length; i += 100) {
    const { error: e } = await db.from('matches').update({ fall_time_seconds: 360 }).in('id', data.slice(i, i + 100).map(r => r.id))
    if (e) throw e
  }
  const { count } = await db.from('matches').select('id', { count: 'exact', head: true }).in('win_type', ['FALL', 'TF', 'TF-1.5']).is('fall_time_seconds', null)
  console.log('left untimed:', count)
}
