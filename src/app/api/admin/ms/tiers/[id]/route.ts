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

  const { name, description, credit_1, credit_2, credit_3, credit_4, credit_5, credit_6, credit_7, credit_8 } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const client = serviceClient()
  const { data, error } = await client
    .from('ms_tournament_tiers')
    .update({
      name: (name as string).trim(),
      description: description ?? null,
      credit_1: credit_1 ?? null,
      credit_2: credit_2 ?? null,
      credit_3: credit_3 ?? null,
      credit_4: credit_4 ?? null,
      credit_5: credit_5 ?? null,
      credit_6: credit_6 ?? null,
      credit_7: credit_7 ?? null,
      credit_8: credit_8 ?? null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tier: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authCheck()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const client = serviceClient()

  // Block deletion if any tournaments reference this tier
  const { count } = await client
    .from('ms_tournaments')
    .select('id', { count: 'exact', head: true })
    .eq('tier_id', id)

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Cannot delete — ${count} tournament${count !== 1 ? 's' : ''} use this tier. Reassign them first.` },
      { status: 409 },
    )
  }

  const { error } = await client.from('ms_tournament_tiers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
