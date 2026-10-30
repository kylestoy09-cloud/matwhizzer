// Girls school directory for the girls preseason dashboard — girls programs,
// girls coaches and girls alignment only. The boys directory is
// /api/admin/school-directory; the two never share program tables.
import { NextRequest, NextResponse } from 'next/server'
import { getWorkingSeason } from '@/lib/season-context'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin }  from '@/lib/supabase/service'
import { girlsRosterGradeCounts } from '@/lib/rosterGrades'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) return null
  const { data: appUser } = await userSb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

// ── GET — all schools with all directory data + dropdown options ──────────────

export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const seasonParam = req.nextUrl.searchParams.get('season_id')
  const seasonId = seasonParam ? Number(seasonParam) : (await getWorkingSeason('F')).id
  const db = createSupabaseAdmin()

  const [
    girlsSchoolsRes,
    schoolsRes,
    coachesRes,
    conferencesRes,
    districtsAssignRes,
    girlsDistrictsRes,
    regionsAssignRes,
    girlsRegionsRes,
    profilesRes,
    cantFindRes,
    inactiveRes,
  ] = await Promise.all([
    db.from('girls_schools').select('school_id, display_name'),
    db.from('schools')
      .select('id, address, website_url, twitter_handle, facebook_url, ad_name, ad_email')
      .eq('is_nj', true),
    db.from('girls_coaches')
      .select('school_id, name, email')
      .eq('season_id', seasonId)
      .eq('is_active', true),
    db.from('girls_school_conferences')
      .select('school_id, conference')
      .eq('season_id', seasonId),
    db.from('girls_school_districts')
      .select('school_id, district_id')
      .eq('season_id', seasonId),
    db.from('girls_districts').select('id, name').order('name'),
    db.from('girls_school_regions')
      .select('school_id, region_id')
      .eq('season_id', seasonId),
    db.from('girls_regions').select('id, name').order('name'),
    db.from('girls_school_profiles').select('school_id, section, classification'),
    db.from('microcheck_task_log')
      .select('school_id, field')
      .eq('gender', 'F')
      .eq('status', 'cant_find'),
    // Programs marked inactive for this season (shown, flagged in the Active column)
    db.from('inactive_school_seasons')
      .select('school_id')
      .eq('gender', 'F')
      .eq('season_id', seasonId),
  ])

  const gradeCounts = await girlsRosterGradeCounts(db, (girlsSchoolsRes.data ?? []).map(bs => bs.school_id))

  // Build lookup maps
  const schoolMap        = new Map((schoolsRes.data ?? []).map(s => [s.id, s]))
  const coachMap         = new Map((coachesRes.data ?? []).map(c => [c.school_id, c]))
  const conferenceMap    = new Map((conferencesRes.data ?? []).map(c => [c.school_id, c.conference]))
  const districtMap      = new Map((districtsAssignRes.data ?? []).map(d => [d.school_id, d.district_id]))
  const regionMap        = new Map((regionsAssignRes.data ?? []).map(r => [r.school_id, r.region_id]))
  const profileMap       = new Map((profilesRes.data ?? []).map(p => [p.school_id, p]))
  // Set of "school_id:field" for cant_find entries — drives amber highlighting
  const cantFindSet = new Set((cantFindRes.data ?? []).map(e => `${e.school_id}:${e.field}`))
  const inactiveSet = new Set((inactiveRes.data ?? []).map(r => r.school_id))

  const schools = (girlsSchoolsRes.data ?? [])
    .map(bs => {
      const s  = schoolMap.get(bs.school_id)
      const c  = coachMap.get(bs.school_id)
      const pr = profileMap.get(bs.school_id)
      const gc = gradeCounts.bySchool.get(bs.school_id)
      return {
        id:             bs.school_id,
        display_name:   bs.display_name,
        address:        s?.address        ?? null,
        website_url:    s?.website_url    ?? null,
        twitter_handle: s?.twitter_handle ?? null,
        facebook_url:   s?.facebook_url   ?? null,
        ad_name:        s?.ad_name        ?? null,
        ad_email:       s?.ad_email       ?? null,
        coach_name:     c?.name           ?? null,
        coach_email:    c?.email          ?? null,
        conference:     conferenceMap.get(bs.school_id) ?? null,
        district_id:    districtMap.get(bs.school_id)   ?? null,
        region_id:      regionMap.get(bs.school_id)     ?? null,
        section:        pr?.section        ?? null,
        classification: pr?.classification ?? null,
        roster_count:   gc?.roster ?? 0,
        graded_count:   gc?.graded ?? 0,
        active:         !inactiveSet.has(bs.school_id),
      }
    })
    .sort((a, b) => a.display_name.localeCompare(b.display_name))

  // Conference options from existing data
  const uniqueConferences = [...new Set(
    (conferencesRes.data ?? []).map(c => c.conference).filter(Boolean)
  )].sort()

  // Get distinct section/group values from profiles
  const allProfiles = profilesRes.data ?? []
  const uniqueSections = [...new Set(allProfiles.map(p => p.section).filter(Boolean))].sort() as string[]
  const uniqueGroups   = [...new Set(allProfiles.map(p => p.classification).filter(Boolean))].sort() as string[]

  // Fallback fixed lists if DB has none yet
  const sections = uniqueSections.length > 0
    ? uniqueSections
    : ['North 1', 'North 2', 'Central', 'South']
  const groups = uniqueGroups.length > 0
    ? uniqueGroups
    : ['1', '2', '3', '4', '5', 'Non-Public A', 'Non-Public B']

  return NextResponse.json({
    schools,
    cantFind: [...cantFindSet],
    options: {
      districts:   girlsDistrictsRes.data ?? [],
      regions:     girlsRegionsRes.data   ?? [],
      conferences: uniqueConferences,
      sections,
      groups,
    },
  })
}

