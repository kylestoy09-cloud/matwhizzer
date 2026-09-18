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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: idStr } = await params
  const id = Number(idStr)
  if (!id || isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  let fields: Record<string, string | null>
  try {
    const body = await req.json()
    fields = {}
    if (body.name     !== undefined) fields.name   = body.name?.trim() || null
    if (body.season   !== undefined) fields.season = body.season?.trim() || null
    if (body.date     !== undefined) fields.date   = body.date?.trim() || null
    if (body.gender   !== undefined) fields.gender = body.gender?.trim() || null
    if (body.notes    !== undefined) fields.notes  = body.notes?.trim() || null
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (fields.gender && !['M', 'F', 'MF'].includes(fields.gender)) {
    return NextResponse.json({ error: 'gender must be M, F, or MF' }, { status: 400 })
  }

  const client = serviceClient()
  const { data, error } = await client
    .from('hs_offseason_tournaments')
    .update(fields)
    .eq('id', id)
    .select('id, name, season, date, gender, notes')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tournament: data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: idStr } = await params
  const id = Number(idStr)
  if (!id || isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const client = serviceClient()

  const { count } = await client
    .from('hs_offseason_placements')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', id)

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Cannot delete — ${count} placement${count !== 1 ? 's' : ''} exist. Delete placements first or use Replace on import.` },
      { status: 409 },
    )
  }

  const { error } = await client.from('hs_offseason_tournaments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
