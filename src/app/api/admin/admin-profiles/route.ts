import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const SUPER_ADMIN_EMAIL = 'kyle.stoy09@gmail.com'

async function checkSuperAdmin() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== SUPER_ADMIN_EMAIL) return null
  return user
}

// GET /api/admin/admin-profiles?view=all — list admin users (default) or all users
export async function GET(req: NextRequest) {
  const user = await checkSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const view = req.nextUrl.searchParams.get('view') // 'all' or null
  const db = createSupabaseAdmin()

  const query = db.from('app_users').select('id, role, display_name, created_at')
  const { data: appUsers, error: appErr } = view === 'all'
    ? await query
    : await query.eq('role', 'admin')

  if (appErr) return NextResponse.json({ error: appErr.message }, { status: 500 })

  // Get auth user details (email) via admin API
  const { data: authList, error: authErr } = await db.auth.admin.listUsers()
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 })

  const authMap = new Map(authList.users.map(u => [u.id, u]))

  const profiles = (appUsers ?? []).map(au => {
    const auth = authMap.get(au.id)
    return {
      id: au.id,
      role: au.role,
      display_name: au.display_name ?? null,
      email: auth?.email ?? null,
      last_sign_in: auth?.last_sign_in_at ?? null,
      created_at: au.created_at,
    }
  })

  return NextResponse.json({ profiles })
}

// PATCH /api/admin/admin-profiles — update display name or role
export async function PATCH(req: NextRequest) {
  const user = await checkSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, display_name, role } = await req.json()
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const db = createSupabaseAdmin()
  const updates: Record<string, unknown> = {}
  if (display_name !== undefined) updates.display_name = display_name || null
  if (role !== undefined) updates.role = role
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  const { error } = await db.from('app_users').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const action = role !== undefined ? 'admin_user_promoted' : 'admin_user_display_name_edited'
  try {
    await db.rpc('log_admin_activity', {
      p_admin_email: user.email!,
      p_action:      action,
      p_entity_type: 'admin_user',
      p_entity_id:   id,
      p_details:     role !== undefined ? { new_role: role } : { display_name: display_name || null },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true })
}

// PUT /api/admin/admin-profiles — create a new admin user and send invite email
export async function PUT(req: NextRequest) {
  const user = await checkSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, display_name } = await req.json()
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })

  const db = createSupabaseAdmin()

  // Invite the user — creates auth record and sends invite email
  const { data: invited, error: inviteErr } = await db.auth.admin.inviteUserByEmail(email)
  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 })

  // Upsert app_users row — trigger may have already inserted a 'fan' row on auth user creation
  const { error: insertErr } = await db.from('app_users').upsert({
    id: invited.user.id,
    role: 'admin',
    display_name: display_name || null,
  }, { onConflict: 'id' })
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  try {
    await db.rpc('log_admin_activity', {
      p_admin_email: user.email!,
      p_action:      'admin_user_created',
      p_entity_type: 'admin_user',
      p_entity_id:   invited.user.id,
      p_details:     { email, display_name: display_name || null },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true, id: invited.user.id })
}

// POST /api/admin/admin-profiles — send password reset email
export async function POST(req: NextRequest) {
  const user = await checkSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })

  const supabase = await createSupabaseServer()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://matwhizzer.com/auth/confirm',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const db = createSupabaseAdmin()
  try {
    await db.rpc('log_admin_activity', {
      p_admin_email: user.email!,
      p_action:      'password_reset_sent',
      p_entity_type: 'admin_user',
      p_entity_id:   null,
      p_details:     { target_email: email },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true })
}
