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

export async function GET(req: NextRequest) {
  const user = await authCheck()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ?gender=M|F: that gender's events plus combined (MF) events
  const g = req.nextUrl.searchParams.get('gender')
  const client = serviceClient()
  let query = client
    .from('ms_tournaments')
    .select(`
      id, name, season, date, gender, notes, created_at,
      tier:ms_tournament_tiers ( id, name, credit_1, credit_2, credit_3, credit_4, credit_5, credit_6, credit_7, credit_8 ),
      ms_placements ( count )
    `)
    .order('season', { ascending: false })
    .order('date', { ascending: false })
  if (g === 'M' || g === 'F') query = query.in('gender', [g, 'MF'])
  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = (data ?? []).map(t => ({
    ...t,
    placement_count: (t.ms_placements as { count: number }[])?.[0]?.count ?? 0,
    ms_placements: undefined,
  }))

  return NextResponse.json({ tournaments: result })
}

export async function POST(req: NextRequest) {
  const user = await authCheck()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    .insert({
      name: (name as string).trim(),
      tier_id: Number(tier_id),
      season: season as string,
      date: date || null,
      gender: gender as string,
      notes: (notes as string | undefined)?.trim() || null,
    })
    .select(`
      id, name, season, date, gender, notes, created_at,
      tier:ms_tournament_tiers ( id, name, credit_1, credit_2, credit_3, credit_4, credit_5, credit_6, credit_7, credit_8 )
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tournament: { ...data, placement_count: 0 } }, { status: 201 })
}
