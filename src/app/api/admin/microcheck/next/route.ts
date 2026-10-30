import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin }  from '@/lib/supabase/service'
import { nextMicrocheckTask }   from '../_next'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: appUser } = await userSb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const gender = (req.nextUrl.searchParams.get('gender') ?? 'M') as 'M' | 'F'
  try {
    return NextResponse.json({ task: await nextMicrocheckTask(createSupabaseAdmin(), gender) })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
