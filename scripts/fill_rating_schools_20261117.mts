// Kyle 2026-11-17: 290 rated wrestlers (2026-27, carried from 2025-26) had no school on their rating row, so they sat on
// no Whiz Rank board. The ratings run never looked at in-season tournament bouts for a school; it now falls back to
// schoolIdsOfWrestlers. This fills the existing rows the same way (school + its section / group / conference, as the
// run writes them) for 2025-26 and 2026-27, without rerunning ratings. Backup first.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { schoolIdsOfWrestlers } from '../src/lib/hubSchools'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const rows: any[] = []
for (const season of ['2025-26', '2026-27']) for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('wrestler_hammer_scores').select('*').eq('season', season).is('school_id', null).order('wrestler_id').range(f, f + 999)
  if (error) throw error
  rows.push(...(data ?? [])); if ((data ?? []).length < 1000) break
}
writeFileSync('docs/migrations/backups/20261117_rating_rows_without_school.json', JSON.stringify(rows, null, 1))
const school = await schoolIdsOfWrestlers(db as never, [...new Set(rows.map(r => r.wrestler_id))])
const sIds = [...new Set(school.values())]
const { data: attrs } = await db.from('schools').select('id, athletic_conference, section, classification, is_nj').in('id', sIds)
const attr = new Map((attrs ?? []).map(s => [s.id, s]))
let filled = 0, none = 0, notNj = 0
for (const r of rows) {
  const sid = school.get(r.wrestler_id)
  if (sid == null) { none++; continue }
  const a = attr.get(sid)
  if (!a?.is_nj) { notNj++; continue }
  const { error } = await db.from('wrestler_hammer_scores').update({ school_id: sid, conference: a.athletic_conference ?? null, section: a.section ?? null, classification: a.classification ?? null })
    .eq('wrestler_id', r.wrestler_id).eq('season', r.season).is('school_id', null)
  if (error) throw error
  filled++
}
console.log({ rows: rows.length, filled, no_school_found: none, school_not_nj: notNj })
