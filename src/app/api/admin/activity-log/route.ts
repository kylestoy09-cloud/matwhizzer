import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: appUser } = await supabase.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

// GET /api/admin/activity-log?page=0&limit=50&admin_email=...&entity_type=...&action=...&from=...&to=...
export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const page     = Math.max(0, parseInt(sp.get('page') ?? '0', 10))
  const limit    = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '50', 10)))
  const email    = sp.get('admin_email') ?? null
  const entType  = sp.get('entity_type') ?? null
  const action   = sp.get('action') ?? null
  const from     = sp.get('from') ?? null
  const to       = sp.get('to') ?? null

  const db = createSupabaseAdmin()
  let q = db
    .from('admin_activity_log')
    .select('id, admin_email, action, entity_type, entity_id, details, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * limit, page * limit + limit - 1)

  if (email)   q = q.eq('admin_email', email)
  if (entType) q = q.eq('entity_type', entType)
  if (action)  q = q.eq('action', action)
  if (from)    q = q.gte('created_at', from)
  if (to)      q = q.lte('created_at', to)

  const { data, error, count } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ entries: data ?? [], total: count ?? 0, page, limit })
}
