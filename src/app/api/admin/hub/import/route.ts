// Tournament hub import: a pasted podium or bout list for one year of a tournament.
// preview: parse, then for each kid offer who they are — a prospect already on file, a high school
//   wrestler in our system, or a new prospect. Only exact name matches are offered; a single match is
//   filled in, several are left to choose (Kyle confirms every one).
// save: create the new prospects (a high school wrestler gets a prospect linked to them), then the rows.
import { NextRequest, NextResponse } from 'next/server'
import { hubAdmin, bad } from '../_auth'
import { WEIGHT_ORDER_BOYS, WEIGHT_ORDER_GIRLS } from '@/lib/hammerScore'
import { otherForms } from '@/lib/nicknames'
import { hubTables, hubSeasonLabel, isHubStyle, parsePodiums, parseBouts, splitName, nameKey, clubKey, CLUBS_TABLE, type PodiumRow, type BoutRow } from '@/lib/hub'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

type Db = Awaited<ReturnType<typeof hubAdmin>> extends infer A ? A extends { db: infer D } ? D : never : never
type Person = { key: string; name: string; club: string | null; state: string | null; class_year: number | null; weights: number[]; youth: boolean }
export type HubChoice =
  | { type: 'prospect'; id: number }
  | { type: 'wrestler'; id: string }
  | { type: 'new' }
export type PersonResolution = { choice: HubChoice; state: string | null; club_id: number | null }

const personKey = (name: string, club: string | null) => {
  const n = splitName(name)
  return `${nameKey(n.first_name, n.last_name)}|${clubKey(club ?? '')}`
}

function peopleOf(kind: 'podium' | 'bouts', rows: (PodiumRow | BoutRow)[]): Person[] {
  const out = new Map<string, Person>()
  const add = (name: string, club: string | null, state: string | null, class_year: number | null = null, weight = '', division: string | null = null) => {
    const key = personKey(name, club ?? state)   // with no club, the state tells two same-named kids apart
    const p = out.get(key) ?? out.set(key, { key, name, club, state, class_year, weights: [], youth: false }).get(key)!
    if (!p.state && state) p.state = state
    if (!p.class_year && class_year) p.class_year = class_year
    const n = Number.parseInt(weight); if (n) p.weights.push(n)
    if (/\b(14|12|11|10|8) ?U\b/i.test(division ?? '')) p.youth = true
  }
  for (const r of rows) {
    if (kind === 'podium') { const p = r as PodiumRow; add(p.name, p.club, p.state, p.class_year ?? null, p.weight, p.division) }
    else { const b = r as BoutRow; add(b.winner, b.winner_club, null, null, b.weight, b.division); add(b.loser, b.loser_club, null, null, b.weight, b.division) }
  }
  return [...out.values()]
}

async function pageAll<T>(q: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const all: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await q(from, from + 999)
    if (error) throw new Error(error.message)
    all.push(...(data ?? []))
    if ((data ?? []).length < 1000) return all
  }
}

async function loadClubs(db: Db) {
  const clubs = await pageAll<{ id: number; name: string; state: string; aliases: string[] }>((f, t) => db.from(CLUBS_TABLE).select('id, name, state, aliases').order('id').range(f, t))
  const byKey = new Map<string, { id: number; name: string; state: string }>()
  for (const c of clubs) for (const n of [c.name, ...(c.aliases ?? [])]) byKey.set(clubKey(n), c)
  return byKey
}

function parse(kind: unknown, text: unknown) {
  if (typeof text !== 'string' || !text.trim()) return { error: 'Paste the results first' }
  if (kind === 'podium') return parsePodiums(text)
  if (kind === 'bouts') return parseBouts(text)
  return { error: 'kind must be podium or bouts' }
}

// A single place is taken once; a tied group (9th–12th) holds several kids, so it's one per kid
const dupKey = (r: { division: string | null; weight: string; place: number; place_to?: number | null; name?: string }) =>
  `${(r.division ?? '').toLowerCase()}|${r.weight.toLowerCase()}|${r.place}${r.place_to ? `|${(r.name ?? '').toLowerCase()}` : ''}`

