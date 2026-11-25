// A tournament's history across its years (Kyle 2026-11-20: "the in season tournament pages need a history tab with all
// the records we can track for a tournament including backside warriors, multi time champs and multi time podiums").
// The years: every edition linked through prior_id (back and forward) plus any with the same name. From them: each
// year's podium, multi-time champions, multi-time placers, and the most consolation wins ("backside warriors" — Kyle:
// most consolation wins), career at the tournament and in one year. Names from profiles; schools from school records.
import type { SupabaseClient } from '@supabase/supabase-js'
import { roundStep } from '@/lib/boutOrder'
import { fullBracket } from '@/lib/boutBracket'

export type SeriesYear = { id: string; season: string; name: string; hasBracket?: boolean; oos?: boolean }
export type Placer = { season: string; weight: number; place: number; wrestlerId: string | null; name: string; schoolId: number | null; school: string | null; nj: boolean }
export type Tally = { wrestlerId: string; name: string; school: string | null; count: number; detail: string; nj: boolean }
export type SeriesHistory = { years: SeriesYear[]; placers: Placer[]; multiChamps: Tally[]; multiPlacers: Tally[]; consCareer: Tally[]; consSeason: (Tally & { season: string })[] }

const isConsolation = (round: string) => roundStep(round) >= 100 && roundStep(round) < 200   // C1… CSF, 3rd / 5th / 7th place

