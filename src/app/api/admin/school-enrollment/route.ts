import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return null
  const { data: appUser } = await userSupabase
    .from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

export type EnrolledSchool = {
  id: number
  display_name: string
  short_name: string | null
  is_inactive: boolean
  coop_primary_id: number | null
  coop_primary_name: string | null
  coop_members: Array<{ id: number; display_name: string }>
}

// GET /api/admin/school-enrollment?seasonId=X&gender=M
// Returns all NJ schools with their enrollment status for the given season+gender.
export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const seasonId = req.nextUrl.searchParams.get('seasonId')
  const gender   = req.nextUrl.searchParams.get('gender') ?? 'M'
  if (!seasonId) return NextResponse.json({ error: 'Missing seasonId' }, { status: 400 })
  if (!['M', 'F'].includes(gender)) return NextResponse.json({ error: 'gender must be M or F' }, { status: 400 })

  const snid = Number(seasonId)
  const db = createSupabaseAdmin()

  // All NJ schools
  const { data: schools, error: schoolsErr } = await db
    .from('schools')
    .select('id, display_name, short_name')
    .eq('is_nj', true)
    .order('display_name')

  if (schoolsErr || !schools) {
    return NextResponse.json({ error: schoolsErr?.message ?? 'schools query failed' }, { status: 500 })
  }

  // Inactive school IDs for this season+gender
  const { data: inactiveRows } = await db
    .from('inactive_school_seasons')
    .select('school_id')
    .eq('season_id', snid)
    .eq('gender', gender)

  const inactiveIds = new Set((inactiveRows ?? []).map(r => r.school_id))

  // Coop relationships for this season+gender
  // school_coops.season is a season key (championship year), same as season_id elsewhere
  const { data: coops } = await db
    .from('school_coops')
    .select('coop_school_id, member_school_id, is_primary')
    .eq('season', snid)
    .eq('gender', gender)

  // Build lookup: member_school_id → coop_school_id
  const memberToCoopId = new Map<number, number>()
  // Build lookup: coop_school_id → [member_school_ids]
  const coopToMembers = new Map<number, number[]>()
  for (const c of (coops ?? [])) {
    memberToCoopId.set(c.member_school_id, c.coop_school_id)
    if (!coopToMembers.has(c.coop_school_id)) coopToMembers.set(c.coop_school_id, [])
    coopToMembers.get(c.coop_school_id)!.push(c.member_school_id)
  }

  const schoolMap = new Map(schools.map(s => [s.id, s]))

  const result: EnrolledSchool[] = schools.map(s => {
    const coopPrimaryId = memberToCoopId.get(s.id) ?? null
    const coopPrimary   = coopPrimaryId ? schoolMap.get(coopPrimaryId) : null
    const memberIds     = coopToMembers.get(s.id) ?? []
    const members       = memberIds.map(mid => schoolMap.get(mid)).filter(Boolean) as Array<{ id: number; display_name: string; short_name: string | null }>

    return {
      id: s.id,
      display_name: s.display_name,
      short_name: s.short_name,
      is_inactive: inactiveIds.has(s.id),
      coop_primary_id:   coopPrimaryId,
      coop_primary_name: coopPrimary?.display_name ?? null,
      coop_members: members.map(m => ({ id: m.id, display_name: m.display_name })),
    }
  })

  return NextResponse.json({ schools: result })
}

// POST /api/admin/school-enrollment
// body: { schoolIds: number[], seasonId: number, gender: 'M' | 'F' }
// Returns { inactiveIds: number[] } — which of the given school IDs are inactive.
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { schoolIds, seasonId, gender } = await req.json()
  if (!Array.isArray(schoolIds) || !seasonId || !gender) {
    return NextResponse.json({ error: 'Missing schoolIds, seasonId, or gender' }, { status: 400 })
  }
  if (!['M', 'F'].includes(gender)) {
    return NextResponse.json({ error: 'gender must be M or F' }, { status: 400 })
  }
  if (schoolIds.length === 0) return NextResponse.json({ inactiveIds: [] })

  const db = createSupabaseAdmin()
  const { data } = await db
    .from('inactive_school_seasons')
    .select('school_id')
    .in('school_id', schoolIds)
    .eq('season_id', Number(seasonId))
    .eq('gender', gender)

  return NextResponse.json({ inactiveIds: (data ?? []).map(r => r.school_id) })
}