async function podiumClashes(db: Db, table: string, eventId: number, style: string, rows: PodiumRow[]) {
  const { data, error } = await db.from(table).select('style, division, weight, place, place_to, name_listed').eq('event_id', eventId)
  if (error) throw new Error(error.message)
  const taken = new Set((data ?? []).map((r: { style: string; division: string | null; weight: string; place: number; place_to: number | null; name_listed: string }) => `${r.style}|${dupKey({ ...r, name: r.name_listed })}`))
  const seen = new Set<string>(), clashes: string[] = []
  for (const r of rows) {
    const k = `${r.style ?? style}|${dupKey(r)}`
    const label = `${r.division ? r.division + ' ' : ''}${r.weight} place ${r.place}${r.place_to ? `–${r.place_to} (${r.name})` : ''}`
    if (taken.has(k)) clashes.push(`${label} is already loaded`)
    else if (seen.has(k)) clashes.push(`${label} is listed twice`)
    seen.add(k)
  }
  return clashes
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const a = await hubAdmin(body?.gender)
  if (a.error) return a.error
  const { db, gender } = a
  const T = hubTables(gender)
  const eventId = Number(body.event_id), kind = body.kind as 'podium' | 'bouts', style = body.style
  if (!eventId) return bad('event_id is required')
  if (!isHubStyle(style)) return bad('style must be folkstyle or freestyle')
  const { data: event } = await db.from(T.events).select('id, season, start_date').eq('id', eventId).maybeSingle()
  if (!event) return bad('That year was not found', 404)
  const parsed = parse(kind, body.text)
  if ('error' in parsed) return bad(parsed.error!)
  if (!parsed.rows.length) return NextResponse.json({ rows: [], skipped: parsed.skipped, people: [], clashes: [] })

  try {
    const clashes = kind === 'podium' ? await podiumClashes(db, T.placements, eventId, style, parsed.rows as PodiumRow[]) : []
    if (body.action === 'save') return await save(db, gender, T, eventId, kind, style, parsed.rows, body.people ?? {}, clashes, uploadOf(body.upload))
    return NextResponse.json({ ...parsed, clashes, people: await preview(db, gender, T, kind, parsed.rows, event.start_date ?? `${event.season}-03-01`) })
  } catch (e) {
    return bad((e as Error).message, 500)
  }
}

// What an upload was made from, kept on the event so the list shows it was uploaded (and from what)
type Upload = { files: string[]; divisions: { division: string; style: string; weights: number; places: number; placed_through: number }[] }
function uploadOf(u: unknown): Upload {
  const x = (u ?? {}) as Partial<Upload>
  return {
    files: Array.isArray(x.files) ? x.files.map(String).slice(0, 50) : [],
    divisions: Array.isArray(x.divisions) ? x.divisions.slice(0, 200).map(d => ({ division: String(d.division), style: String(d.style), weights: Number(d.weights) || 0, places: Number(d.places) || 0, placed_through: Number(d.placed_through) || 0 })) : [],
  }
}

async function recordUpload(db: Db, T: ReturnType<typeof hubTables>, eventId: number, up: Upload) {
  const { data: ev } = await db.from(T.events).select('upload_files, upload_divisions').eq('id', eventId).single()
  const files = [...new Set([...((ev?.upload_files as string[] | null) ?? []), ...(up.files.length ? up.files : ['pasted list'])])]
  // a division uploaded again replaces its earlier line
  const prev = ((ev?.upload_divisions as Upload['divisions'] | null) ?? []).filter(d => !up.divisions.some(n => n.division === d.division && n.style === d.style))
  await db.from(T.events).update({ uploaded_at: new Date().toISOString(), upload_files: files, upload_divisions: [...prev, ...up.divisions] }).eq('id', eventId)
}

