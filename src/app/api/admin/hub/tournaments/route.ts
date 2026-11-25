// Tournament hub: a hub's tournaments with their years (events): whether each was uploaded (when, from
// which files, per division), how many places and how deep, and the NJ kids — how many took part, the NJ
// podium (top 8) and NJ placed below it. Level (national / regional / state) and champion rating per
// tournament (Kyle 2026-11-12: 90 / 75 / 50 by level).
import { NextRequest, NextResponse } from 'next/server'
import { hubAdmin, bad } from '../_auth'
import { hubTables, isHubKey, HUB_LEVELS } from '@/lib/hub'
import { schoolsOfWrestlers, ratingsOfWrestlers, ratingSeasons } from '@/lib/hubSchools'
import { mixedSexOf } from '@/lib/hubSex'

export const dynamic = 'force-dynamic'

const FIELDS = ['name', 'location', 'time_of_year', 'in_state', 'format', 'platform', 'notes', 'is_active', 'sort_order', 'level', 'champion_rating', 'division_ratings'] as const
const LEVEL_RATING: Record<string, number> = HUB_LEVELS

function checked(row: Record<string, unknown>): string | null {
  if (row.level != null && !(String(row.level) in LEVEL_RATING)) return 'Level is national, regional, state or local'
  if (row.champion_rating != null) {
    const n = Number(row.champion_rating)
    if (!Number.isInteger(n) || n < 0 || n > 100) return 'Champion rating is a whole number from 0 to 100'
    row.champion_rating = n
  }
  if (row.division_ratings != null) {
    // { division: rating }; an empty rating means the division goes back to the tournament's
    if (typeof row.division_ratings !== 'object' || Array.isArray(row.division_ratings)) return 'Division ratings are { division: rating }'
    const out: Record<string, number> = {}
    for (const [d, v] of Object.entries(row.division_ratings as Record<string, unknown>)) {
      if (v === null || v === '') continue
      const n = Number(v)
      if (!Number.isInteger(n) || n < 0 || n > 100) return `${d}: a rating is a whole number from 0 to 100`
      out[d.trim()] = n
    }
    row.division_ratings = out
  }
  return null
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const a = await hubAdmin(sp.get('gender'))
  if (a.error) return a.error
  const hub = sp.get('hub'), id = sp.get('id')
  if (!isHubKey(hub) && !id) return bad('hub must be ms or offseason')
  const T = hubTables(a.gender)

  let q = a.db.from(T.tournaments).select('*').order('sort_order').order('name')
  q = id ? q.eq('id', Number(id)) : q.eq('hub', hub!)
  const { data: tournaments, error } = await q
  if (error) return bad(error.message, 500)
  const ids = (tournaments ?? []).map(t => t.id)

  const { data: events, error: eErr } = ids.length
    ? await a.db.from(T.events).select('id, tournament_id, season, label, start_date, end_date, notes, uploaded_at, upload_files, upload_divisions').in('tournament_id', ids).order('season', { ascending: false })
    : { data: [], error: null }
  if (eErr) return bad(eErr.message, 500)
  const eventIds = (events ?? []).map(e => e.id)

  // Rows per event (places, bouts), how deep it was placed (lowest place, tied groups to their end), and
  // every place / bout's kid, to find the NJ ones
  type Place = { event_id: number; style: string; division: string | null; weight: string; place: number; place_to: number | null; prospect_id: number }
  const placeCount = new Map<number, number>(), boutCount = new Map<number, number>(), deepest = new Map<number, number>()
  const places: Place[] = [], inBouts = new Map<number, Set<number>>()
  const page = async <R,>(table: string, cols: string, each: (r: R) => void) => {
    for (let from = 0; ; from += 1000) {
      const { data, error: cErr } = await a.db.from(table).select(cols).in('event_id', eventIds).order('id').range(from, from + 999)
      if (cErr) throw new Error(cErr.message)
      for (const r of (data ?? []) as R[]) each(r)
      if ((data ?? []).length < 1000) return
    }
  }
  try {
    if (eventIds.length) {
      await page<Place>(T.placements, 'event_id, style, division, weight, place, place_to, prospect_id', r => {
        places.push(r)
        placeCount.set(r.event_id, (placeCount.get(r.event_id) ?? 0) + 1)
        deepest.set(r.event_id, Math.max(deepest.get(r.event_id) ?? 0, r.place_to ?? r.place))
      })
      // bouts: a count per event; the kids in them only for events without places (duals) — an event with places
      // already lists every kid it placed
      await Promise.all(eventIds.map(async id => {
        const { count, error: bErr } = await a.db.from(T.bouts).select('*', { count: 'exact', head: true }).eq('event_id', id)
        if (bErr) throw new Error(bErr.message)
        if (count) boutCount.set(id, count)
      }))
      const boutsOnly = eventIds.filter(id => !placeCount.has(id) && boutCount.has(id))
      for (const id of boutsOnly) {
        for (let from = 0; ; from += 1000) {
          const { data, error: bErr } = await a.db.from(T.bouts).select('winner_prospect_id, loser_prospect_id').eq('event_id', id).order('id').range(from, from + 999)
          if (bErr) throw new Error(bErr.message)
          const s = inBouts.get(id) ?? inBouts.set(id, new Set()).get(id)!
          for (const r of data ?? []) { s.add(r.winner_prospect_id); s.add(r.loser_prospect_id) }
          if ((data ?? []).length < 1000) break
        }
      }
    }
  } catch (e) { return bad((e as Error).message, 500) }

  // The NJ kids among them
  const kidIds = [...new Set([...places.map(p => p.prospect_id), ...[...inBouts.values()].flatMap(s => [...s])])]
  const nj = new Map<number, { name: string; wrestler_id: string | null; club: string | null }>()
  const chunks = Array.from({ length: Math.ceil(kidIds.length / 500) }, (_, i) => kidIds.slice(i * 500, i * 500 + 500))
  const got = await Promise.all(chunks.map(ids => a.db.from(T.prospects).select('id, first_name, last_name, wrestler_id, club_listed').eq('state', 'NJ').in('id', ids)))
  for (const { data, error: pErr } of got) {
    if (pErr) return bad(pErr.message, 500)
    for (const p of data ?? []) nj.set(p.id, { name: `${p.first_name} ${p.last_name}`, wrestler_id: p.wrestler_id, club: p.club_listed })
  }
  // the Middle School Hub's mixed pool: this side's kids only (?sex=M|F)
  const sex = sp.get('sex')
  if (a.gender === 'X' && (sex === 'M' || sex === 'F')) {
    const of = await mixedSexOf(a.db, [...nj.keys()])
    for (const id of [...nj.keys()]) if (of.get(id) !== sex) nj.delete(id)
  }
  let school: Map<string, string>, rating: Awaited<ReturnType<typeof ratingsOfWrestlers>>
  try {
    const wIds = [...new Set([...nj.values()].map(p => p.wrestler_id).filter(Boolean))] as string[]
    ;[school, rating] = await Promise.all([schoolsOfWrestlers(a.db, wIds), ratingsOfWrestlers(a.db, wIds, ratingSeasons())])
  } catch (e) { return bad((e as Error).message, 500) }
  const njOf = (eventId: number) => {
    const rows = places.filter(p => p.event_id === eventId && nj.has(p.prospect_id))
      .map(p => { const k = nj.get(p.prospect_id)!; return { name: k.name, from: (k.wrestler_id ? school.get(k.wrestler_id) : null) ?? k.club, rating: k.wrestler_id ? rating.get(k.wrestler_id) ?? null : null, division: p.division, weight: p.weight, style: p.style, place: p.place, place_to: p.place_to } })
      .sort((x, y) => x.place - y.place || (x.place_to ?? 0) - (y.place_to ?? 0) || Number.parseInt(x.weight) - Number.parseInt(y.weight))
    const kids = new Set([...places.filter(p => p.event_id === eventId).map(p => p.prospect_id), ...(inBouts.get(eventId) ?? [])].filter(id => nj.has(id)))
    return { competed: kids.size, podium: rows.filter(r => r.place <= 8 && !r.place_to), placed: rows.filter(r => r.place > 8 || r.place_to) }
  }

  return NextResponse.json({
    tournaments: (tournaments ?? []).map(t => ({
      ...t,
      events: (events ?? []).filter(e => e.tournament_id === t.id).map(e => ({
        ...e, placements: placeCount.get(e.id) ?? 0, bouts: boutCount.get(e.id) ?? 0, placed_through: deepest.get(e.id) ?? null, nj: njOf(e.id),
      })),
    })),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const a = await hubAdmin(body?.gender)
  if (a.error) return a.error
  if (!isHubKey(body.hub)) return bad('hub must be ms or offseason')
  const name = String(body.name ?? '').trim()
  if (!name) return bad('A name is required')
  const row: Record<string, unknown> = { hub: body.hub, name }
  for (const f of FIELDS) if (f !== 'name' && body[f] !== undefined) row[f] = typeof body[f] === 'string' ? body[f].trim() || null : body[f]
  const bad1 = checked(row)
  if (bad1) return bad(bad1)
  if (row.level && row.champion_rating == null) row.champion_rating = LEVEL_RATING[String(row.level)]
  const { data, error } = await a.db.from(hubTables(a.gender).tournaments).insert(row).select('*').single()
  if (error) return bad(error.code === '23505' ? 'That tournament is already on this hub' : error.message, error.code === '23505' ? 409 : 500)
  return NextResponse.json({ tournament: { ...data, events: [] } }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const a = await hubAdmin(body?.gender)
  if (a.error) return a.error
  const id = Number(body.id)
  if (!id) return bad('id is required')
  const patch: Record<string, unknown> = {}
  for (const f of FIELDS) if (body[f] !== undefined) patch[f] = typeof body[f] === 'string' ? body[f].trim() || null : body[f]
  if ('name' in patch && !patch.name) return bad('A name is required')
  const bad1 = checked(patch)
  if (bad1) return bad(bad1)
  if (!Object.keys(patch).length) return bad('Nothing to change')
  const { data, error } = await a.db.from(hubTables(a.gender).tournaments).update(patch).eq('id', id).select('*').single()
  if (error) return bad(error.code === '23505' ? 'That tournament is already on this hub' : error.message, error.code === '23505' ? 409 : 500)
  return NextResponse.json({ tournament: data })
}
