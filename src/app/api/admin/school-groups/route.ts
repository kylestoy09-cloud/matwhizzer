import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const CURRENT_SEASON = 2

async function requireAdmin() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  return user
}

function tables(gender: string) {
  const p = gender === 'F' ? 'girls' : 'boys'
  return {
    districts:   `${p}_school_districts`,
    districtLookup: `${p}_districts`,
    regions:     `${p}_school_regions`,
    regionLookup: `${p}_regions`,
    conferences: `${p}_school_conferences`,
    profiles:    `${p}_school_profiles`,
  }
}

// GET — list or member-schools for a group type, always gender-scoped
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseAdmin()
  const { searchParams } = req.nextUrl
  const type   = searchParams.get('type')
  const value  = searchParams.get('value')
  const gender = searchParams.get('gender') === 'F' ? 'F' : 'M'
  const t = tables(gender)

  if (!type) return NextResponse.json({ error: 'type required' }, { status: 400 })

  type SchoolRow = { id: number; display_name: string; short_name: string | null }

  // ── List mode ──────────────────────────────────────────────────────────────
  if (!value) {
    if (type === 'conference') {
      const { data } = await db.from(t.conferences).select('conference').eq('season_id', CURRENT_SEASON)
      const counts = new Map<string, number>()
      for (const r of (data ?? []) as { conference: string }[]) {
        counts.set(r.conference, (counts.get(r.conference) ?? 0) + 1)
      }
      return NextResponse.json({
        items: [...counts.entries()].map(([name, count]) => ({ id: name, label: name, count }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      })
    }

    if (type === 'section') {
      const { data } = await db.from(t.profiles).select('section').not('section', 'is', null)
      const counts = new Map<string, number>()
      for (const r of (data ?? []) as { section: string }[]) {
        counts.set(r.section, (counts.get(r.section) ?? 0) + 1)
      }
      return NextResponse.json({
        items: [...counts.entries()].map(([name, count]) => ({ id: name, label: name, count }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      })
    }

    if (type === 'classification') {
      const { data } = await db.from(t.profiles).select('classification').not('classification', 'is', null)
      const counts = new Map<string, number>()
      for (const r of (data ?? []) as { classification: string }[]) {
        counts.set(r.classification, (counts.get(r.classification) ?? 0) + 1)
      }
      return NextResponse.json({
        items: [...counts.entries()].map(([name, count]) => ({ id: name, label: `Group ${name}`, count }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      })
    }

    if (type === 'district') {
      const { data } = await db.from(t.districtLookup).select('id, name').order('id')
      const { data: counts } = await db.from(t.districts).select('district_id').eq('season_id', CURRENT_SEASON)
      const countMap = new Map<number, number>()
      for (const r of (counts ?? []) as { district_id: number }[]) {
        countMap.set(r.district_id, (countMap.get(r.district_id) ?? 0) + 1)
      }
      return NextResponse.json({
        items: (data ?? []).map((d: { id: number; name: string }) => ({
          id: String(d.id), label: d.name, count: countMap.get(d.id) ?? 0,
        })),
      })
    }

    if (type === 'region') {
      const { data } = await db.from(t.regionLookup).select('id, name').order('id')
      const { data: counts } = await db.from(t.regions).select('region_id').eq('season_id', CURRENT_SEASON)
      const countMap = new Map<number, number>()
      for (const r of (counts ?? []) as { region_id: number }[]) {
        countMap.set(r.region_id, (countMap.get(r.region_id) ?? 0) + 1)
      }
      return NextResponse.json({
        items: (data ?? []).map((r: { id: number; name: string }) => ({
          id: String(r.id), label: r.name, count: countMap.get(r.id) ?? 0,
        })),
      })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  }

  // ── Member-school mode ─────────────────────────────────────────────────────
  if (type === 'conference') {
    const { data } = await db.from(t.conferences)
      .select('school_id, schools(id, display_name, short_name)')
      .eq('conference', value).eq('season_id', CURRENT_SEASON)
    const schools = (data ?? []).map((r: { schools: SchoolRow | SchoolRow[] | null }) => {
      const s = Array.isArray(r.schools) ? r.schools[0] : r.schools
      return s ? { id: s.id, display_name: s.display_name, short_name: s.short_name } : null
    }).filter(Boolean)
    return NextResponse.json({ schools })
  }

  if (type === 'section') {
    const { data } = await db.from(t.profiles)
      .select('school_id, schools(id, display_name, short_name)').eq('section', value)
    const schools = (data ?? []).map((r: { schools: SchoolRow | SchoolRow[] | null }) => {
      const s = Array.isArray(r.schools) ? r.schools[0] : r.schools
      return s ? { id: s.id, display_name: s.display_name, short_name: s.short_name } : null
    }).filter(Boolean)
    return NextResponse.json({ schools })
  }

  if (type === 'classification') {
    const { data } = await db.from(t.profiles)
      .select('school_id, schools(id, display_name, short_name)').eq('classification', value)
    const schools = (data ?? []).map((r: { schools: SchoolRow | SchoolRow[] | null }) => {
      const s = Array.isArray(r.schools) ? r.schools[0] : r.schools
      return s ? { id: s.id, display_name: s.display_name, short_name: s.short_name } : null
    }).filter(Boolean)
    return NextResponse.json({ schools })
  }

  if (type === 'district') {
    const districtId = parseInt(value, 10)
    const { data } = await db.from(t.districts)
      .select('school_id, schools(id, display_name, short_name)')
      .eq('district_id', districtId).eq('season_id', CURRENT_SEASON)
    const schools = (data ?? []).map((r: { schools: SchoolRow | SchoolRow[] | null }) => {
      const s = Array.isArray(r.schools) ? r.schools[0] : r.schools
      return s ? { id: s.id, display_name: s.display_name, short_name: s.short_name } : null
    }).filter(Boolean)
    return NextResponse.json({ schools })
  }

  if (type === 'region') {
    const regionId = parseInt(value, 10)
    const { data } = await db.from(t.regions)
      .select('school_id, schools(id, display_name, short_name)')
      .eq('region_id', regionId).eq('season_id', CURRENT_SEASON)
    const schools = (data ?? []).map((r: { schools: SchoolRow | SchoolRow[] | null }) => {
      const s = Array.isArray(r.schools) ? r.schools[0] : r.schools
      return s ? { id: s.id, display_name: s.display_name, short_name: s.short_name } : null
    }).filter(Boolean)
    return NextResponse.json({ schools })
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}

// POST — add/remove school from a group, always gender-scoped
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseAdmin()
  const body = await req.json()
  const { type, value, school_id, action, gender = 'M' } = body as {
    type: string; value: string; school_id: number; action: 'add' | 'remove'; gender: string
  }

  if (!type || !value || !school_id || !action) {
    return NextResponse.json({ error: 'type, value, school_id, action required' }, { status: 400 })
  }

  const t = tables(gender)

  if (type === 'conference') {
    if (action === 'add') {
      await db.from(t.conferences).upsert(
        { school_id, conference: value, season_id: CURRENT_SEASON },
        { onConflict: 'school_id,season_id' }
      )
    } else {
      await db.from(t.conferences).delete()
        .eq('school_id', school_id).eq('conference', value).eq('season_id', CURRENT_SEASON)
    }
  } else if (type === 'section') {
    await db.from(t.profiles).upsert(
      { school_id, section: action === 'add' ? value : null, updated_at: new Date().toISOString() },
      { onConflict: 'school_id' }
    )
  } else if (type === 'classification') {
    await db.from(t.profiles).upsert(
      { school_id, classification: action === 'add' ? value : null, updated_at: new Date().toISOString() },
      { onConflict: 'school_id' }
    )
  } else if (type === 'district') {
    const district_id = parseInt(value, 10)
    if (action === 'add') {
      await db.from(t.districts).upsert(
        { school_id, district_id, season_id: CURRENT_SEASON },
        { onConflict: 'school_id,season_id' }
      )
    } else {
      await db.from(t.districts).delete()
        .eq('school_id', school_id).eq('district_id', district_id).eq('season_id', CURRENT_SEASON)
    }
  } else if (type === 'region') {
    const region_id = parseInt(value, 10)
    if (action === 'add') {
      await db.from(t.regions).upsert(
        { school_id, region_id, season_id: CURRENT_SEASON },
        { onConflict: 'school_id,season_id' }
      )
    } else {
      await db.from(t.regions).delete()
        .eq('school_id', school_id).eq('region_id', region_id).eq('season_id', CURRENT_SEASON)
    }
  } else {
    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  }

  const sb = await createSupabaseServer()
  await sb.rpc('log_admin_activity', {
    p_admin_email: user.email ?? '',
    p_action:      `school_group_${action}`,
    p_entity_type: type,
    p_entity_id:   String(school_id),
    p_details:     { type, value, school_id, action, gender },
  })

  return NextResponse.json({ ok: true })
}

// PUT — bulk assign schools to a group type
// Body: { type, gender, assignments: [{ school_id, value }] }
// For conference/classification: value is the string name
// For district/region: value is the numeric id as string
export async function PUT(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseAdmin()
  const body = await req.json()
  const { type, gender = 'M', assignments } = body as {
    type: string
    gender: string
    assignments: Array<{ school_id: number; value: string }>
  }

  if (!type || !Array.isArray(assignments) || assignments.length === 0) {
    return NextResponse.json({ error: 'type and assignments required' }, { status: 400 })
  }

  const t = tables(gender)
  let inserted = 0

  if (type === 'conference') {
    const rows = assignments.map(a => ({
      school_id: a.school_id,
      conference: a.value,
      season_id: CURRENT_SEASON,
    }))
    const { error } = await db.from(t.conferences)
      .upsert(rows, { onConflict: 'school_id,season_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    inserted = rows.length

  } else if (type === 'classification') {
    for (const a of assignments) {
      await db.from(t.profiles).upsert(
        { school_id: a.school_id, classification: a.value, updated_at: new Date().toISOString() },
        { onConflict: 'school_id' }
      )
      inserted++
    }

  } else if (type === 'district') {
    const rows = assignments.map(a => ({
      school_id: a.school_id,
      district_id: parseInt(a.value, 10),
      season_id: CURRENT_SEASON,
    }))
    const { error } = await db.from(t.districts)
      .upsert(rows, { onConflict: 'school_id,season_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    inserted = rows.length

  } else if (type === 'region') {
    const rows = assignments.map(a => ({
      school_id: a.school_id,
      region_id: parseInt(a.value, 10),
      season_id: CURRENT_SEASON,
    }))
    const { error } = await db.from(t.regions)
      .upsert(rows, { onConflict: 'school_id,season_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    inserted = rows.length

  } else {
    return NextResponse.json({ error: 'Bulk import not supported for this type' }, { status: 400 })
  }

  return NextResponse.json({ ok: true, inserted })
}