async function preview(db: Db, gender: 'M' | 'F' | 'X', T: ReturnType<typeof hubTables>, kind: 'podium' | 'bouts', rows: (PodiumRow | BoutRow)[], eventDate: string) {
  const people = peopleOf(kind, rows)
  const clubs = await loadClubs(db)

  const prospects = await pageAll<{ id: number; first_name: string; last_name: string; state: string | null; class_year: number | null; club_id: number | null; wrestler_id: string | null }>(
    (f, t) => db.from(T.prospects).select('id, first_name, last_name, state, class_year, club_id, wrestler_id').order('id').range(f, t))
  const prospectsByName = new Map<string, typeof prospects>()
  for (const p of prospects) {
    const k = nameKey(p.first_name, p.last_name)
    prospectsByName.set(k, [...(prospectsByName.get(k) ?? []), p])
  }

  const wrestlers = await pageAll<{ id: string; first_name: string; last_name: string; graduation_year: number | null; is_oos: boolean }>(
    (f, t) => { const q = db.from('wrestlers').select('id, first_name, last_name, graduation_year, is_oos'); return (gender === 'X' ? q : q.eq('gender', gender)).order('id').range(f, t) })   // mixed pool: either side
  const wrestlersByName = new Map<string, typeof wrestlers>()
  for (const w of wrestlers) {
    const k = nameKey(w.first_name, w.last_name)
    wrestlersByName.set(k, [...(wrestlersByName.get(k) ?? []), w])
  }
  const wById = new Map(wrestlers.map(w => [w.id, w]))
  // A name as written at a school (name links) also counts as an exact match
  const listed = [...new Set(people.map(p => p.name.trim()))]
  const aliasHits = new Map<string, Set<string>>()
  for (let i = 0; i < listed.length; i += 200) {
    const { data } = await db.from('wrestler_name_aliases').select('raw_name, wrestler_id').in('raw_name', listed.slice(i, i + 200))
    for (const r of data ?? []) if (wById.has(r.wrestler_id)) aliasHits.set(r.raw_name, (aliasHits.get(r.raw_name) ?? new Set()).add(r.wrestler_id))
  }

  // Finishes on file for the prospects offered, and schools for the wrestlers offered
  const candidateWrestlers = new Set<string>()
  const candidateProspects = new Set<number>()
  const nickIds = new Map<string, Set<string>>()
  const matched = people.map(p => {
    const n = splitName(p.name), k = nameKey(n.first_name, n.last_name)
    const ps = prospectsByName.get(k) ?? []
    const ws = [...new Set([...(wrestlersByName.get(k) ?? []).map(w => w.id), ...(aliasHits.get(p.name.trim()) ?? [])])]
      .map(id => wById.get(id)!).filter(w => !ps.some(x => x.wrestler_id === w.id))
    // the same last name under another form of the first name ("Zach" / "Zachary"): offered, never filled in
    const nick = otherForms(n.first_name).flatMap(f => wrestlersByName.get(nameKey(f, n.last_name)) ?? [])
      .filter(w => !ws.some(x => x.id === w.id) && !ps.some(x => x.wrestler_id === w.id))
    nick.forEach(w => candidateWrestlers.add(w.id))
    ws.push(...nick)
    nickIds.set(p.key, new Set(nick.map(w => w.id)))
    ps.forEach(x => candidateProspects.add(x.id)); ws.forEach(w => candidateWrestlers.add(w.id))
    return { p, ps, ws }
  })

  const schoolsOf = new Map<string, Set<number>>()
  const ids = [...candidateWrestlers]
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await db.from('wrestler_name_aliases').select('wrestler_id, school_id').in('wrestler_id', ids.slice(i, i + 300))
    for (const r of data ?? []) schoolsOf.set(r.wrestler_id, (schoolsOf.get(r.wrestler_id) ?? new Set()).add(r.school_id))
  }
  const schoolIds = [...new Set([...schoolsOf.values()].flatMap(s => [...s]))]
  const schoolName = new Map<number, string>()
  for (let i = 0; i < schoolIds.length; i += 300) {
    const { data } = await db.from('schools').select('id, display_name').in('id', schoolIds.slice(i, i + 300))
    for (const s of data ?? []) schoolName.set(s.id, s.display_name)
  }
  const finishes = new Map<number, string[]>()
  const pIds = [...candidateProspects]
  if (pIds.length) {
    const { data: pl } = await db.from(T.placements).select('prospect_id, place, weight, event_id').in('prospect_id', pIds)
    const evIds = [...new Set((pl ?? []).map(r => r.event_id))]
    const { data: evs } = evIds.length ? await db.from(T.events).select('id, season, tournament_id').in('id', evIds) : { data: [] }
    const tIds = [...new Set((evs ?? []).map(e => e.tournament_id))]
    const { data: ts } = tIds.length ? await db.from(T.tournaments).select('id, name, hub').in('id', tIds) : { data: [] }
    const evMap = new Map((evs ?? []).map(e => [e.id, e])), tMap = new Map((ts ?? []).map(t => [t.id, t.name])), hMap = new Map((ts ?? []).map(t => [t.id, t.hub]))
    for (const r of pl ?? []) {
      const e = evMap.get(r.event_id)
      finishes.set(r.prospect_id, [...(finishes.get(r.prospect_id) ?? []), `${e ? hubSeasonLabel(hMap.get(e.tournament_id) ?? 'ms', e.season) : ''} ${tMap.get(e?.tournament_id) ?? ''}: ${r.place} @ ${r.weight}`])
    }
  }
  const clubById = new Map([...clubs.values()].map(c => [c.id, c]))
  // each candidate wrestler's most recent weight (their newest rating row), and the school year today is in
  const lastWeight = new Map<string, number>()
  const linkedIds = [...new Set([...candidateWrestlers, ...prospects.filter(x => candidateProspects.has(x.id) && x.wrestler_id).map(x => x.wrestler_id!)])]
  for (let i = 0; i < linkedIds.length; i += 300) {
    const { data } = await db.from('wrestler_hammer_scores').select('wrestler_id, season, weight_class').in('wrestler_id', linkedIds.slice(i, i + 300)).order('season')
    for (const r of data ?? []) { const n = Number(r.weight_class); if (n) lastWeight.set(r.wrestler_id, n) }
  }
  // the school year the event falls in (from July): a kid's grade then is 12 minus the years left to their class
  const [ey, em] = eventDate.split('-').map(Number), schoolYearEnd = em >= 7 ? ey + 1 : ey

  const out = matched.map(({ p, ps, ws }) => {
    const club = p.club ? clubs.get(clubKey(p.club)) ?? null : null
    // Offer one of our wrestlers only when it fits (Kyle 2026-11-12): an NJ kid → an NJ wrestler; an
    // out-of-state kid → our out-of-state wrestler at a school in that state; never in the middle school
    // pool. The rest stay listed as options to pick by hand.
    const states = (w: { id: string }) => [...(schoolsOf.get(w.id) ?? [])].map(s => /\(([A-Z]{2})\)\s*$/.exec(schoolName.get(s) ?? '')?.[1] ?? 'NJ')
    // ...and only when this result could be theirs (Kyle 2026-11-13, after names linked a 14U 90-pounder to a
    // 190-pound junior): not 3+ weight classes below their last weight, not a youth division past 9th grade
    const couldBe = (wId: string) => {
      const last = lastWeight.get(wId), list = gender === 'F' ? WEIGHT_ORDER_GIRLS : WEIGHT_ORDER_BOYS
      const idx = (n: number) => list.indexOf([...list].sort((a, b) => Math.abs(a - n) - Math.abs(b - n) || b - a)[0])
      if (last && p.weights.length && Math.min(...p.weights.map(idx)) <= list.indexOf(last as never) - 3) return false
      const cls = wById.get(wId)?.graduation_year
      if (p.youth && cls && 12 - (cls - schoolYearEnd) > 9) return false
      return true
    }
    const fits = (w: { id: string; is_oos: boolean }) => gender !== 'X' && couldBe(w.id) && (!p.state || p.state === 'NJ' ? !w.is_oos : w.is_oos && states(w).includes(p.state))
    const good = ws.filter(fits).filter(w => !nickIds.get(p.key)?.has(w.id))
    const nickOffered = ws.some(w => nickIds.get(p.key)?.has(w.id) && fits(w))
    const suggestion: HubChoice | null =
      ps.length === 1 && (!ps[0].wrestler_id || couldBe(ps[0].wrestler_id)) ? { type: 'prospect', id: ps[0].id }
      : ps.length === 1 ? null
      : ps.length === 0 && good.length === 1 ? { type: 'wrestler', id: good[0].id }
      : ps.length === 0 && good.length === 0 && !nickOffered ? { type: 'new' }
      : null
    const sp = suggestion?.type === 'prospect' ? ps[0] : null
    const sw = suggestion?.type === 'wrestler' ? good[0] : null
    return {
      // a match made on the name alone (no state, no known club), for the team check below
      nameOnly: sw && !p.state && !club ? { schools: [...(schoolsOf.get(sw.id) ?? [])].map(s => schoolName.get(s) ?? '') } : null,
      key: p.key, name: p.name, club_listed: p.club,
      club: club ? { id: club.id, name: club.name, state: club.state } : null,
      state: p.state ?? club?.state ?? sp?.state ?? (sw && !sw.is_oos ? 'NJ' : null),
      suggestion,
      prospects: ps.map(x => ({
        id: x.id, name: `${x.first_name} ${x.last_name}`, state: x.state, class_year: x.class_year,
        club: x.club_id ? clubById.get(x.club_id)?.name ?? null : null,
        wrestler: x.wrestler_id && wById.has(x.wrestler_id) ? `${wById.get(x.wrestler_id)!.first_name} ${wById.get(x.wrestler_id)!.last_name}` : null,
        finishes: finishes.get(x.id) ?? [],
      })),
      wrestlers: ws.map(w => ({
        id: w.id, name: `${w.first_name} ${w.last_name}`, class_year: w.graduation_year, is_oos: w.is_oos,
        schools: [...(schoolsOf.get(w.id) ?? [])].map(s => schoolName.get(s)).filter(Boolean),
      })),
    }
  })
  // A name-only match stands when the kid's team has 2+ of them (a New Jersey team) or carries the wrestler's school
  // in its name; a lone one on another team is left to choose (Kyle 2026-11-13: VA26 Elite's Cole Wilson had been
  // offered our Manchester Township Cole Wilson)
  const perTeam = new Map<string, number>()
  for (const x of out) if (x.nameOnly && x.club_listed) perTeam.set(clubKey(x.club_listed), (perTeam.get(clubKey(x.club_listed)) ?? 0) + 1)
  return out.map(({ nameOnly, ...x }) => {
    const team = x.club_listed ?? ''
    const lone = nameOnly && team && (perTeam.get(clubKey(team)) ?? 0) < 2 && !nameOnly.schools.some(sc => sc && team.toLowerCase().includes(sc.toLowerCase()))
    return lone ? { ...x, suggestion: null, state: null } : x
  })
}

