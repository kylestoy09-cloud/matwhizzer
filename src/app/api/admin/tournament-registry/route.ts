import { NextRequest, NextResponse } from 'next/server'
import { getWorkingSeason, parseGender } from '@/lib/season-context'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

async function requireAdmin() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// GET /api/admin/tournament-registry?season=<label>&gender=F  (season defaults to the season in progress)
export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const gender = req.nextUrl.searchParams.get('gender') as 'M' | 'F' | null
  const season = req.nextUrl.searchParams.get('season') ?? (await getWorkingSeason(parseGender(gender))).label
  const client = serviceClient()
  let query = client
    .from('tournament_registry')
    .select('*')
    .eq('season', season)
    .order('date_start', { ascending: true, nullsFirst: false })
  if (gender) {
    query = query.in('gender', [gender, 'both'])
  }
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ events: data })
}

// POST /api/admin/tournament-registry  — bulk insert parsed events
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const events = body.events
  if (!Array.isArray(events) || events.length === 0)
    return NextResponse.json({ error: 'No events provided' }, { status: 400 })
  const client = serviceClient()
  const { data, error } = await client
    .from('tournament_registry')
    .insert(events)
    .select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inserted: data?.length ?? 0 })
}

// PATCH /api/admin/tournament-registry  — update a single entry
export async function PATCH(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const allowed = ['name', 'date_start', 'date_end', 'state', 'event_type', 'gender', 'point_value', 'imported', 'in_season_tournament_id', 'notes']
  const patch = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))
  const client = serviceClient()
  const { data, error } = await client
    .from('tournament_registry')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data })
}

// DELETE /api/admin/tournament-registry?id=...
export async function DELETE(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const client = serviceClient()
  const { error } = await client.from('tournament_registry').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