// ── PATCH — update one cell ───────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { school_id, field, value, season_id } = await req.json() as {
    school_id: number
    field:     string
    value:     string | null
    season_id: number
  }
  if (!school_id || !field) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const db  = createSupabaseAdmin()
  const val = value?.trim() || null

  if (['address', 'website_url', 'twitter_handle', 'facebook_url', 'ad_name', 'ad_email'].includes(field)) {
    const { error } = await db.from('schools').update({ [field]: val }).eq('id', school_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  } else if (field === 'coach_name') {
    const { data: existing } = await db.from('girls_coaches')
      .select('id').eq('school_id', school_id).eq('season_id', season_id).eq('is_active', true).maybeSingle()
    if (existing) {
      const { error } = await db.from('girls_coaches').update({ name: val }).eq('id', existing.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else if (val) {
      const { error } = await db.from('girls_coaches').insert({ school_id, season_id, name: val, is_active: true })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

  } else if (field === 'coach_email') {
    const { error } = await db.from('girls_coaches')
      .update({ email: val })
      .eq('school_id', school_id).eq('season_id', season_id).eq('is_active', true)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  } else if (field === 'conference') {
    if (val) {
      const { error } = await db.from('girls_school_conferences')
        .upsert({ school_id, season_id, conference: val }, { onConflict: 'school_id,season_id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      await db.from('girls_school_conferences').delete().eq('school_id', school_id).eq('season_id', season_id)
    }

  } else if (field === 'district_id') {
    if (val) {
      const { error } = await db.from('girls_school_districts')
        .upsert({ school_id, season_id, district_id: Number(val) }, { onConflict: 'school_id,season_id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      await db.from('girls_school_districts').delete().eq('school_id', school_id).eq('season_id', season_id)
    }

  } else if (field === 'region_id') {
    if (val) {
      const { error } = await db.from('girls_school_regions')
        .upsert({ school_id, season_id, region_id: Number(val) }, { onConflict: 'school_id,season_id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      await db.from('girls_school_regions').delete().eq('school_id', school_id).eq('season_id', season_id)
    }

  } else if (field === 'section' || field === 'classification') {
    const { error } = await db.from('girls_school_profiles')
      .upsert({ school_id, [field]: val }, { onConflict: 'school_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// ── POST — add a new school ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    display_name:   string
    address?:       string | null
    website_url?:   string | null
    twitter_handle?: string | null
    facebook_url?:  string | null
    ad_name?:       string | null
    ad_email?:      string | null
    coach_name?:    string | null
    coach_email?:   string | null
    conference?:    string | null
    district_id?:   number | null
    region_id?:     number | null
    section?:       string | null
    classification?: string | null
    season_id:      number
  }

  if (!body.display_name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const db = createSupabaseAdmin()

  // 1. Create schools row
  const { data: newSchool, error: schoolErr } = await db.from('schools').insert({
    display_name:   body.display_name.trim(),
    is_nj:          true,
    is_combined:    false,
    is_active:      true,
    address:        body.address        || null,
    website_url:    body.website_url    || null,
    twitter_handle: body.twitter_handle || null,
    facebook_url:   body.facebook_url   || null,
    ad_name:        body.ad_name        || null,
    ad_email:       body.ad_email       || null,
  }).select('id').single()
  if (schoolErr) return NextResponse.json({ error: schoolErr.message }, { status: 500 })

  const school_id = newSchool.id
  const season_id = body.season_id

  // 2. Add to girls_schools
  await db.from('girls_schools').insert({ school_id, display_name: body.display_name.trim(), is_combined: false })

  // 3. Optional related records (only insert non-null values)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inserts: PromiseLike<any>[] = []

  if (body.coach_name?.trim()) {
    inserts.push(db.from('girls_coaches').insert({
      school_id, season_id, name: body.coach_name.trim(),
      email: body.coach_email?.trim() || null, is_active: true,
    }))
  }
  if (body.conference?.trim()) {
    inserts.push(db.from('girls_school_conferences').insert({ school_id, season_id, conference: body.conference.trim() }))
  }
  if (body.district_id) {
    inserts.push(db.from('girls_school_districts').insert({ school_id, season_id, district_id: body.district_id }))
  }
  if (body.region_id) {
    inserts.push(db.from('girls_school_regions').insert({ school_id, season_id, region_id: body.region_id }))
  }
  if (body.section?.trim() || body.classification?.trim()) {
    inserts.push(db.from('girls_school_profiles').insert({
      school_id,
      section:        body.section?.trim()        || null,
      classification: body.classification?.trim() || null,
    }))
  }

  await Promise.allSettled(inserts)

  return NextResponse.json({ ok: true, school_id })
}
