// Tournament hub: the seasons a tournament ran (one event per season; a label splits two runs in a season).
// The offseason season is a calendar year; middle school runs June–May, keyed by its ending year. A start
// date must fall in its season.
import { NextRequest, NextResponse } from 'next/server'
import { hubAdmin, bad } from '../_auth'
import { hubTables, hubSeasonOfDate, hubSeasonLabel, type HubKey } from '@/lib/hub'

export const dynamic = 'force-dynamic'

const clean = (v: unknown) => (typeof v === 'string' ? v.trim() || null : v ?? null)
const validSeason = (s: unknown) => Number.isInteger(s) && (s as number) >= 2000 && (s as number) <= 2100
// A date must fall in its season: the offseason is a calendar year, middle school runs June through May
function dateOutsideSeason(hub: HubKey, date: unknown, season: number): string | null {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const s = hubSeasonOfDate(hub, date)
  return s === season ? null : `${date} falls in ${hubSeasonLabel(hub, s)}, not ${hubSeasonLabel(hub, season)}`
}
async function hubOf(db: { from: (t: string) => any }, table: string, tournamentId: number): Promise<HubKey | null> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data } = await db.from(table).select('hub').eq('id', tournamentId).maybeSingle()
  return (data?.hub as HubKey | undefined) ?? null
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const a = await hubAdmin(body?.gender)
  if (a.error) return a.error
  const tournament_id = Number(body.tournament_id), season = Number(body.season)
  if (!tournament_id) return bad('tournament_id is required')
  if (!validSeason(season)) return bad('season is a year: the offseason year, or the year a middle school season ends')
  const hub = await hubOf(a.db, hubTables(a.gender).tournaments, tournament_id)
  if (!hub) return bad('That tournament was not found', 404)
  const off = dateOutsideSeason(hub, clean(body.start_date), season)
  if (off) return bad(off)
  const row = { tournament_id, season, label: clean(body.label), start_date: clean(body.start_date), end_date: clean(body.end_date), notes: clean(body.notes) }
  const { data, error } = await a.db.from(hubTables(a.gender).events).insert(row).select('*').single()
  if (error) return bad(error.code === '23505' ? 'That year is already listed (add a label such as "Fall" to list a second run)' : error.message, error.code === '23505' ? 409 : 500)
  return NextResponse.json({ event: { ...data, placements: 0, bouts: 0 } }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const a = await hubAdmin(body?.gender)
  if (a.error) return a.error
  const id = Number(body.id)
  if (!id) return bad('id is required')
  const patch: Record<string, unknown> = {}
  for (const f of ['label', 'start_date', 'end_date', 'notes']) if (body[f] !== undefined) patch[f] = clean(body[f])
  if (body.season !== undefined) {
    if (!validSeason(Number(body.season))) return bad('season is a year: the offseason year, or the year a middle school season ends')
    patch.season = Number(body.season)
  }
  if (patch.start_date || patch.season) {
    const { data: cur } = await a.db.from(hubTables(a.gender).events).select('season, start_date, tournament_id').eq('id', id).maybeSingle()
    if (!cur) return bad('Not found', 404)
    const hub = await hubOf(a.db, hubTables(a.gender).tournaments, cur.tournament_id)
    if (!hub) return bad('That tournament was not found', 404)
    const off = dateOutsideSeason(hub, patch.start_date ?? cur.start_date, (patch.season as number) ?? cur.season)
    if (off) return bad(off)
  }
  const { data, error } = await a.db.from(hubTables(a.gender).events).update(patch).eq('id', id).select('*').single()
  if (error) return bad(error.code === '23505' ? 'That year is already listed' : error.message, error.code === '23505' ? 409 : 500)
  return NextResponse.json({ event: data })
}

// Removing a year is only for one entered by mistake: refused while it holds any podium or bout.
export async function DELETE(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const a = await hubAdmin(sp.get('gender'))
  if (a.error) return a.error
  const id = Number(sp.get('id'))
  if (!id) return bad('id is required')
  const T = hubTables(a.gender)
  const [p, b] = await Promise.all([
    a.db.from(T.placements).select('id', { count: 'exact', head: true }).eq('event_id', id),
    a.db.from(T.bouts).select('id', { count: 'exact', head: true }).eq('event_id', id),
  ])
  if (p.error || b.error) return bad((p.error ?? b.error)!.message, 500)
  if ((p.count ?? 0) || (b.count ?? 0)) return bad(`This year has ${p.count ?? 0} podium places and ${b.count ?? 0} bouts; it can't be removed`, 409)
  const { error } = await a.db.from(T.events).delete().eq('id', id)
  if (error) return bad(error.message, 500)
  return NextResponse.json({ ok: true })
}
