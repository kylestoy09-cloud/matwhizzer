import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return { user: null, email: '' }
  const { data: appUser } = await userSupabase.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return { user: null, email: '' }
  return { user, email: user.email ?? '' }
}

function db() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

// Probe for roster_enrollment migration columns (grade, is_active, etc.)
async function checkEnrollmentMigration(supabase: ReturnType<typeof db>): Promise<boolean> {
  const { error } = await supabase.from('wrestlers').select('grade').limit(1)
  return !error || !(error.code === '42703' || error.message.includes('grade'))
}

// GET /api/admin/wrestler-profile?id=<uuid>
export async function GET(req: NextRequest) {
  const { user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = db()
  const enrollmentReady = await checkEnrollmentMigration(supabase)

  // Base wrestler fields
  const selectCols = enrollmentReady
    ? 'id, first_name, last_name, gender, main_weight, is_oos, grade, grade_confirmed_at, grade_confirmed_source, projected_weight_class, confirmed_weight_class, is_active'
    : 'id, first_name, last_name, gender, main_weight, is_oos'

  const { data: wrestler, error } = await supabase
    .from('wrestlers')
    .select(selectCols)
    .eq('id', id)
    .single()

  if (error || !wrestler) return NextResponse.json({ error: 'Wrestler not found' }, { status: 404 })

  // Determine current school from wrestler_school_history (if available), else tournament_entries
  let currentSchool: { id: number; display_name: string } | null = null
  let schoolHistory: unknown[] = []

  const { error: histErr } = await supabase
    .from('wrestler_school_history')
    .select('id, school_id, start_date, end_date, is_confirmed_transfer, created_via')
    .eq('wrestler_id', id)
    .order('start_date', { ascending: false })
    .limit(10)

  if (!histErr) {
    // wrestler_school_history exists
    const { data: hist } = await supabase
      .from('wrestler_school_history')
      .select('id, school_id, start_date, end_date, is_confirmed_transfer, created_via, schools(id, display_name)')
      .eq('wrestler_id', id)
      .order('start_date', { ascending: false })
      .limit(10)

    schoolHistory = (hist ?? []) as unknown[]

    // Current school = most recent open row
    const openRow = (hist ?? []).find((r: unknown) => !(r as Record<string, unknown>).end_date) as Record<string, unknown> | undefined
    if (openRow?.schools) {
      const sch = openRow.schools as { id: number; display_name: string }
      currentSchool = { id: sch.id, display_name: sch.display_name }
    }
  }

  // Fallback: infer current school from tournament_entries (most common school_id)
  if (!currentSchool) {
    const { data: entries } = await supabase
      .from('tournament_entries')
      .select('school_id, schools(id, display_name)')
      .eq('wrestler_id', id)
      .not('school_id', 'is', null)
      .limit(500)

    if (entries && entries.length > 0) {
      const freq = new Map<number, { id: number; display_name: string; count: number }>()
      for (const e of entries as unknown as { school_id: number; schools: { id: number; display_name: string } }[]) {
        const existing = freq.get(e.school_id)
        if (existing) existing.count++
        else freq.set(e.school_id, { ...e.schools, count: 1 })
      }
      const sorted = [...freq.values()].sort((a, b) => b.count - a.count)
      if (sorted[0]) currentSchool = { id: sorted[0].id, display_name: sorted[0].display_name }
    }
  }

  return NextResponse.json({
    wrestler,
    currentSchool,
    schoolHistory,
    enrollmentReady,
  })
}

const EDITABLE_BASIC = new Set(['first_name', 'last_name', 'main_weight'])
const EDITABLE_ENROLLMENT = new Set(['grade', 'projected_weight_class', 'confirmed_weight_class', 'is_active'])

// PATCH /api/admin/wrestler-profile
// Body: { id, first_name?, last_name?, gender?, main_weight?, grade?, projected_weight_class?, confirmed_weight_class?, is_active?, school_id? }
export async function PATCH(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const id: string | undefined = body.id
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = db()
  const enrollmentReady = await checkEnrollmentMigration(supabase)

  // Fetch existing wrestler (to diff changes)
  const { data: existing, error: fetchErr } = await supabase
    .from('wrestlers')
    .select('id, first_name, last_name, gender, main_weight')
    .eq('id', id)
    .single()
  if (fetchErr || !existing) return NextResponse.json({ error: 'Wrestler not found' }, { status: 404 })

  // Build update payload
  const updates: Record<string, unknown> = {}

  for (const field of EDITABLE_BASIC) {
    if (body[field] !== undefined) updates[field] = body[field] || null
  }

  if (enrollmentReady) {
    for (const field of EDITABLE_ENROLLMENT) {
      if (body[field] !== undefined) updates[field] = body[field] === '' ? null : body[field]
    }
    // If grade changed, stamp confirmed_at + source
    if (body.grade !== undefined) {
      updates.grade_confirmed_at     = new Date().toISOString()
      updates.grade_confirmed_source = 'manual'
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateErr } = await supabase
      .from('wrestlers')
      .update(updates)
      .eq('id', id)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // Handle school change (if enrollment migration applied + wrestler_school_history exists)
  const newSchoolId = typeof body.school_id === 'number' ? body.school_id : null
  if (newSchoolId && enrollmentReady) {
    // Check if wrestler_school_history table exists
    const { error: histProbeErr } = await supabase
      .from('wrestler_school_history')
      .select('id')
      .eq('wrestler_id', id)
      .limit(1)

    if (!histProbeErr) {
      // Close current open row
      const { data: openRows } = await supabase
        .from('wrestler_school_history')
        .select('id, school_id')
        .eq('wrestler_id', id)
        .is('end_date', null)

      for (const row of (openRows ?? []) as { id: string; school_id: number }[]) {
        if (row.school_id !== newSchoolId) {
          await supabase
            .from('wrestler_school_history')
            .update({ end_date: new Date().toISOString().split('T')[0] })
            .eq('id', row.id)
        }
      }

      // Create new open row if no open row for the target school
      const alreadyOpen = (openRows ?? []).some(
        (r: unknown) => (r as { school_id: number }).school_id === newSchoolId
      )
      if (!alreadyOpen) {
        await supabase.from('wrestler_school_history').insert({
          wrestler_id:           id,
          school_id:             newSchoolId,
          start_date:            new Date().toISOString().split('T')[0],
          is_confirmed_transfer: true,
          created_via:           'rollover_manual',
        })
      }
    }
  }

  try {
    await supabase.rpc('log_admin_activity', {
      p_admin_email: email,
      p_action:      'edit_wrestler_profile',
      p_entity_type: 'wrestlers',
      p_entity_id:   id,
      p_details:     { updates, school_changed: newSchoolId !== null },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true })
}
