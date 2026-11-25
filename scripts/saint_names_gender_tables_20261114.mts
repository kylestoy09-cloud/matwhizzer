// Follow-up to scripts/saint_names_20261114.mts: the boys_schools / girls_schools names (the Schools directory reads
// them) get the same "St. …" rule. Backup: docs/migrations/backups/20261114_saint_names_gender_tables.json. Dry run unless --apply.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { stName } from '../src/lib/saintNames'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const out: Record<string, { school_id: number; display_name: string }[]> = {}
for (const t of ['boys_schools', 'girls_schools']) {
  const rows: { school_id: number; display_name: string }[] = []
  for (let f = 0; ; f += 1000) { const { data, error } = await db.from(t).select('school_id, display_name').range(f, f + 999); if (error) throw error; rows.push(...data); if (data.length < 1000) break }
  out[t] = rows.filter(r => r.display_name && stName(r.display_name) !== r.display_name)
  for (const r of out[t]) console.log(t, r.school_id, r.display_name, '→', stName(r.display_name))
}
if (process.argv.includes('--apply')) {
  writeFileSync('docs/migrations/backups/20261114_saint_names_gender_tables.json', JSON.stringify(out, null, 1))
  for (const [t, rows] of Object.entries(out)) for (const r of rows) { const { error } = await db.from(t).update({ display_name: stName(r.display_name) }).eq('school_id', r.school_id); if (error) throw error }
  console.log('renamed')
}
