// A school's display name follows the season: schools.display_name is the
// name NOW, and school_season_names holds any season/gender where the name was
// different (e.g. Lodi/Saddle Brook, id 379, was "Lodi" in 2024-25 boys).
// SQL callers use school_display_name(school_id, season_id, gender).

import type { SupabaseClient } from '@supabase/supabase-js'

// school_id → name for one season/gender. Schools without a row keep their
// current name, so callers fall back to schools.display_name.
export async function getSchoolSeasonNames(
  db: SupabaseClient,
  seasonId: number,
  gender: 'M' | 'F',
  schoolIds?: number[],
): Promise<Map<number, string>> {
  let q = db.from('school_season_names').select('school_id, display_name').eq('season_id', seasonId).eq('gender', gender)
  if (schoolIds) q = q.in('school_id', schoolIds)
  const { data } = await q
  return new Map((data ?? []).map(r => [r.school_id as number, r.display_name as string]))
}

export async function getSchoolSeasonName(
  db: SupabaseClient,
  schoolId: number,
  seasonId: number,
  gender: 'M' | 'F',
): Promise<string | null> {
  return (await getSchoolSeasonNames(db, seasonId, gender, [schoolId])).get(schoolId) ?? null
}

// Rows of schools with each one's name for that season/gender (girls co-ops: "Jefferson-Sparta"
// in 2025-26, "Jefferson" before).
export async function withSeasonNames<T extends { id?: number | null; display_name: string }>(
  db: SupabaseClient,
  rows: T[],
  seasonId: number,
  gender: 'M' | 'F',
): Promise<T[]> {
  const names = await getSchoolSeasonNames(db, seasonId, gender)
  return rows.map(r => (r.id != null && names.has(r.id) ? { ...r, display_name: names.get(r.id)! } : r))
}
