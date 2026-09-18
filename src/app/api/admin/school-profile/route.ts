import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Fields that live on the shared schools row (identity only)
const SHARED_FIELDS = new Set([
  'display_name', 'short_name', 'mascot', 'nickname',
  'color_primary', 'color_secondary', 'color_tertiary', 'header_background',
  'primary_color', 'secondary_color', 'tertiary_color',
  'town', 'county', 'website_url', 'twitter_handle', 'logo_url',
  'founded_year', 'is_nj', 'logo_direction',
  'locale_section',
  'ad_name', 'ad_email',
])

// Fields that live in boys_school_profiles / girls_school_profiles
const PROGRAM_FIELDS = new Set(['section', 'classification'])

async function requireAdmin() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return { user: null, email: null }
  const { data: appUser } = await userSupabase.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return { user: null, email: null }
  return { user, email: user.email ?? '' }
}

function db() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

function tables(gender: 'M' | 'F') {
  const p = gender === 'M' ? 'boys' : 'girls'
  return {
    districts:   `${p}_school_districts`,
    regions:     `${p}_school_regions`,
    conferences: `${p}_school_conferences`,
    profiles:    `${p}_school_profiles`,
  }
}

// GET /api/admin/school-profile?schoolId=X&seasonId=Y&gender=M|F
export async function GET(req: NextRequest) {
  const { user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = parseInt(req.nextUrl.searchParams.get('schoolId') ?? '')
  const seasonId = parseInt(req.nextUrl.searchParams.get('seasonId') ?? '')
  const gender: 'M' | 'F' = req.nextUrl.searchParams.get('gender') === 'F' ? 'F' : 'M'
  if (isNaN(schoolId) || isNaN(seasonId)) {
    return NextResponse.json({ error: 'Missing schoolId or seasonId' }, { status: 400 })
  }

  const supabase = db()
  const t = tables(gender)

  const [sdRes, srRes, confRes, profRes] = await Promise.all([
    supabase.from(t.districts).select('district_id')
      .eq('school_id', schoolId).eq('season_id', seasonId).maybeSingle(),
    supabase.from(t.regions).select('region_id')
      .eq('school_id', schoolId).eq('season_id', seasonId).maybeSingle(),
    supabase.from(t.conferences).select('conference')
      .eq('school_id', schoolId).eq('season_id', seasonId).maybeSingle(),
    supabase.from(t.profiles).select('section, classification')
      .eq('school_id', schoolId).maybeSingle(),
  ])

  return NextResponse.json({
    districtId:     (sdRes.data  as { district_id:  number } | null)?.district_id  ?? null,
    regionId:       (srRes.data  as { region_id:    number } | null)?.region_id    ?? null,
    conference:     (confRes.data as { conference: string } | null)?.conference    ?? null,
    section:        (profRes.data as { section: string }    | null)?.section       ?? null,
    classification: (profRes.data as { classification: string } | null)?.classification ?? null,
  })
}

// PATCH /api/admin/school-profile
// { schoolId, seasonId?, gender, fields?, districtId?, regionId?, conference? }
export async function PATCH(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { schoolId, seasonId, gender = 'M', fields, districtId, regionId, conference } = body
  if (!schoolId) return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })

  const supabase = db()
  const t = tables(gender as 'M' | 'F')
  const errors: string[] = []

  // Shared identity fields → schools
  if (fields && Object.keys(fields).length > 0) {
    const sharedSafe: Record<string, unknown> = {}
    const programSafe: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(fields)) {
      if (SHARED_FIELDS.has(k))  sharedSafe[k]  = v === '' ? null : v
      if (PROGRAM_FIELDS.has(k)) programSafe[k] = v === '' ? null : v
    }
    if (Object.keys(sharedSafe).length > 0) {
      const { error } = await supabase.from('schools').update(sharedSafe).eq('id', schoolId)
      if (error) errors.push(`schools: ${error.message}`)
    }
    if (Object.keys(programSafe).length > 0) {
      const { error } = await supabase.from(t.profiles)
        .upsert({ school_id: schoolId, ...programSafe, updated_at: new Date().toISOString() },
          { onConflict: 'school_id' })
      if (error) errors.push(`${gender === 'M' ? 'boys' : 'girls'} profile: ${error.message}`)
    }
  }

  if (seasonId) {
    // District
    if (districtId !== undefined) {
      await supabase.from(t.districts).delete().eq('school_id', schoolId).eq('season_id', seasonId)
      if (districtId !== null) {
        const { error } = await supabase.from(t.districts)
          .insert({ school_id: schoolId, district_id: districtId, season_id: seasonId })
        if (error) errors.push(`district: ${error.message}`)
      }
    }
    // Region
    if (regionId !== undefined) {
      await supabase.from(t.regions).delete().eq('school_id', schoolId).eq('season_id', seasonId)
      if (regionId !== null) {
        const { error } = await supabase.from(t.regions)
          .insert({ school_id: schoolId, region_id: regionId, season_id: seasonId })
        if (error) errors.push(`region: ${error.message}`)
      }
    }
    // Conference
    if (conference !== undefined) {
      if (!conference) {
        await supabase.from(t.conferences).delete().eq('school_id', schoolId).eq('season_id', seasonId)
      } else {
        const { error } = await supabase.from(t.conferences)
          .upsert({ school_id: schoolId, season_id: seasonId, conference }, { onConflict: 'school_id,season_id' })
        if (error) errors.push(`conference: ${error.message}`)
      }
    }
  }

  if (errors.length > 0) return NextResponse.json({ error: errors.join('; ') }, { status: 500 })

  try {
    await supabase.rpc('log_admin_activity', {
      p_admin_email: email,
      p_action:      'school_profile_edit',
      p_entity_type: 'school',
      p_entity_id:   String(schoolId),
      p_details:     { gender, season_id: seasonId ?? null, fields_changed: Object.keys(fields ?? {}), districtId, regionId, conference },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true })
}