async function all<T>(q: (from: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await q(f)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

export async function seriesHistory(db: SupabaseClient, tournamentId: string, gender: 'M' | 'F'): Promise<SeriesHistory> {
  const table = gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'
  const boutTable = gender === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts'
  const { data: me } = await db.from(table).select('id, name, season, prior_id, is_oos, tournament_type').eq('id', tournamentId).maybeSingle()
  if (!me) return { years: [], placers: [], multiChamps: [], multiPlacers: [], consCareer: [], consSeason: [] }
  // the editions: same name, plus the prior_id chain both ways (a renamed year)
  const sameName = await all<{ id: string; name: string; season: string; prior_id: string | null }>(f => db.from(table).select('id, name, season, prior_id, is_oos, tournament_type').eq('name', me.name).order('id').range(f, f + 999))
  const byId = new Map(sameName.map(e => [e.id, e]))
  byId.set(me.id, me)
  for (let hop = 0, cur = me as { prior_id: string | null }; cur.prior_id && hop < 60; hop++) {
    const { data: p } = await db.from(table).select('id, name, season, prior_id, is_oos, tournament_type').eq('id', cur.prior_id).maybeSingle()
    if (!p || byId.has(p.id)) break
    byId.set(p.id, p); cur = p
  }
  for (let hop = 0, frontier = [...byId.keys()]; frontier.length && hop < 60; hop++) {
    const { data: next } = await db.from(table).select('id, name, season, prior_id, is_oos, tournament_type').in('prior_id', frontier)
    frontier = (next ?? []).filter(n => !byId.has(n.id)).map(n => n.id)
    for (const n of next ?? []) byId.set(n.id, n)
  }
  const years: SeriesYear[] = [...byId.values()].map(e => ({ id: e.id, season: e.season, name: e.name, oos: !!(e as { is_oos?: boolean | null }).is_oos || (e as { tournament_type?: string | null }).tournament_type === 'outside' })).sort((a, b) => b.season.localeCompare(a.season))
  const ids = years.map(y => y.id)
  const seasonOf = new Map(years.map(y => [y.id, y.season]))

  // podiums
  type PRow = { in_season_tournament_id: string; weight_class: number; place: number; wrestler_id: string | null; school_id: number | null; w: { first_name: string; last_name: string } | null; s: { display_name: string; is_nj: boolean | null } | null }
  const pl: PRow[] = []
  for (let i = 0; i < ids.length; i += 30) pl.push(...await all<PRow>(f => db.from('tournament_placements')
    .select('in_season_tournament_id, weight_class, place, wrestler_id, school_id, w:wrestlers!wrestler_id(first_name, last_name), s:schools!school_id(display_name, is_nj)')
    .in('in_season_tournament_id', ids.slice(i, i + 30)).order('id').range(f, f + 999) as never))
  const placers: Placer[] = pl.map(p => ({
    season: seasonOf.get(p.in_season_tournament_id)!, weight: p.weight_class, place: p.place, wrestlerId: p.wrestler_id,
    name: p.w ? `${p.w.first_name} ${p.w.last_name}` : 'Unknown', schoolId: p.school_id, school: p.s?.display_name ?? null, nj: p.s?.is_nj === true,
  }))

  // multi-time champions and placers (by profile)
  const group = (rows: Placer[]) => {
    const m = new Map<string, Placer[]>()
    for (const r of rows) if (r.wrestlerId) (m.get(r.wrestlerId) ?? m.set(r.wrestlerId, []).get(r.wrestlerId)!).push(r)
    return [...m.values()].filter(v => new Set(v.map(x => x.season)).size >= 2)
  }
  const tally = (v: Placer[], detail: (x: Placer) => string): Tally => {
    const sorted = [...v].sort((a, b) => a.season.localeCompare(b.season))
    return { wrestlerId: v[0].wrestlerId!, name: v[0].name, school: sorted[sorted.length - 1].school, nj: sorted[sorted.length - 1].nj, count: new Set(v.map(x => x.season)).size, detail: sorted.map(detail).join(' · ') }
  }
  const multiChamps = group(placers.filter(p => p.place === 1)).map(v => tally(v, x => `${x.season.slice(0, 4)} (${x.weight})`)).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const multiPlacers = group(placers).map(v => tally(v, x => `${x.season.slice(0, 4)} ${ord(x.place)}`)).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

  // consolation wins (the winner is wrestler 1 or 2 by the bout's winner field)
  type BRow = { in_season_tournament_id: string; weight_class: string | number | null; round: string; winner: number | null; wrestler1_id: string | null; wrestler2_id: string | null; wrestler1_school_id: number | null; wrestler2_school_id: number | null }
  const bouts: BRow[] = []
  for (let i = 0; i < ids.length; i += 10) bouts.push(...await all<BRow>(f => db.from(boutTable).select('in_season_tournament_id, weight_class, round, winner, wrestler1_id, wrestler2_id, wrestler1_school_id, wrestler2_school_id')
    .in('in_season_tournament_id', ids.slice(i, i + 10)).order('id').range(f, f + 999) as never))
  // a year whose bouts make full brackets gets its Bracket link (src/lib/boutBracket.ts fullBracket)
  for (const y of years) y.hasBracket = fullBracket(bouts.filter(b => b.in_season_tournament_id === y.id), !!y.oos)
  const consWins = new Map<string, Map<string, number>>()   // wrestler → season → wins
  // each wrestler's school at this tournament, latest year first (for a leader who never placed)
  const boutSchool = new Map<string, { season: string; school: number }>()
  for (const b of bouts) for (const [w, sc] of [[b.wrestler1_id, b.wrestler1_school_id], [b.wrestler2_id, b.wrestler2_school_id]] as const) {
    if (!w || !sc) continue
    const s = seasonOf.get(b.in_season_tournament_id)!, had = boutSchool.get(w)
    if (!had || s > had.season) boutSchool.set(w, { season: s, school: sc })
  }
  for (const b of bouts) {
    if (!isConsolation((b.round ?? '').trim())) continue
    const w = b.winner === 1 ? b.wrestler1_id : b.winner === 2 ? b.wrestler2_id : null
    if (!w) continue
    const m = consWins.get(w) ?? consWins.set(w, new Map()).get(w)!
    const s = seasonOf.get(b.in_season_tournament_id)!
    m.set(s, (m.get(s) ?? 0) + 1)
  }
  const topCareer = [...consWins].map(([id, m]) => ({ id, total: [...m.values()].reduce((a, b) => a + b, 0), m })).sort((a, b) => b.total - a.total).slice(0, 200)
  const topSeason = [...consWins].flatMap(([id, m]) => [...m].map(([season, n]) => ({ id, season, n }))).sort((a, b) => b.n - a.n).slice(0, 200)
  const people = [...new Set([...topCareer.map(x => x.id), ...topSeason.map(x => x.id)])]
  const names = new Map<string, string>()
  for (let i = 0; i < people.length; i += 200) {
    const { data } = await db.from('wrestlers').select('id, first_name, last_name').in('id', people.slice(i, i + 200))
    for (const w of data ?? []) names.set(w.id, `${w.first_name} ${w.last_name}`)
  }
  // a wrestler's school at this tournament: from their placements, else their bouts
  const needSchools = [...new Set(people.map(id => boutSchool.get(id)?.school).filter((x): x is number => x != null))]
  const schoolName = new Map<number, string>(), schoolNj = new Map<number, boolean>()
  for (let i = 0; i < needSchools.length; i += 200) {
    const { data } = await db.from('schools').select('id, display_name, is_nj').in('id', needSchools.slice(i, i + 200))
    for (const s of data ?? []) { schoolName.set(s.id, s.display_name); schoolNj.set(s.id, s.is_nj === true) }
  }
  const schoolOf = (id: string) => placers.filter(p => p.wrestlerId === id).sort((a, b) => b.season.localeCompare(a.season))[0]?.school
    ?? (boutSchool.get(id) ? schoolName.get(boutSchool.get(id)!.school) ?? null : null)
  const njOf = (id: string) => { const p = placers.filter(x => x.wrestlerId === id).sort((a, b) => b.season.localeCompare(a.season))[0]
    return p ? p.nj : schoolNj.get(boutSchool.get(id)?.school ?? -1) ?? false }
  const consCareer: Tally[] = topCareer.map(x => ({ wrestlerId: x.id, nj: njOf(x.id), name: names.get(x.id) ?? 'Unknown', school: schoolOf(x.id), count: x.total, detail: [...x.m].sort((a, b) => a[0].localeCompare(b[0])).map(([s, n]) => `${s.slice(0, 4)}: ${n}`).join(' · ') }))
  const consSeason = topSeason.map(x => ({ wrestlerId: x.id, nj: njOf(x.id), name: names.get(x.id) ?? 'Unknown', school: schoolOf(x.id), count: x.n, season: x.season, detail: x.season }))
  return { years, placers, multiChamps, multiPlacers, consCareer, consSeason }
}

export const ord = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
