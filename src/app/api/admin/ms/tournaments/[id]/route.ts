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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authCheck()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const client = serviceClient()

  const { data, error } = await client
    .from('ms_placements')
    .select(`
      id, wrestler_name, school_name, weight_class, place, created_at,
      hs_wrestler:wrestlers ( id, first_name, last_name )
    `)
    .eq('ms_tournament_id', id)
    .order('weight_class', { ascending: true })
    .order('place', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ placements: data ?? [] })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authCheck()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const { name, tier_id, season, date, gender, notes } = body

  if (!name || typeof name !== 'string' || !name.trim())
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!tier_id)
    return NextResponse.json({ error: 'tier_id is required' }, { status: 400 })
  if (!season || typeof season !== 'string')
    return NextResponse.json({ error: 'season is required' }, { status: 400 })
  if (!gender || !['M', 'F', 'MF'].includes(gender as string))
    return NextResponse.json({ error: 'gender must be M, F, or MF' }, { status: 400 })

  const client = serviceClient()
  const { data, error } = await client
    .from('ms_tournaments')
    .update({
      name: (name as string).trim(),
      tier_id: Number(tier_id),
      season: season as string,
      date: date || null,
      gender: gender as string,
      notes: (notes as string | undefined)?.trim() || null,
    })
    .eq('id', id)
    .select(`
      id, name, season, date, gender, notes, created_at,
      tier:ms_tournament_tiers ( id, name, credit_1, credit_2, credit_3, credit_4, credit_5, credit_6, credit_7, credit_8 )
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tournament: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authCheck()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const client = serviceClient()

  const { count } = await client
    .from('ms_placements')
    .select('id', { count: 'exact', head: true })
    .eq('ms_tournament_id', id)

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Cannot delete — ${count} placement${count !== 1 ? 's' : ''} exist for this tournament. Delete placements first.` },
      { status: 409 },
    )
  }

  const { error } = await client.from('ms_tournaments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
