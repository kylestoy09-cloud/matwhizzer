import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return null
  const { data: appUser } = await userSupabase
    .from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

// GET /api/admin/postseason-checklist?seasonId=X
// Returns { team: Row[], individual: Row[] }
export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const seasonId = req.nextUrl.searchParams.get('seasonId')
  if (!seasonId) return NextResponse.json({ error: 'Missing seasonId' }, { status: 400 })

  const { data, error } = await createSupabaseAdmin()
    .from('postseason_checklist')
    .select('id, season_id, side, step_key, status, completed_at')
    .eq('season_id', Number(seasonId))
    .order('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  return NextResponse.json({
    team:       rows.filter(r => r.side === 'team'),
    individual: rows.filter(r => r.side === 'individual'),
  })
}

// PATCH /api/admin/postseason-checklist  body: { id, status }
export async function PATCH(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status } = await req.json()
  const VALID = ['not_started', 'in_progress', 'complete']
  if (!id || !status || !VALID.includes(status)) {
    return NextResponse.json({ error: 'Invalid id or status' }, { status: 400 })
  }

  const update: Record<string, unknown> = { status }
  if (status === 'complete') update.completed_at = new Date().toISOString()
  if (status !== 'complete') update.completed_at = null

  const { error } = await createSupabaseAdmin()
    .from('postseason_checklist')
    .update(update)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
