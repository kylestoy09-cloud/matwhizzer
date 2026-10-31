import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin }  from '@/lib/supabase/service'
import { nextMicrocheckTask }   from '../_next'

export const dynamic = 'force-dynamic'

// ?skip=<claim key>,... — tasks passed over this session
export async function GET(req: NextRequest) {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: appUser } = await userSb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // One queue for boys and girls: the task carries its own gender
  try {
    return NextResponse.json({ task: await nextMicrocheckTask(createSupabaseAdmin(), user.id, new Set((req.nextUrl.searchParams.get('skip') ?? '').split(',').filter(Boolean))) })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
