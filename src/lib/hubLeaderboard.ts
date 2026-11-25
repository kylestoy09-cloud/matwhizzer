// The tournament hub leaderboard, shared by the admin hub (src/app/api/admin/hub/leaderboard) and the public
// Off-Season pieces (src/lib/offseasonPublic.ts). The kids with the most podiums and highest finishes on a hub
// (NJ kids unless all states), with their bout record at the hub's events. A season (keyed like the site) limits it
// to one; none = every season. Each kid's offseason score is their single best result (src/lib/offseasonScore.ts).
// Their weight is the one they wrestled most in the season(s) shown, a tie going to the most recent event (Kyle
// 2026-11-13); on the Offseason Hub every tournament weight counts as the closest NJSIAA weight (122 → 120). Middle
// school weights stay as wrestled. The Middle School Hub's mixed pool is split by side (src/lib/hubSex.ts).
// Notable results: wins over a kid scoring 75+, and losses to one by 1-2 points or in overtime / tiebreakers.
import type { SupabaseClient } from '@supabase/supabase-js'
import { hubTables, CLUBS_TABLE, ordinal, type HubKey, type HubGender } from '@/lib/hub'
import { schoolsOfWrestlers, ratingsOfWrestlers, ratingSeasons } from '@/lib/hubSchools'
import { championRating, placementScore } from '@/lib/offseasonScore'
import { mixedSexOf } from '@/lib/hubSex'
import { WEIGHT_ORDER_BOYS, WEIGHT_ORDER_GIRLS } from '@/lib/hammerScore'

export type HubNotable = { kind: 'win' | 'close loss'; event_id: number; opponent_id: number; opponent: string; opponent_wrestler_id: string | null; opponent_score: number; opponent_from: string | null; result: string; event: string; event_date: string | null; weight: string }
export type HubFinish = { season: number; tournament: string; event_date: string | null; style: string; division: string | null; weight: string; place: number; place_to: number | null }
export type HubLeaderRow = {
  prospect_id: number; name: string; state: string | null; class_year: number | null; club: string | null; sex: string
  score: number; score_from: string | null; events: number; weight: string | null; notable: HubNotable[]
  wrestler: { id: string; name: string; school: string | null; rating: { score: number; season: string; weight: string | null } | null } | null
  titles: number; podiums: number; best: number | null; avg_place: number | null; wins: number; losses: number; finishes: HubFinish[]
  // events wrestled with no placement on file (bouts only)
  wrestled: { event_id: number; season: number; tournament: string; event_date: string | null; weight: string; wins: number; losses: number }[]
}

