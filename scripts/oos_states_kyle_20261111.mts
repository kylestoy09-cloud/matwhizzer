// States Kyle supplied for the six schools missing from his TrackWrestling team lists (2026-11-11): Ridgeline UT,
// West Field UT ("High School" dropped: the tag now tells it from NJ Westfield), Norwood OH, River Valley OH,
// Calhoun NY, Washington WV. Old name kept as an out-of-state alias; backup of the rows.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import { withStateTag, addOosAlias } from '@/lib/oosSchool'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const SET: [number, string, string][] = [[1184, 'Ridgeline', 'UT'], [1181, 'West Field', 'UT'], [1194, 'Norwood', 'OH'], [1143, 'River Valley', 'OH'], [1100, 'Calhoun', 'NY'], [1086, 'Washington', 'WV']]
const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '')
const { data: all } = await db.from('schools').select('id, display_name')
const before = all!.filter(s => SET.some(([id]) => id === s.id))
fs.writeFileSync('docs/migrations/backups/20261111_oos_states_kyle_before.json', JSON.stringify(before))
for (const [id, name, st] of SET) {
  const s = before.find(b => b.id === id)!; const to = withStateTag(name, st)
  const clash = all!.find(x => x.id !== id && norm(x.display_name) === norm(to)); if (clash) { console.log(`HELD ${s.display_name} → ${to}: equals ${clash.id} ${clash.display_name}`); continue }
  const r = await db.from('schools').update({ display_name: to }).eq('id', id).eq('display_name', s.display_name).select('id'); if (r.error || r.data?.length !== 1) throw new Error(`${id}`)
  await addOosAlias(db, s.display_name, id, to)
  console.log(`${s.display_name} → ${to}`)
}