async function save(
  db: Db, gender: 'M' | 'F' | 'X', T: ReturnType<typeof hubTables>, eventId: number, kind: 'podium' | 'bouts', style: string,
  rows: (PodiumRow | BoutRow)[], resolutions: Record<string, PersonResolution>, clashes: string[], upload: Upload,
) {
  if (clashes.length) return bad(`Nothing saved: ${clashes.slice(0, 5).join('; ')}${clashes.length > 5 ? ` (+${clashes.length - 5} more)` : ''}`, 409)
  const people = peopleOf(kind, rows)
  const missing = people.filter(p => !resolutions[p.key]?.choice)
  if (missing.length) return bad(`Choose who ${missing.length === 1 ? 'this kid is' : `these ${missing.length} kids are`} first: ${missing.slice(0, 5).map(p => p.name).join(', ')}`)
  const clubs = await loadClubs(db)
  const state = (s: unknown) => (typeof s === 'string' && /^[A-Za-z]{2}$/.test(s.trim()) ? s.trim().toUpperCase() : null)

  // Wrestlers chosen: reuse the prospect already linked to them, if any
  const wIds = [...new Set(people.map(p => resolutions[p.key].choice).filter(c => c.type === 'wrestler').map(c => (c as { id: string }).id))]
  const linked = new Map<string, number>()
  const wInfo = new Map<string, { first_name: string; last_name: string; graduation_year: number | null; is_oos: boolean }>()
  if (wIds.length) {
    const [{ data: lp }, { data: ws }] = await Promise.all([
      db.from(T.prospects).select('id, wrestler_id').in('wrestler_id', wIds),
      db.from('wrestlers').select('id, first_name, last_name, graduation_year, is_oos, gender').in('id', wIds),
    ])
    for (const r of lp ?? []) linked.set(r.wrestler_id, r.id)
    for (const w of ws ?? []) {
      if (gender !== 'X' && w.gender !== gender) return bad(`${w.first_name} ${w.last_name} is on the other side`)
      wInfo.set(w.id, w)
    }
  }

  const prospectOf = new Map<string, number>()
  let created = 0, linkedCount = 0
  for (const p of people) {
    const r = resolutions[p.key]
    const club_id = r.club_id ?? (p.club ? clubs.get(clubKey(p.club))?.id ?? null : null)
    const st = state(r.state)
    if (r.choice.type === 'prospect') {
      const { data: cur } = await db.from(T.prospects).select('id, state, club_id, club_listed, class_year').eq('id', r.choice.id).maybeSingle()
      if (!cur) return bad(`Prospect ${r.choice.id} was not found`)
      const fill: Record<string, unknown> = {}
      if (!cur.state && st) fill.state = st
      if (!cur.class_year && p.class_year) fill.class_year = p.class_year
      if (!cur.club_id && club_id) fill.club_id = club_id
      if (!cur.club_listed && p.club) fill.club_listed = p.club
      if (Object.keys(fill).length) await db.from(T.prospects).update(fill).eq('id', cur.id)
      prospectOf.set(p.key, cur.id)
    } else if (r.choice.type === 'wrestler') {
      const w = wInfo.get(r.choice.id)
      if (!w) return bad(`Wrestler ${r.choice.id} was not found`)
      let id = linked.get(r.choice.id)
      if (!id) {
        const { data, error } = await db.from(T.prospects).insert({
          first_name: w.first_name, last_name: w.last_name, state: st ?? (w.is_oos ? null : 'NJ'), club_id, club_listed: p.club,
          class_year: w.graduation_year, wrestler_id: r.choice.id,
        }).select('id').single()
        if (error) return bad(error.message, 500)
        id = data.id as number
        linked.set(r.choice.id, id)
        linkedCount++
      }
      prospectOf.set(p.key, id)
    } else {
      const n = splitName(p.name)
      const { data, error } = await db.from(T.prospects).insert({ ...n, state: st, club_id, club_listed: p.club, class_year: p.class_year }).select('id').single()
      if (error) return bad(error.message, 500)
      prospectOf.set(p.key, data.id as number)
      created++
    }
  }

  const clubIdOf = (club: string | null) => (club ? clubs.get(clubKey(club))?.id ?? null : null)
  if (kind === 'podium') {
    const ins = (rows as PodiumRow[]).map(r => ({
      event_id: eventId, style: r.style ?? style, division: r.division, weight: r.weight, place: r.place, place_to: r.place_to,
      name_listed: r.name, club_listed: r.club, club_id: resolutions[personKey(r.name, r.club ?? r.state)].club_id ?? clubIdOf(r.club),
      prospect_id: prospectOf.get(personKey(r.name, r.club ?? r.state))!,
    }))
    const { error } = await db.from(T.placements).insert(ins)
    if (error) return bad(`Prospects were saved but the podium was not: ${error.message}`, 500)
    await recordUpload(db, T, eventId, upload)
    return NextResponse.json({ saved: ins.length, prospects_created: created, prospects_linked: linkedCount })
  }

  // Bouts: one already loaded (same weight, round, winner and loser) is skipped
  const { data: have } = await db.from(T.bouts).select('weight, round, winner_prospect_id, loser_prospect_id').eq('event_id', eventId).eq('style', style)
  const k = (b: { weight: string; round: string | null; winner_prospect_id: number; loser_prospect_id: number }) => `${b.weight}|${b.round ?? ''}|${b.winner_prospect_id}|${b.loser_prospect_id}`
  const seen = new Set((have ?? []).map(k))
  const ins = []
  let dup = 0
  for (const r of rows as BoutRow[]) {
    const b = {
      event_id: eventId, style, division: r.division, weight: r.weight, bout_date: r.date, round: r.round,
      winner_listed: r.winner, winner_club_listed: r.winner_club, winner_prospect_id: prospectOf.get(personKey(r.winner, r.winner_club))!,
      loser_listed: r.loser, loser_club_listed: r.loser_club, loser_prospect_id: prospectOf.get(personKey(r.loser, r.loser_club))!,
      win_type: r.win_type, score: r.score,
    }
    if (seen.has(k(b))) { dup++; continue }
    seen.add(k(b))
    ins.push(b)
  }
  for (let i = 0; i < ins.length; i += 500) {
    const { error } = await db.from(T.bouts).insert(ins.slice(i, i + 500))
    if (error) return bad(`Prospects were saved; bouts stopped after ${i}: ${error.message}`, 500)
  }
  await recordUpload(db, T, eventId, upload)
  return NextResponse.json({ saved: ins.length, duplicates_skipped: dup, prospects_created: created, prospects_linked: linkedCount })
}
