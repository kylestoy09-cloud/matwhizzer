import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) return null
  const db = createSupabaseAdmin()
  const { data: appUser } = await db.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

// GET /api/admin/alignment-import-girls
// Returns: current girls preseason season_id, all district/region names for validation
export async function GET() {
  const db = createSupabaseAdmin()

  const [sgsRes, districtsRes, regionsRes, schoolsRes] = await Promise.all([
    db.from('season_gender_state').select('season_id').eq('stage', 'preseason').eq('gender', 'F').maybeSingle(),
    db.from('girls_districts').select('id, name').order('id'),
    db.from('girls_regions').select('id, name').order('id'),
    db.from('girls_schools').select('school_id, display_name'),
  ])

  return NextResponse.json({
    seasonId: sgsRes.data?.season_id ?? null,
    districts: districtsRes.data ?? [],
    regions: regionsRes.data ?? [],
    schools: (schoolsRes.data ?? []).map(s => ({ id: s.school_id, display_name: s.display_name })),
  })
}

// POST /api/admin/alignment-import-girls
// body: { rows: Array<{ school_id: number; district_id: number; region_id: number }>, seasonId: number }
// Upserts girls_school_districts + girls_school_regions for all rows
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { rows, seasonId } = body as {
    rows: Array<{ school_id: number; district_id: number; region_id: number }>
    seasonId: number
  }

  if (!rows?.length || !seasonId) {
    return NextResponse.json({ error: 'Missing rows or seasonId' }, { status: 400 })
  }

  const db = createSupabaseAdmin()

  const districtRows = rows.map(r => ({
    school_id: r.school_id,
    season_id: seasonId,
    district_id: r.district_id,
  }))

  const regionRows = rows.map(r => ({
    school_id: r.school_id,
    season_id: seasonId,
    region_id: r.region_id,
  }))

  const [distErr, regErr] = await Promise.all([
    db.from('girls_school_districts')
      .upsert(districtRows, { onConflict: 'school_id,season_id' })
      .then(r => r.error),
    db.from('girls_school_regions')
      .upsert(regionRows, { onConflict: 'school_id,season_id' })
      .then(r => r.error),
  ])

  if (distErr) return NextResponse.json({ error: `Districts: ${distErr.message}` }, { status: 500 })
  if (regErr)  return NextResponse.json({ error: `Regions: ${regErr.message}` }, { status: 500 })

  return NextResponse.json({ ok: true, imported: rows.length })
}
