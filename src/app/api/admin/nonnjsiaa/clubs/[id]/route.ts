import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

async function authCheck() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authCheck()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const name = (body.name as string | undefined)?.trim()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const client = serviceClient()
  const { data, error } = await client
    .from('nonnjsiaa_clubs')
    .update({
      name,
      abbreviation: (body.abbreviation as string | undefined)?.trim() || null,
      location:     (body.location     as string | undefined)?.trim() || null,
      notes:        (body.notes        as string | undefined)?.trim() || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'A club with that name already exists' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ club: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authCheck()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const client = serviceClient()

  // Block delete if any placements are linked to this club
  const [{ count: msCount }, { count: hsCount }] = await Promise.all([
    client.from('ms_placements').select('id', { count: 'exact', head: true }).eq('club_id', id),
    client.from('hs_offseason_placements').select('id', { count: 'exact', head: true }).eq('club_id', id),
  ])
  const total = (msCount ?? 0) + (hsCount ?? 0)
  if (total > 0) {
    return NextResponse.json(
      { error: `Cannot delete — ${total} placement${total !== 1 ? 's' : ''} are linked to this club` },
      { status: 409 },
    )
  }

  const { error } = await client.from('nonnjsiaa_clubs').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
