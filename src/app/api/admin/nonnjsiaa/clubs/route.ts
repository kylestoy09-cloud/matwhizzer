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

export async function GET() {
  const user = await authCheck()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = serviceClient()
  const { data, error } = await client
    .from('nonnjsiaa_clubs')
    .select(`
      id, name, abbreviation, location, notes, created_at,
      ms_placements(count),
      hs_offseason_placements(count)
    `)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const clubs = (data ?? []).map((c: Record<string, unknown>) => ({
    id: c.id,
    name: c.name,
    abbreviation: c.abbreviation,
    location: c.location,
    notes: c.notes,
    created_at: c.created_at,
    ms_placement_count:       (c.ms_placements as { count: number }[])?.[0]?.count ?? 0,
    hs_placement_count:       (c.hs_offseason_placements as { count: number }[])?.[0]?.count ?? 0,
  }))

  return NextResponse.json({ clubs })
}

export async function POST(req: NextRequest) {
  const user = await authCheck()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const name = (body.name as string | undefined)?.trim()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const client = serviceClient()
  const { data, error } = await client
    .from('nonnjsiaa_clubs')
    .insert({
      name,
      abbreviation: (body.abbreviation as string | undefined)?.trim() || null,
      location:     (body.location     as string | undefined)?.trim() || null,
      notes:        (body.notes        as string | undefined)?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'A club with that name already exists' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ club: data }, { status: 201 })
}
