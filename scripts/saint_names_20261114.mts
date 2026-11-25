// Kyle 2026-11-14: every saint school is named "St. …" ("Saint Rose" → "St. Rose", "St Joseph (Montvale) HS" →
// "St. Joseph (Montvale) HS"), schools.display_name and short_name, and school_season_names. Rule: src/lib/saintNames.ts.
// Backup of the old names: docs/migrations/backups/20261114_saint_names.json. Dry run unless --apply.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { stName } from '../src/lib/saintNames'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const page = async (t: string, cols: string) => { const out: any[] = []; for (let f = 0; ; f += 1000) { const { data, error } = await db.from(t).select(cols).range(f, f + 999); if (error) throw error; out.push(...data); if (data.length < 1000) return out } }
const schools = (await page('schools', 'id, display_name, short_name')).filter(s => stName(s.display_name) !== s.display_name || (s.short_name && stName(s.short_name) !== s.short_name))
const seasonNames = (await page('school_season_names', 'school_id, season_id, gender, display_name')).filter(s => stName(s.display_name) !== s.display_name)
for (const s of schools) console.log(s.id, s.display_name, '→', stName(s.display_name), s.short_name ? `| short ${s.short_name} → ${stName(s.short_name)}` : '')
for (const s of seasonNames) console.log('season', s.school_id, s.season_id, s.gender, s.display_name, '→', stName(s.display_name))
console.log({ schools: schools.length, seasonNames: seasonNames.length })
if (process.argv.includes('--apply')) {
  writeFileSync('docs/migrations/backups/20261114_saint_names.json', JSON.stringify({ schools, seasonNames }, null, 1))
  for (const s of schools) { const { error } = await db.from('schools').update({ display_name: stName(s.display_name), ...(s.short_name ? { short_name: stName(s.short_name) } : {}) }).eq('id', s.id); if (error) throw error }
  for (const s of seasonNames) { const { error } = await db.from('school_season_names').update({ display_name: stName(s.display_name) }).eq('school_id', s.school_id).eq('season_id', s.season_id).eq('gender', s.gender); if (error) throw error }
  console.log('renamed')
}
