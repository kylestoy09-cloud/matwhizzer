// Roster Grade Import step 1 for the girls Track roster (2026-10-29_track_girls):
// link each school name to its school, as the tool's step 1 does, for exact matches only.
// Run: npx tsx --tsconfig tsconfig.json scripts/link_girls_roster_schools.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import { matchSchoolNames } from '../src/lib/matchSchools'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const apply = process.argv.includes('--apply')

const rows: { school_name_raw: string; season_id: number }[] = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('roster_grade_import').select('school_name_raw, season_id')
    .eq('gender', 'F').eq('status', 'pending').range(f, f + 999)
  if (error) throw error
  rows.push(...(data ?? [])); if (!data || data.length < 1000) break
}
const names = [...new Set(rows.map(r => r.school_name_raw))].sort()
const season = rows[0]?.season_id
let linked = 0, skipped = 0
for (const n of names) {
  const m = await matchSchoolNames(n, { gender: 'F', seasonId: season })
  if (m?.confidence !== 'exact' || !m.schoolId) { skipped++; console.log('not exact, left for step 1:', n); continue }
  if (apply) {
    const { error, count } = await db.from('roster_grade_import')
      .update({ school_id: m.schoolId, status: 'school_matched' }, { count: 'exact' })
      .eq('gender', 'F').eq('season_id', season).eq('school_name_raw', n).eq('status', 'pending')
    if (error) throw new Error(`${n}: ${error.message}`)
    linked += count ?? 0
  }
}
console.log(apply ? `linked ${linked} rows across ${names.length - skipped} school names` : `${names.length - skipped} names would link, ${skipped} not exact (dry run)`)
