import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gender: 'M' | 'F' = req.nextUrl.searchParams.get('gender') === 'F' ? 'F' : 'M'
  const season = req.nextUrl.searchParams.get('season') ?? '2025-26'
  const db = createSupabaseAdmin()

  const { data, error } = await db
    .from('hammer_score_config')
    .select('id, name, config')
    .eq('gender', gender)
    .eq('season', season)
    .eq('is_active', true)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ row: data ?? null })
}

export async function POST(req: NextRequest) {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { gender, season, name, config } = body as {
    gender: 'M' | 'F'
    season: string
    name: string
    config: unknown
  }

  if (!gender || !season || !config) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = createSupabaseAdmin()

  // Try to update the existing active row first
  const { data: existing } = await db
    .from('hammer_score_config')
    .select('id')
    .eq('gender', gender)
    .eq('season', season)
    .eq('is_active', true)
    .single()

  if (existing?.id) {
    const { error } = await db
      .from('hammer_score_config')
      .update({ name: name ?? 'Default', config })
      .eq('id', existing.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await db
      .from('hammer_score_config')
      .insert({ gender, season, name: name ?? 'Default', is_active: true, config })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
