import { NextRequest, NextResponse } from 'next/server'
import { getWorkingSeason, parseGender } from '@/lib/season-context'
import { createClient } from '@supabase/supabase-js'
import { getAdminUser } from '@/lib/auth/isAdminUser'
import { applySlate, matchSlate, previousSeasonLabel, seasonTournaments, type SlateEvent, type SlateLink } from '@/lib/tournamentSlate'

export const dynamic = 'force-dynamic'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

// The signed-in admin, or null (signing in is not enough: fans have accounts)
const requireAdmin = getAdminUser

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

// POST /api/admin/tournament-registry — the season's schedule paste (src/lib/tournamentSlate.ts)
//   { action: 'match', gender, season, events }  each event's tournament in our system: this season's, else last
//                                                 season's (picked when sure, suggested when close), else new
//   { gender, season, rows: [{ event, link }] }   saves them: registry rows linked to this season's tournaments,
//                                                 created (last season's settings copied) where needed
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const g = body.gender === 'M' || body.gender === 'F' ? body.gender as 'M' | 'F' : null
  const season = typeof body.season === 'string' && /^\d{4}-\d{2}$/.test(body.season) ? body.season : null
  if (!g || !season) return NextResponse.json({ error: 'gender and season required' }, { status: 400 })
  const client = serviceClient()
  try {
    if (body.action === 'match') {
      const events = (Array.isArray(body.events) ? body.events : []) as SlateEvent[]
      const [current, prior] = await Promise.all([seasonTournaments(client, g, season), seasonTournaments(client, g, previousSeasonLabel(season))])
      const slim = (ts: { id: string; name: string; start_date: string | null }[]) => ts.map(t => ({ id: t.id, name: t.name, start_date: t.start_date }))
      return NextResponse.json({ matches: matchSlate(events, current, prior), current: slim(current), prior: slim(prior) })
    }
    const rows = (Array.isArray(body.rows) ? body.rows : []) as { event: SlateEvent; link: SlateLink }[]
    if (!rows.length) return NextResponse.json({ error: 'No events provided' }, { status: 400 })
    return NextResponse.json(await applySlate(client, g, season, rows))
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
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
