import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: appUser } = await auth.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const status = req.nextUrl.searchParams.get('status') ?? 'open'

  const db = createSupabaseAdmin()
  const { data, error } = await db
    .from('help_desk_tickets')
    .select('*')
    .eq('status', status)
    .order('is_urgent', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tickets: data })
}

export async function POST(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: appUser } = await auth.from('app_users').select('role, display_name').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    description: string
    is_urgent: boolean
    screenshot_urls?: string[]
  }

  if (!body.description?.trim()) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 })
  }

  const urls = (body.screenshot_urls ?? []).slice(0, 3)

  const db = createSupabaseAdmin()
  const { data, error } = await db
    .from('help_desk_tickets')
    .insert({
      description: body.description.trim(),
      is_urgent: body.is_urgent ?? false,
      screenshot_urls: urls,
      submitted_by_email: user.email ?? '',
      submitted_by_name: appUser.display_name ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ticket: data }, { status: 201 })
}
