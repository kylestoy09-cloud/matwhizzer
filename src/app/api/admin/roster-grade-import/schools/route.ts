import { NextRequest, NextResponse } from 'next/server'
import { getRosterImportSeason } from '@/lib/season-context'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { matchSchoolNames } from '@/lib/matchSchools'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) return null
  const { data: appUser } = await userSb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

// GET ?list=true — return all boys program schools for the manual picker
// GET          — list all school_name_raw values with status summary + auto-match proposals
export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (req.nextUrl.searchParams.get('list') === 'true') {
    const db = createSupabaseAdmin()
    const season = await getRosterImportSeason(db)
    // Union all sources: program enrollment tables + schools with boys dual meets in the roster's season
    const [distData, regData, confData, meetsTeam1, meetsTeam2] = await Promise.all([
      db.from('boys_school_districts').select('school_id').eq('season_id', season.id),
      db.from('boys_school_regions').select('school_id').eq('season_id', season.id),
      db.from('boys_school_conferences').select('school_id').eq('season_id', season.id),
      db.from('dual_meets').select('team1_school_id').eq('gender', 'M').eq('season_id', season.id),
      db.from('dual_meets').select('team2_school_id').eq('gender', 'M').eq('season_id', season.id),
    ])
    const ids = new Set<number>([
      ...(distData.data   ?? []).map(r => r.school_id),
      ...(regData.data    ?? []).map(r => r.school_id),
      ...(confData.data   ?? []).map(r => r.school_id),
      ...(meetsTeam1.data ?? []).map(r => r.team1_school_id),
      ...(meetsTeam2.data ?? []).map(r => r.team2_school_id),
    ])
    if (ids.size === 0) {
      const { data } = await db.from('boys_schools').select('school_id, display_name').order('display_name')
      return NextResponse.json({ schools: (data ?? []).map(r => ({ id: r.school_id, display_name: r.display_name })) })
    }
    const { data, error } = await db
      .from('boys_schools')
      .select('school_id, display_name')
      .in('school_id', Array.from(ids))
      .order('display_name')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ schools: (data ?? []).map(r => ({ id: r.school_id, display_name: r.display_name })) })
  }

  const db = createSupabaseAdmin()
  const season = await getRosterImportSeason(db)

  // Paginate through all rows (Supabase default cap is 1,000)
  const PAGE = 1000
  const allRows: { school_name_raw: string; school_id: number | null; status: string }[] = []
  let from = 0
  while (true) {
    const { data, error } = await db
      .from('roster_grade_import')
      .select('school_name_raw, school_id, status')
      .eq('season_id', season.id)
      .order('school_name_raw')
      .range(from, from + PAGE - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) break
    allRows.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  const rows = allRows

  // Aggregate by school_name_raw
  const schoolMap = new Map<string, {
    school_name_raw: string
    school_id: number | null
    total: number
    pending: number
    school_matched: number
    wrestler_matched: number
    confirmed: number
    no_match: number
    skipped: number
  }>()

  for (const r of (rows ?? [])) {
    const key = r.school_name_raw
    if (!schoolMap.has(key)) {
      schoolMap.set(key, {
        school_name_raw: key,
        school_id: r.school_id,
        total: 0, pending: 0, school_matched: 0,
        wrestler_matched: 0, confirmed: 0, no_match: 0, skipped: 0,
      })
    }
    const entry = schoolMap.get(key)!
    entry.total++
    const statusKey = r.status as 'pending' | 'school_matched' | 'wrestler_matched' | 'confirmed' | 'no_match' | 'skipped'
    if (statusKey in entry) (entry[statusKey] as number)++
    if (r.school_id && !entry.school_id) entry.school_id = r.school_id
  }

  // For unmatched schools, run auto-match
  const schools = Array.from(schoolMap.values())
  const unmatched = schools.filter(s => !s.school_id && s.skipped < s.total)

  const matchResults = await Promise.all(
    unmatched.map(async s => {
      const match = await matchSchoolNames(s.school_name_raw, { gender: 'M', seasonId: season.id })
      return { school_name_raw: s.school_name_raw, match }
    })
  )

  const proposalMap = new Map(matchResults.map(r => [r.school_name_raw, r.match]))

  const result = schools.map(s => ({
    ...s,
    proposal: s.school_id ? null : (proposalMap.get(s.school_name_raw) ?? null),
  }))

  return NextResponse.json({ schools: result })
}

// PATCH — save school_id for all rows matching school_name_raw
export async function PATCH(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { school_name_raw: string; school_id: number | null; action?: 'skip' }[]

  if (!Array.isArray(body) || body.length === 0) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const db = createSupabaseAdmin()
  const season = await getRosterImportSeason(db)
  const errors: string[] = []

  for (const { school_name_raw, school_id, action } of body) {
    if (action === 'skip') {
      const { error } = await db
        .from('roster_grade_import')
        .update({ status: 'skipped' })
        .eq('season_id', season.id)
        .eq('school_name_raw', school_name_raw)
        .eq('status', 'pending')
      if (error) errors.push(`${school_name_raw}: ${error.message}`)
      continue
    }

    if (!school_id) {
      errors.push(`${school_name_raw}: school_id required`)
      continue
    }

    const { error } = await db
      .from('roster_grade_import')
      .update({ school_id, status: 'school_matched' })
      .eq('season_id', season.id)
      .eq('school_name_raw', school_name_raw)
      .in('status', ['pending'])

    if (error) errors.push(`${school_name_raw}: ${error.message}`)
  }

  if (errors.length > 0) return NextResponse.json({ error: errors.join('; ') }, { status: 500 })
  return NextResponse.json({ ok: true, updated: body.length })
}
