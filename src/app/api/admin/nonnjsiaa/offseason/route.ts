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

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = serviceClient()
  const season = req.nextUrl.searchParams.get('season') ?? null

  let query = client
    .from('hs_offseason_tournaments')
    .select(`
      id, name, season, date, gender, notes,
      placement_count:hs_offseason_placements(count)
    `)
    .order('date', { ascending: false, nullsFirst: false })
    .order('name', { ascending: true })

  if (season) query = query.eq('season', season)
  // ?gender=M|F: that gender's events plus combined (MF) events
  const g = req.nextUrl.searchParams.get('gender')
  if (g === 'M' || g === 'F') query = query.in('gender', [g, 'MF'])

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tournaments = (data ?? []).map((t: Record<string, unknown>) => ({
    ...t,
    placement_count: (t.placement_count as { count: number }[])?.[0]?.count ?? 0,
  }))

  return NextResponse.json({ tournaments })
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let name: string, season: string, gender: string
  let date: string | null, notes: string | null
  try {
    const body = await req.json()
    name   = body.name?.trim()
    season = body.season?.trim()
    gender = body.gender?.trim()
    date   = body.date?.trim() || null
    notes  = body.notes?.trim() || null
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!name)   return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!season) return NextResponse.json({ error: 'season is required' }, { status: 400 })
  if (!['M', 'F', 'MF'].includes(gender)) return NextResponse.json({ error: 'gender must be M, F, or MF' }, { status: 400 })

  const client = serviceClient()
  const { data, error } = await client
    .from('hs_offseason_tournaments')
    .insert({ name, season, gender, date, notes })
    .select('id, name, season, date, gender, notes')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tournament: { ...data, placement_count: 0 } }, { status: 201 })
}
