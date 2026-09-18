import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const CURRENT_SEASON_ID = 2

async function requireAdmin() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return { user: null, email: '' }
  const { data: appUser } = await userSupabase.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return { user: null, email: '' }
  return { user, email: user.email ?? '' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db() { return createClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '') }

// GET /api/admin/power-points/freeze?gender=M
// Returns whether a freeze has been applied for the current season/gender.
export async function GET(req: NextRequest) {
  const { user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gender = req.nextUrl.searchParams.get('gender') ?? 'M'
  const supabase = db()

  const { data, error } = await supabase
    .from('pp_freeze_log')
    .select('id, frozen_at, frozen_by, school_count')
    .eq('season_id', CURRENT_SEASON_ID)
    .eq('gender', gender)
    .order('frozen_at', { ascending: false })
    .limit(1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ frozen: !!(data && data.length > 0), log: data?.[0] ?? null })
}

// POST /api/admin/power-points/freeze
// Body: { gender: 'M' | 'F' }
// Copies live power_points → frozen_power_points for all rows in the current season.
// This is a one-way action — see DELETE for emergency reset.
export async function POST(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json().catch(() => ({}))
  const gender = (body.gender ?? 'M') as 'M' | 'F'

  if (gender !== 'M' && gender !== 'F') {
    return NextResponse.json({ error: 'gender must be M or F' }, { status: 400 })
  }

  const supabase = db()

  // Reject if already frozen
  const { data: existing } = await supabase
    .from('pp_freeze_log')
    .select('id, frozen_at')
    .eq('season_id', CURRENT_SEASON_ID)
    .eq('gender', gender)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({
      error: `Power Points for ${gender === 'M' ? 'Boys' : 'Girls'} are already frozen (${new Date(existing[0].frozen_at).toLocaleDateString()})`,
    }, { status: 409 })
  }

  // Fetch all PP rows
  const { data: ppRows, error: fetchErr } = await supabase
    .from('power_points')
    .select('id, school_id, power_points, overall_wins, overall_losses')
    .eq('season_id', CURRENT_SEASON_ID)
    .eq('gender', gender)

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!ppRows?.length) return NextResponse.json({ error: 'No power points data found for this season/gender' }, { status: 404 })

  // Snapshot before-state for the audit log
  const beforeState = (ppRows as { school_id: number; power_points: number }[]).map(r => ({
    school_id:    r.school_id,
    power_points: r.power_points,
  }))

  // Copy power_points → frozen_power_points row by row (Supabase JS can't do col = col in one call)
  let updated = 0
  for (const row of ppRows as { id: number | string; power_points: number }[]) {
    const { error: rowErr } = await supabase
      .from('power_points')
      .update({ frozen_power_points: row.power_points })
      .eq('id', row.id)
    if (!rowErr) updated++
  }

  if (updated === 0) {
    return NextResponse.json({ error: 'Failed to update power points rows' }, { status: 500 })
  }

  // Log the freeze
  const { error: logErr } = await supabase
    .from('pp_freeze_log')
    .insert({
      season_id:    CURRENT_SEASON_ID,
      gender,
      frozen_by:    email,
      school_count: updated,
      before_state: beforeState,
    })

  if (logErr) console.error('pp_freeze_log insert failed:', logErr.message)

  try {
    await supabase.rpc('log_admin_activity', {
      p_admin_email: email,
      p_action:      'power_points_frozen',
      p_entity_type: 'power_points',
      p_entity_id:   String(CURRENT_SEASON_ID),
      p_details:     { gender, school_count: updated, season_id: CURRENT_SEASON_ID },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true, school_count: updated, gender })
}

// DELETE /api/admin/power-points/freeze
// Clears frozen_power_points and removes the freeze log (emergency reset only).
export async function DELETE(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json().catch(() => ({}))
  const gender = (body.gender ?? 'M') as 'M' | 'F'
  const supabase = db()

  await supabase
    .from('power_points')
    .update({ frozen_power_points: null })
    .eq('season_id', CURRENT_SEASON_ID)
    .eq('gender', gender)

  await supabase
    .from('pp_freeze_log')
    .delete()
    .eq('season_id', CURRENT_SEASON_ID)
    .eq('gender', gender)

  try {
    await supabase.rpc('log_admin_activity', {
      p_admin_email: email,
      p_action:      'power_points_unfrozen',
      p_entity_type: 'power_points',
      p_entity_id:   String(CURRENT_SEASON_ID),
      p_details:     { gender, season_id: CURRENT_SEASON_ID },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true })
}
