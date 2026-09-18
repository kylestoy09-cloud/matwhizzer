import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const COACH_TITLES = ['Head Coach', 'Assistant Coach', 'JV Coach', 'Volunteer Coach']

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

function coachTable(gender: string) {
  return gender === 'F' ? 'girls_coaches' : 'boys_coaches'
}

// GET /api/admin/school-coaches?schoolId=X&seasonId=Y&gender=M|F
export async function GET(req: NextRequest) {
  const { user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId  = parseInt(req.nextUrl.searchParams.get('schoolId') ?? '')
  if (isNaN(schoolId)) return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
  const seasonIdParam = req.nextUrl.searchParams.get('seasonId')
  const seasonId = seasonIdParam ? parseInt(seasonIdParam) : null
  const gender   = req.nextUrl.searchParams.get('gender') ?? 'M'

  const supabase = db()
  let query = supabase
    .from(coachTable(gender))
    .select('id, name, title, email, phone, is_active, season_id')
    .eq('school_id', schoolId)
    .order('is_active', { ascending: false })
    .order('title')
    .order('name')

  if (seasonId && !isNaN(seasonId)) query = query.eq('season_id', seasonId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ coaches: data ?? [], titles: COACH_TITLES })
}

// POST /api/admin/school-coaches — create a coach
export async function POST(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { schoolId, name, title, coachEmail, phone, seasonId, gender = 'M' } = body
  if (!schoolId || !name) return NextResponse.json({ error: 'Missing schoolId or name' }, { status: 400 })

  const supabase = db()
  const { data, error } = await supabase
    .from(coachTable(gender))
    .insert({
      school_id: schoolId, name, title: title || 'Head Coach',
      email: coachEmail || null, phone: phone || null,
      season_id: seasonId || null,
    })
    .select('id, name, title, email, phone, is_active, season_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try { await supabase.rpc('log_admin_activity', {
    p_admin_email: email, p_action: 'coach_create', p_entity_type: 'coach',
    p_entity_id: data.id, p_details: { school_id: schoolId, name, title, gender },
  }) } catch { /* non-fatal */ }

  return NextResponse.json({ coach: data })
}

// PATCH /api/admin/school-coaches — update a coach
export async function PATCH(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { id, name, title, coachEmail, phone, is_active, gender = 'M' } = body
  if (!id) return NextResponse.json({ error: 'Missing coach id' }, { status: 400 })

  const supabase = db()
  const update: Record<string, unknown> = {}
  if (name       !== undefined) update.name      = name
  if (title      !== undefined) update.title     = title
  if (coachEmail !== undefined) update.email     = coachEmail || null
  if (phone      !== undefined) update.phone     = phone || null
  if (is_active  !== undefined) update.is_active = is_active

  const { error } = await supabase.from(coachTable(gender)).update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try { await supabase.rpc('log_admin_activity', {
    p_admin_email: email, p_action: 'coach_edit', p_entity_type: 'coach',
    p_entity_id: id, p_details: { ...update, gender },
  }) } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/school-coaches
export async function DELETE(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { id, gender = 'M' } = body
  if (!id) return NextResponse.json({ error: 'Missing coach id' }, { status: 400 })

  const supabase = db()
  const { data: existing } = await supabase.from(coachTable(gender)).select('*').eq('id', id).single()
  const { error } = await supabase.from(coachTable(gender)).delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try { await supabase.rpc('log_admin_activity', {
    p_admin_email: email, p_action: 'coach_delete', p_entity_type: 'coach',
    p_entity_id: id, p_details: { deleted: existing, gender },
  }) } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true })
}