export async function hubLeaderboard(db: SupabaseClient, gender: HubGender, hub: HubKey, opts: { season: number | null; onlyNj: boolean; sex: 'M' | 'F' | null }): Promise<{ rows: HubLeaderRow[]; unknown_state: number }> {
  const { season, onlyNj, sex } = opts
  const a = { db, gender }
  const T = hubTables(a.gender)

  const { data: ts } = await a.db.from(T.tournaments).select('id, name, champion_rating, division_ratings').eq('hub', hub)
  const tName = new Map((ts ?? []).map(t => [t.id, t.name]))
  const tInfo = new Map((ts ?? []).map(t => [t.id, t]))
  let eq = a.db.from(T.events).select('id, tournament_id, season, label, start_date').in('tournament_id', [...tName.keys()])
  if (season) eq = eq.eq('season', season)
  const { data: evs } = tName.size ? await eq : { data: [] }
  const ev = new Map((evs ?? []).map(e => [e.id, e]))
  const evIds = [...ev.keys()]
  if (!evIds.length) return { rows: [], unknown_state: 0 }

  // every row for these events, 1,000 a page, the pages fetched together once the count is known
  const page = async <R,>(table: string, cols: string) => {
    const { count, error: cErr } = await a.db.from(table).select('*', { count: 'exact', head: true }).in('event_id', evIds)
    if (cErr) throw new Error(cErr.message)
    const pages = await Promise.all(Array.from({ length: Math.ceil((count ?? 0) / 1000) }, (_, i) =>
      a.db.from(table).select(cols).in('event_id', evIds).order('id').range(i * 1000, i * 1000 + 999)))
    const all: R[] = []
    for (const { data, error } of pages) { if (error) throw new Error(error.message); all.push(...((data ?? []) as R[])) }
    return all
  }
  type PlacementRow = { event_id: number; style: string; division: string | null; weight: string; place: number; place_to: number | null; prospect_id: number }
  type BoutRow = { event_id: number; weight: string; winner_prospect_id: number; loser_prospect_id: number; win_type: string | null; score: string | null; round: string | null }
  const [placements, bouts] = await Promise.all([
    page<PlacementRow>(T.placements, 'event_id, style, division, weight, place, place_to, prospect_id'),
    page<BoutRow>(T.bouts, 'event_id, weight, winner_prospect_id, loser_prospect_id, win_type, score, round'),
  ])

  type Agg = { titles: number; podiums: number; best: number; placeSum: number; wins: number; losses: number; score: number; scoreFrom: string | null; girlsDiv: boolean; events: Set<number>; placedAt: Set<number>; wrestledAt: Map<number, string>; rec: Map<number, [number, number]>; finishes: HubFinish[] }
  const agg = new Map<number, Agg>()
  const get = (id: number) => agg.get(id) ?? agg.set(id, { titles: 0, podiums: 0, best: 99, placeSum: 0, wins: 0, losses: 0, score: 0, scoreFrom: null, girlsDiv: false, events: new Set(), placedAt: new Set(), wrestledAt: new Map(), rec: new Map(), finishes: [] }).get(id)!
  for (const p of placements) {
    const g = get(p.prospect_id), e = ev.get(p.event_id)!
    g.events.add(p.event_id); g.placedAt.add(p.event_id)   // the tournaments on our list they wrestled (Kyle 2026-11-13)
    g.wrestledAt.set(p.event_id, p.weight)
    // Podiums are the top 8; deeper (tied) places still show as finishes
    if (p.place <= 8 && !p.place_to) { g.podiums++; g.placeSum += p.place; if (p.place === 1) g.titles++ }
    const sc = placementScore(championRating(tInfo.get(e.tournament_id) ?? { champion_rating: 0 }, p.division), p.place)
    g.best = Math.min(g.best, p.place)
    if (sc > g.score) { g.score = sc; g.scoreFrom = `${tName.get(e.tournament_id) ?? ''} ${p.division ? `${p.division} ` : ''}${p.weight} · ${ordinal(p.place)}` }
    if (/\b(girls?|women)\b/i.test(p.division ?? '')) g.girlsDiv = true
    g.finishes.push({ event_date: (e as { start_date?: string | null }).start_date ?? null, season: e.season, tournament: `${tName.get(e.tournament_id) ?? ''}${e.label ? ` (${e.label})` : ''}`, style: p.style, division: p.division, weight: p.weight, place: p.place, place_to: p.place_to })
  }
  for (const b of bouts) {
    const w = get(b.winner_prospect_id), l = get(b.loser_prospect_id)
    w.wins++; l.losses++; w.events.add(b.event_id); l.events.add(b.event_id)
    for (const k of [w, l]) if (!k.wrestledAt.has(b.event_id)) k.wrestledAt.set(b.event_id, b.weight)
    // the record at each event (a bye isn't a match)
    if (!/^bye/i.test(b.win_type ?? '')) {
      const rw = w.rec.get(b.event_id) ?? [0, 0], rl = l.rec.get(b.event_id) ?? [0, 0]
      w.rec.set(b.event_id, [rw[0] + 1, rw[1]]); l.rec.set(b.event_id, [rl[0], rl[1] + 1])
    }
  }

  // Notable results (Kyle 2026-11-13): wins over a highly rated kid (offseason score 75+), and close losses to one —
  // a decision by 1-2 points, or in overtime / tiebreakers. Forfeits, injury defaults and DQs don't count.
  const NOTABLE = 75
  const noBout = (t: string | null) => /^(ff|for|mff|inj|dq|nc|bye|df|def|med|vfo|vin|vca)/i.test(t ?? '')   // incl. freestyle forfeit / injury / DQ
  const close = (b: { win_type: string | null; score: string | null }) => {
    if (/\b(sv|tb|utb|ot|rt)/i.test(`${b.win_type ?? ''} ${b.score ?? ''}`)) return true
    if (!/^(dec|vpo1?|vpo)/i.test(b.win_type ?? '')) return false
    const m = /(\d+)\s*-\s*(\d+)/.exec(b.score ?? '')
    return !!m && Math.abs(Number(m[1]) - Number(m[2])) <= 2
  }
  type Notable = Omit<HubNotable, 'opponent' | 'opponent_wrestler_id'>
  const notables = new Map<number, Notable[]>()
  for (const b of bouts) {
    if (noBout(b.win_type)) continue
    const e = ev.get(b.event_id); if (!e) continue
    const event = `${tName.get(e.tournament_id) ?? ''} ${hub === 'ms' ? '' : e.season}`.trim()
    const result = [b.win_type, b.score].filter(Boolean).join(' ')
    const wOpp = agg.get(b.loser_prospect_id)?.score ?? 0, lOpp = agg.get(b.winner_prospect_id)?.score ?? 0
    if (wOpp >= NOTABLE) notables.set(b.winner_prospect_id, [...(notables.get(b.winner_prospect_id) ?? []), { kind: 'win', event_id: b.event_id, opponent_id: b.loser_prospect_id, opponent_score: wOpp, opponent_from: agg.get(b.loser_prospect_id)?.scoreFrom ?? null, result, event, event_date: (e as { start_date?: string | null }).start_date ?? null, weight: b.weight }])
    if (lOpp >= NOTABLE && close(b)) notables.set(b.loser_prospect_id, [...(notables.get(b.loser_prospect_id) ?? []), { kind: 'close loss', event_id: b.event_id, opponent_id: b.winner_prospect_id, opponent_score: lOpp, opponent_from: agg.get(b.winner_prospect_id)?.scoreFrom ?? null, result, event, event_date: (e as { start_date?: string | null }).start_date ?? null, weight: b.weight }])
  }
  // opponents' names: one of our wrestlers by their profile name (and id, to link); anyone else as imported, with state
  const oppIds = [...new Set([...notables.values()].flatMap(xs => xs.map(x => x.opponent_id)))]
  const oppName = new Map<number, string>(), oppWrestler = new Map<number, string>()
  const oppChunks = Array.from({ length: Math.ceil(oppIds.length / 500) }, (_, i) => oppIds.slice(i * 500, i * 500 + 500))
  for (const { data } of await Promise.all(oppChunks.map(c => a.db.from(T.prospects).select('id, first_name, last_name, state, wrestler_id').in('id', c)))) {
    for (const o of data ?? []) {
      oppName.set(o.id, `${o.first_name} ${o.last_name}${o.state ? ` (${o.state})` : ''}`)
      if (o.wrestler_id) oppWrestler.set(o.id, o.wrestler_id)
    }
  }
  const oppW = [...new Set(oppWrestler.values())]
  for (let i = 0; i < oppW.length; i += 300) {
    const { data, error } = await a.db.from('wrestlers').select('id, first_name, last_name').in('id', oppW.slice(i, i + 300))
    if (error) throw new Error(error.message)
    const prof = new Map((data ?? []).map(w => [w.id, `${w.first_name} ${w.last_name}`]))
    for (const [pid, wid] of oppWrestler) if (prof.has(wid)) oppName.set(pid, prof.get(wid)!)
  }

  const ids = [...agg.keys()]
  const prospects = new Map<number, { id: number; first_name: string; last_name: string; state: string | null; class_year: number | null; club_id: number | null; club_listed: string | null; wrestler_id: string | null }>()
  const chunks = Array.from({ length: Math.ceil(ids.length / 500) }, (_, i) => ids.slice(i * 500, i * 500 + 500))
  for (const { data } of await Promise.all(chunks.map(c => a.db.from(T.prospects).select('id, first_name, last_name, state, class_year, club_id, club_listed, wrestler_id').in('id', c))))
    for (const p of data ?? []) prospects.set(p.id, p)
  const clubIds = [...new Set([...prospects.values()].map(p => p.club_id).filter(Boolean))] as number[]
  const { data: clubs } = clubIds.length ? await a.db.from(CLUBS_TABLE).select('id, name').in('id', clubIds) : { data: [] }
  const clubName = new Map((clubs ?? []).map(c => [c.id, c.name]))
  const wIds = [...new Set([...prospects.values()].map(p => p.wrestler_id).filter(Boolean))] as string[]
  // in chunks: hundreds of ids don't fit in one request
  const wMap = new Map<string, { id: string; first_name: string; last_name: string; graduation_year: number | null; gender: string; projected_weight_class: number | null }>()
  for (let i = 0; i < wIds.length; i += 300) {
    const { data: ws, error: wErr } = await a.db.from('wrestlers').select('id, first_name, last_name, graduation_year, gender, projected_weight_class').in('id', wIds.slice(i, i + 300))
    if (wErr) throw new Error(wErr.message)
    for (const w of ws ?? []) wMap.set(w.id, w)
  }
  const [school, rating] = await Promise.all([schoolsOfWrestlers(a.db, wIds), ratingsOfWrestlers(a.db, wIds, ratingSeasons())])

  // the weight to list a kid at
  const weights = a.gender === 'F' ? WEIGHT_ORDER_GIRLS : WEIGHT_ORDER_BOYS
  const closest = (n: number) => [...weights].sort((x, y) => Math.abs(x - n) - Math.abs(y - n) || y - x)[0]
  // the weight wrestled most at the events shown; a tie goes to the most recent event
  const evDate = (id: number) => { const e = ev.get(id)!; return (e as { start_date?: string | null }).start_date ?? `${e.season}-01-01` }
  const weightOf = (g: Agg) => {
    const n = new Map<string, { count: number; last: string }>()
    for (const [eventId, raw] of g.wrestledAt) {
      const num = Number.parseInt(raw)
      if (!num) continue
      const w = hub === 'offseason' ? String(closest(num)) : String(num)
      const cur = n.get(w) ?? { count: 0, last: '' }
      n.set(w, { count: cur.count + 1, last: evDate(eventId) > cur.last ? evDate(eventId) : cur.last })
    }
    return [...n].sort((x, y) => y[1].count - x[1].count || y[1].last.localeCompare(x[1].last))[0]?.[0] ?? null
  }
  // the mixed pool's sides, the same everywhere on the Middle School Hub (src/lib/hubSex.ts)
  const sexOf = a.gender === 'X' ? await mixedSexOf(a.db, ids) : null
  const rows = ids.map(id => {
    const p = prospects.get(id)!, g = agg.get(id)!, w = p.wrestler_id ? wMap.get(p.wrestler_id) : null
    return {
      score: g.score, score_from: g.scoreFrom, events: g.events.size, weight: weightOf(g),
      notable: (notables.get(id) ?? []).sort((x, y) => y.opponent_score - x.opponent_score || (x.kind === 'win' ? -1 : 1))
        .map(x => ({ ...x, opponent: oppName.get(x.opponent_id) ?? '', opponent_wrestler_id: oppWrestler.get(x.opponent_id) ?? null })),
      sex: sexOf?.get(id) ?? w?.gender ?? (g.girlsDiv ? 'F' : 'M'),
      prospect_id: id, name: `${p.first_name} ${p.last_name}`, state: p.state,
      class_year: w?.graduation_year ?? p.class_year, club: (p.club_id ? clubName.get(p.club_id) : null) ?? p.club_listed ?? null,
      // linked to a high school wrestler: their school (never the wrestler's name)
      wrestler: w ? { id: w.id, name: `${w.first_name} ${w.last_name}`, school: school.get(w.id) ?? null, rating: rating.get(w.id) ?? null } : null,
      titles: g.titles, podiums: g.podiums, best: g.podiums ? g.best : null,
      avg_place: g.podiums ? Math.round((g.placeSum / g.podiums) * 10) / 10 : null,
      wins: g.wins, losses: g.losses,
      finishes: g.finishes.sort((x, y) => y.season - x.season || x.place - y.place),
      wrestled: [...g.wrestledAt].filter(([eid]) => !g.placedAt.has(eid)).map(([eid, wt]) => {
        const e = ev.get(eid)!
        const [wins, losses] = g.rec.get(eid) ?? [0, 0]
        return { event_id: eid, season: e.season, tournament: `${tName.get(e.tournament_id) ?? ''}${e.label ? ` (${e.label})` : ''}`, event_date: (e as { start_date?: string | null }).start_date ?? null, weight: wt, wins, losses }
      }),
    }
  })
    .filter(r => (!onlyNj || r.state === 'NJ') && (!sex || r.sex === sex))
    .sort((x, y) => y.titles - x.titles || y.podiums - x.podiums || (x.avg_place ?? 99) - (y.avg_place ?? 99) || y.wins - x.wins || x.name.localeCompare(y.name))

  return { rows: rows as HubLeaderRow[], unknown_state: onlyNj ? ids.filter(id => !prospects.get(id)?.state).length : 0 }
}
