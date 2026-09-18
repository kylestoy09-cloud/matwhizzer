import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

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

// PATCH /api/admin/school-schedule
// Body: { meetId, meetDate }
export async function PATCH(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { meetId, meetDate, gender } = body

  if (!meetId || !meetDate) return NextResponse.json({ error: 'Missing meetId or meetDate' }, { status: 400 })

  const meetsTable = gender === 'F' ? 'dual_meets_girls' : 'dual_meets'
  const supabase = db()

  const { data: existing } = await supabase.from(meetsTable).select('meet_date').eq('id', meetId).single()

  const { error } = await supabase
    .from(meetsTable)
    .update({ meet_date: meetDate })
    .eq('id', meetId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await supabase.rpc('log_admin_activity', {
      p_admin_email: email,
      p_action:      'meet_date_edit',
      p_entity_type: 'dual_meet',
      p_entity_id:   String(meetId),
      p_details:     { before: existing?.meet_date, after: meetDate },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true })
}
