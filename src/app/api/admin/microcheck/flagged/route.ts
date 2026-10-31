import { NextRequest, NextResponse } from 'next/server'
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

  const [flagRes, schoolRes] = await Promise.all([
    db.from('microcheck_roster_flags').select('school_id, suspect_count, resolved, gender').order('suspect_count', { ascending: false }),
    db.from('schools').select('id, display_name'),
  ])

  if (flagRes.error) return NextResponse.json({ error: flagRes.error.message }, { status: 500 })

  const nameMap = new Map((schoolRes.data ?? []).map(s => [s.id, s.display_name]))

  const flags = (flagRes.data ?? []).map(f => ({
    school_id:     f.school_id,
    school_name:   nameMap.get(f.school_id) ?? `School ${f.school_id}`,
    gender:        String(f.gender).trim(),
    suspect_count: f.suspect_count,
    resolved:      f.resolved,
  }))

  return NextResponse.json({ flags })
}

// PATCH — mark a school resolved
export async function PATCH(req: NextRequest) {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: appUser } = await userSb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { school_id, gender, resolved } = await req.json() as { school_id: number; gender: 'M' | 'F'; resolved: boolean }
  if (!school_id || (gender !== 'M' && gender !== 'F')) return NextResponse.json({ error: 'school_id and gender required' }, { status: 400 })

  const db = createSupabaseAdmin()
  const { error } = await db
    .from('microcheck_roster_flags')
    .update({ resolved })
    .eq('school_id', school_id)
    .eq('gender', gender)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
