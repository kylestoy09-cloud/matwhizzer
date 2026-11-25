// Review of 2026-11-17's school fill: 20 rows in 2025-26 had a school (from postseason entries) but no section /
// group / conference, which the ratings run never filled for that source. Fills them from the school, as the run
// now does. Backup first.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: rows, error } = await db.from('wrestler_hammer_scores').select('*').not('school_id', 'is', null).is('section', null).is('classification', null).is('conference', null)
if (error) throw error
writeFileSync('docs/migrations/backups/20261117_rating_rows_without_section.json', JSON.stringify(rows, null, 1))
const { data: sc } = await db.from('schools').select('id, athletic_conference, section, classification').in('id', [...new Set(rows!.map(r => r.school_id))])
const byId = new Map((sc ?? []).map(s => [s.id, s]))
let n = 0
for (const r of rows!) {
  const a = byId.get(r.school_id); if (!a) continue
  const { error: e } = await db.from('wrestler_hammer_scores').update({ conference: a.athletic_conference ?? null, section: a.section ?? null, classification: a.classification ?? null }).eq('wrestler_id', r.wrestler_id).eq('season', r.season)
  if (e) throw e
  n++
}
const by: Record<string, number> = {}; for (const r of rows!) by[r.season] = (by[r.season] ?? 0) + 1
console.log({ rows: rows!.length, by_season: by, filled: n })
