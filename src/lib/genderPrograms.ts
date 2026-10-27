// ─────────────────────────────────────────────────────────────────────────────
// genderPrograms.ts
// The NJ schools that run a program for one gender.
//
// `schools` holds every school for both genders, so `schools.is_nj` alone is
// not a boys list or a girls list. Building a boys list that way put a girls-only
// school (Mary Help of Christians Academy, 381) on the boys preseason dashboard;
// it was then deleted as a "boys shell" along with a girls wrestler's season
// (see 20261026_restore_mary_help_kayla_coletta.sql).
//
// A program is a row in boys_schools / girls_schools for a school with
// is_nj = true. With a season, programs marked inactive for that season and
// gender (inactive_school_seasons) are left out; without one, every program is
// returned (tools that manage inactive status need the full list).
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>

async function njPrograms(db: Db, programTable: 'boys_schools' | 'girls_schools', gender: 'M' | 'F', seasonId: number | null): Promise<number[]> {
  const [programs, nj, inactive] = await Promise.all([
    db.from(programTable).select('school_id').limit(5000),
    db.from('schools').select('id').eq('is_nj', true).limit(5000),
    seasonId
      ? db.from('inactive_school_seasons').select('school_id').eq('season_id', seasonId).eq('gender', gender).limit(5000)
      : Promise.resolve({ data: [] as { school_id: number }[], error: null }),
  ])
  for (const r of [programs, nj, inactive]) if (r.error) throw new Error(`${programTable} programs: ${r.error.message}`)
  const njIds = new Set((nj.data ?? []).map(s => s.id as number))
  const out   = new Set((inactive.data ?? []).map(s => s.school_id as number))
  return [...new Set((programs.data ?? []).map(p => p.school_id as number))].filter(id => njIds.has(id) && !out.has(id))
}

export function boysProgramSchoolIds(db: Db, seasonId: number | null = null): Promise<number[]> {
  return njPrograms(db, 'boys_schools', 'M', seasonId)
}

export function girlsProgramSchoolIds(db: Db, seasonId: number | null = null): Promise<number[]> {
  return njPrograms(db, 'girls_schools', 'F', seasonId)
}
