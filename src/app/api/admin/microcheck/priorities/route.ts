import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin }  from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) return null
  const { data: appUser } = await userSb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseAdmin()
  const { data, error } = await db
    .from('microcheck_task_priority')
    .select('task_type, label, sort_order, enabled')
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ priorities: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { priorities: { task_type: string; sort_order: number; enabled: boolean }[] }
  if (!Array.isArray(body.priorities)) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const db = createSupabaseAdmin()
  const updates = body.priorities.map(p =>
    db.from('microcheck_task_priority')
      .update({ sort_order: p.sort_order, enabled: p.enabled })
      .eq('task_type', p.task_type)
  )
  await Promise.all(updates)
  return NextResponse.json({ ok: true })
}
