import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const MAX_BLURB = 600

// PATCH { blurb } — save the Whizzer Resume Rating bio shown on the leaderboards
export async function PATCH(req: NextRequest) {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: appUser } = await userSb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { blurb } = await req.json() as { blurb?: string }
  const text = (blurb ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return NextResponse.json({ error: 'The bio cannot be empty' }, { status: 400 })
  if (text.length > MAX_BLURB) return NextResponse.json({ error: `Keep it under ${MAX_BLURB} characters` }, { status: 400 })

  const { error } = await createSupabaseAdmin().from('rating_settings')
    .upsert({ key: 'blurb', value: text, updated_at: new Date().toISOString(), updated_by: user.email ?? null })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Show it on the leaderboards now, not at the next refresh
  revalidatePath('/boys/leaderboards')
  revalidatePath('/girls/leaderboards')
  return NextResponse.json({ ok: true, blurb: text })
}
