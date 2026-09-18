import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id     = req.nextUrl.searchParams.get('id')
  const gender: 'M' | 'F' = req.nextUrl.searchParams.get('gender') === 'F' ? 'F' : 'M'
  const meetsTable   = gender === 'F' ? 'dual_meets_girls'        : 'dual_meets'
  const matchesTable = gender === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches'
  const db = createSupabaseAdmin()

  // List mode: return recent dual meets
  if (!id) {
    const { data: rawMeets } = await db
      .from(meetsTable)
      .select('id, meet_date, team1_school_id, team2_school_id, team1_score, team2_score, season_id')
      .order('meet_date', { ascending: false })
      .limit(100)
    const listMeets = rawMeets ?? []
    // Resolve school display names — never expose raw imported names
    const listSchoolIds = [...new Set([
      ...listMeets.map((m: any) => m.team1_school_id).filter(Boolean),
      ...listMeets.map((m: any) => m.team2_school_id).filter(Boolean),
    ])]
    const listNameMap = new Map<number, string>()
    if (listSchoolIds.length > 0) {
      const { data: ls } = await db.from('schools').select('id, display_name').in('id', listSchoolIds)
      for (const s of ls ?? []) listNameMap.set(s.id as number, s.display_name as string)
    }
    return NextResponse.json({
      meets: listMeets.map((m: any) => ({
        ...m,
        school_a: (m.team1_school_id ? listNameMap.get(m.team1_school_id) : null) ?? 'TBD',
        school_b: (m.team2_school_id ? listNameMap.get(m.team2_school_id) : null) ?? 'TBD',
      })),
    })
  }

  // Detail mode: single meet with matches
  const { data: meet, error: mErr } = await db
    .from(meetsTable)
    .select('id, meet_date, team1_score, team2_score, team1_school_id, team2_school_id, season_id')
    .eq('id', id)
    .single()

  if (mErr || !meet) return NextResponse.json({ error: 'Meet not found' }, { status: 404 })

  // meet_time is a nullable column added in 20260903_fan_scores.sql — fetch separately so
  // a missing column (pre-migration) doesn't break the whole meet load
  let meetTime: string | null = null
  try {
    const { data: mtRow } = await db.from(meetsTable).select('meet_time').eq('id', id).single()
    meetTime = (mtRow as any)?.meet_time ?? null
  } catch {}

  const { data: rawMatches } = await db
    .from(matchesTable)
    .select(`
      id, weight_class, order_index, result_type, result_detail,
      winner_score, loser_score, fall_time_seconds, is_forfeit_win, is_double_forfeit,
      team1_points, team2_points,
      wrestler_a_id, wrestler_b_id, wrestler_a_name_raw, wrestler_b_name_raw,
      school_a_id, school_b_id, winner_id
    `)
    .eq('dual_meet_id', id)
    .order('order_index')

  const matches = rawMatches ?? []

  // Collect wrestler IDs for name lookup
  const wrestlerIds = [...new Set([
    ...matches.map((m: any) => m.wrestler_a_id).filter(Boolean),
    ...matches.map((m: any) => m.wrestler_b_id).filter(Boolean),
  ])]

  const wrestlerMap = new Map<string, { id: string; first_name: string; last_name: string; school_id: string | null }>()
  if (wrestlerIds.length > 0) {
    const { data: wrestlers } = await db
      .from('wrestlers')
      .select('id, first_name, last_name, school_id')
      .in('id', wrestlerIds)
    for (const w of wrestlers ?? []) {
      wrestlerMap.set(w.id as string, w as any)
    }
  }

  // Collect school IDs from matches for logo lookup
  const matchSchoolIds = [...new Set([
    ...matches.map((m: any) => m.school_a_id).filter(Boolean),
    ...matches.map((m: any) => m.school_b_id).filter(Boolean),
  ])]
  const logoMap = new Map<string, string | null>()
  if (matchSchoolIds.length > 0) {
    const { data: logoSchools } = await db
      .from('schools')
      .select('id, logo_url')
      .in('id', matchSchoolIds)
    for (const s of logoSchools ?? []) logoMap.set(String(s.id), s.logo_url ?? null)
  }

  // Enrich matches with wrestler names and school logos
  const enrichedMatches = matches.map((m: any) => {
    const wA = wrestlerMap.get(m.wrestler_a_id)
    const wB = wrestlerMap.get(m.wrestler_b_id)
    return {
      ...m,
      wrestler_a_name: wA ? `${wA.first_name} ${wA.last_name}`.trim() : (m.wrestler_a_name_raw ?? null),
      wrestler_b_name: wB ? `${wB.first_name} ${wB.last_name}`.trim() : (m.wrestler_b_name_raw ?? null),
      school_a_logo: m.school_a_id ? (logoMap.get(String(m.school_a_id)) ?? null) : null,
      school_b_logo: m.school_b_id ? (logoMap.get(String(m.school_b_id)) ?? null) : null,
    }
  })

  // Fetch display names, header backgrounds and logos for each school
  const schoolIds = [meet.team1_school_id, meet.team2_school_id].filter(Boolean) as number[]
  const colorMap   = new Map<number, string | null>()
  const logoMap2   = new Map<number, string | null>()
  const nameMap    = new Map<number, string>()
  const dirMap     = new Map<number, string | null>()
  if (schoolIds.length > 0) {
    const { data: schools } = await db
      .from('schools')
      .select('id, display_name, header_background, logo_url, logo_direction')
      .in('id', schoolIds)
    for (const s of schools ?? []) {
      colorMap.set(s.id as number, (s as any).header_background ?? null)
      logoMap2.set(s.id as number, s.logo_url ?? null)
      nameMap.set(s.id as number, s.display_name as string)
      dirMap.set(s.id as number, (s as any).logo_direction ?? null)
    }
  }

  // Use display_name from schools table only — raw names never reach the client
  const schoolA = (meet.team1_school_id ? nameMap.get(meet.team1_school_id) : null) ?? 'TBD'
  const schoolB = (meet.team2_school_id ? nameMap.get(meet.team2_school_id) : null) ?? 'TBD'

  return NextResponse.json({
    meet: {
      ...meet,
      gender,
      school_a: schoolA,
      school_b: schoolB,
      school_a_id: meet.team1_school_id ?? null,
      school_b_id: meet.team2_school_id ?? null,
      color_a: meet.team1_school_id ? (colorMap.get(meet.team1_school_id) ?? null) : null,
      color_b: meet.team2_school_id ? (colorMap.get(meet.team2_school_id) ?? null) : null,
      logo_a: meet.team1_school_id ? (logoMap2.get(meet.team1_school_id) ?? null) : null,
      logo_b: meet.team2_school_id ? (logoMap2.get(meet.team2_school_id) ?? null) : null,
      logo_dir_a: meet.team1_school_id ? (dirMap.get(meet.team1_school_id) ?? null) : null,
      logo_dir_b: meet.team2_school_id ? (dirMap.get(meet.team2_school_id) ?? null) : null,
      meet_time: meetTime,
    },
    matches: enrichedMatches,
  })
}
