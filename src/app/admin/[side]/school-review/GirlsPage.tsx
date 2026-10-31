import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { SchoolReviewClient } from './SchoolReviewClient'
import type { SchoolRow } from './SchoolReviewClient'
import { girlsProgramSchoolIds } from '@/lib/genderPrograms'

export const dynamic = 'force-dynamic'

export default async function SchoolReviewGirlsPage() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createSupabaseAdmin()

  // Current girls preseason season
  const { data: sgsRow } = await db
    .from('season_gender_state')
    .select('season_id')
    .eq('stage', 'preseason')
    .eq('gender', 'F')
    .maybeSingle()

  const seasonId = sgsRow?.season_id ?? null
  const prevSeasonId = seasonId ? seasonId - 1 : null

  // Every girls program, inactive ones included — this page manages inactive
  // status. Girls program names live in girls_schools.
  const { data: programRows } = await db
    .from('girls_schools')
    .select('school_id, display_name')
    .in('school_id', await girlsProgramSchoolIds(db))
    .order('display_name')
  const allSchools = (programRows ?? []).map(s => ({ id: s.school_id as number, display_name: s.display_name as string }))

  const schoolIds = allSchools.map(s => s.id)

  // Fetch all alignment + status data in parallel
  const [
    s2DistrictRows,
    s2RegionRows,
    s2ConferenceRows,
    s3DistrictRows,
    s3RegionRows,
    s2InactiveRows,
    s3InactiveRows,
  ] = await Promise.all([
    prevSeasonId
      ? db.from('girls_school_districts').select('school_id, district_id, girls_districts(name)').in('school_id', schoolIds).eq('season_id', prevSeasonId)
      : Promise.resolve({ data: [] }),
    prevSeasonId
      ? db.from('girls_school_regions').select('school_id, region_id, girls_regions(name)').in('school_id', schoolIds).eq('season_id', prevSeasonId)
      : Promise.resolve({ data: [] }),
    prevSeasonId
      ? db.from('girls_school_conferences').select('school_id, conference').in('school_id', schoolIds).eq('season_id', prevSeasonId)
      : Promise.resolve({ data: [] }),
    seasonId
      ? db.from('girls_school_districts').select('school_id, district_id, girls_districts(name)').in('school_id', schoolIds).eq('season_id', seasonId)
      : Promise.resolve({ data: [] }),
    seasonId
      ? db.from('girls_school_regions').select('school_id, region_id, girls_regions(name)').in('school_id', schoolIds).eq('season_id', seasonId)
      : Promise.resolve({ data: [] }),
    prevSeasonId
      ? db.from('inactive_school_seasons').select('school_id').in('school_id', schoolIds).eq('season_id', prevSeasonId).eq('gender', 'F')
      : Promise.resolve({ data: [] }),
    seasonId
      ? db.from('inactive_school_seasons').select('school_id, merged_into_school_id, record_school_prev_name').in('school_id', schoolIds).eq('season_id', seasonId).eq('gender', 'F')
      : Promise.resolve({ data: [] }),
  ])

  // Build lookup maps
  type DistrictRow = { school_id: number; girls_districts: { name: string }[] }
  type RegionRow   = { school_id: number; girls_regions:  { name: string }[] }
  type ConfRow     = { school_id: number; conference: string }
  type InactiveRow = { school_id: number; merged_into_school_id?: number | null; record_school_prev_name?: string | null }

  const toDistrictName = (r: DistrictRow) =>
    (Array.isArray(r.girls_districts) ? r.girls_districts[0]?.name : (r.girls_districts as unknown as { name: string } | null)?.name) ?? ''
  const toRegionName = (r: RegionRow) =>
    (Array.isArray(r.girls_regions) ? r.girls_regions[0]?.name : (r.girls_regions as unknown as { name: string } | null)?.name) ?? ''

  const s2DistrictMap = new Map<number, string>()
  for (const r of ((s2DistrictRows.data ?? []) as unknown as DistrictRow[]))
    s2DistrictMap.set(r.school_id, toDistrictName(r))

  const s2RegionMap = new Map<number, string>()
  for (const r of ((s2RegionRows.data ?? []) as unknown as RegionRow[]))
    s2RegionMap.set(r.school_id, toRegionName(r))

  const s2ConferenceMap = new Map<number, string>()
  for (const r of ((s2ConferenceRows.data ?? []) as ConfRow[]))
    s2ConferenceMap.set(r.school_id, r.conference)

  const s3DistrictMap = new Map<number, string>()
  for (const r of ((s3DistrictRows.data ?? []) as unknown as DistrictRow[]))
    s3DistrictMap.set(r.school_id, toDistrictName(r))

  const s3RegionMap = new Map<number, string>()
  for (const r of ((s3RegionRows.data ?? []) as unknown as RegionRow[]))
    s3RegionMap.set(r.school_id, toRegionName(r))

  const s2InactiveSet = new Set(((s2InactiveRows.data ?? []) as { school_id: number }[]).map(r => r.school_id))

  const s3InactiveMap = new Map<number, InactiveRow>()
  for (const r of ((s3InactiveRows.data ?? []) as InactiveRow[]))
    s3InactiveMap.set(r.school_id, r)

  // Build a lookup of school id → display_name for merged_into labels
  const schoolNameMap = new Map<number, string>()
  for (const s of allSchools) schoolNameMap.set(s.id, s.display_name)

  // Build rows — all NJ schools; s2_inactive flags schools that were inactive last season
  const rows: SchoolRow[] = allSchools.map(s => {
    const inactive3 = s3InactiveMap.get(s.id)
    const merged_into_id = inactive3?.merged_into_school_id ?? null
    return {
      id: s.id,
      display_name: s.display_name,
      s2_district:   s2DistrictMap.get(s.id) ?? null,
      s2_region:     s2RegionMap.get(s.id) ?? null,
      s2_conference: s2ConferenceMap.get(s.id) ?? null,
      s2_inactive:   s2InactiveSet.has(s.id),
      s3_district:   s3DistrictMap.get(s.id) ?? null,
      s3_region:     s3RegionMap.get(s.id) ?? null,
      inactive:      !!inactive3,
      merged_into_id,
      merged_into_name: merged_into_id ? (schoolNameMap.get(merged_into_id) ?? null) : null,
      record_school_prev_name: inactive3?.record_school_prev_name ?? null,
    }
  })

  return (
    <SchoolReviewClient
      schools={rows}
      seasonId={seasonId ?? 0}
      gender="F"
    />
  )
}
