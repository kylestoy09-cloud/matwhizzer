// Kyle 2026-11-13 ("1 - yes"): (a) NHSCA Junior 152 (boys) is replaced by the corrected bracket (two Freshmen wrestled
// up into it, so places 17–32 shift); (b) Northeast Regional 14U leaves the Middle School list for the boys and girls
// Offseason lists (14U/16U go to high school unless the roster says 8th grade or below; this file has no grades).
// This step backs up and removes the old rows; load_more.mts loads the new ones.
import { writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const backup: Record<string, unknown[]> = {}
const { data: tN } = await db.from('boys_hub_tournaments').select('id').eq('name', 'NHSCA High School Nationals').single()
const { data: eN } = await db.from('boys_hub_events').select('id').eq('tournament_id', tN!.id).eq('season', 2026).single()
const { data: a, error: ea } = await db.from('boys_hub_placements').select('*').eq('event_id', eN!.id).eq('division', 'Junior').eq('weight', '152')
if (ea) throw ea
backup.boys_hub_placements_nhsca_junior_152 = a!
const { data: tR } = await db.from('mixed_hub_tournaments').select('id').eq('name', 'USAW Northeast Regional Championships (14U)').single()
const { data: eR } = await db.from('mixed_hub_events').select('*').eq('tournament_id', tR!.id)
const { data: b, error: eb } = await db.from('mixed_hub_placements').select('*').in('event_id', eR!.map(e => e.id))
if (eb) throw eb
backup.mixed_hub_placements_ner_14u = b!; backup.mixed_hub_events_ner_14u = eR!
// bouts referencing either (none expected: these were podium imports)
const { count: c1 } = await db.from('boys_hub_bouts').select('*', { count: 'exact', head: true }).eq('event_id', eN!.id)
const { count: c2 } = await db.from('mixed_hub_bouts').select('*', { count: 'exact', head: true }).in('event_id', eR!.map(e => e.id))
console.log(`NHSCA Junior 152 rows ${a!.length} | NER 14U rows ${b!.length} in ${eR!.length} event(s) | bouts on those events: ${c1}, ${c2}`)
const file = 'docs/migrations/backups/20261113_hub_two_corrections.json'
writeFileSync(file, JSON.stringify(backup, null, 1)); console.log('backup', file)
if (process.argv[2] === 'go') {
  const { error: d1 } = await db.from('boys_hub_placements').delete().in('id', a!.map(r => r.id)); if (d1) throw d1
  const { error: d2 } = await db.from('mixed_hub_placements').delete().in('id', b!.map(r => r.id)); if (d2) throw d2
  await db.from('mixed_hub_events').update({ uploaded_at: null, upload_files: null, upload_divisions: null, notes: 'Moved to the boys and girls Offseason Hubs (14U = high school unless known 8th grade or below), 2026-11-13' }).in('id', eR!.map(e => e.id))
  await db.from('mixed_hub_tournaments').update({ is_active: false }).eq('id', tR!.id)
  console.log('removed; the Middle School list hides "USAW Northeast Regional Championships (14U)"')
}
