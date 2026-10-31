import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin }  from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: appUser } = await userSb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = createSupabaseAdmin()

  const { data: logs } = await db
    .from('microcheck_task_log')
    .select('school_id, gender, field, admin_id, completed_at')
    .eq('status', 'cant_find')
    .order('completed_at', { ascending: false })

  if (!logs || logs.length === 0) return NextResponse.json({ entries: [] })

  const schoolIds = [...new Set(logs.map(l => l.school_id))]
  const adminIds  = [...new Set(logs.map(l => l.admin_id))]

  const [schoolsRes, adminsRes] = await Promise.all([
    db.from('schools').select('id, display_name').in('id', schoolIds),
    db.from('app_users').select('id, display_name').in('id', adminIds),
  ])

  const schoolMap = new Map((schoolsRes.data ?? []).map(s => [s.id, s.display_name]))
  const adminMap  = new Map((adminsRes.data ?? []).map(a => [a.id, a.display_name]))

  const entries = logs.map(l => ({
    school_id:    l.school_id,
    school_name:  schoolMap.get(l.school_id) ?? 'Unknown',
    field:        l.field,
    gender:       l.gender,
    completed_at: l.completed_at,
    admin_name:   adminMap.get(l.admin_id) ?? 'Unknown',
  }))

  return NextResponse.json({ entries })
}
