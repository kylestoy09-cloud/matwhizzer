// College results for the public site (Kyle 2026-11-17: "track things like pins techs wins podiums … create college
// profiles and list out the nj wrestlers with results at that school"). Read from {g}_college_entries (matched to one
// of our wrestlers: 'auto' or 'confirmed') and {g}_college_bouts (src/lib/ncaa/parse.ts readers).
// A year's record is shown as fact only when it ends the way a bracket must (champion unbeaten, runner-up one loss,
// a non-placer out after two, 6th / 8th up to three); otherwise `complete` is false and the page marks it — some
// bracket sheets (2000s printouts, the 2015 file printed before the finals) didn't give every bout.
import type { SupabaseClient } from '@supabase/supabase-js'

export type Side = 'M' | 'F'
export type College = { id: number; name: string; primary_color: string | null; secondary_color: string | null; city?: string | null; state?: string | null; conference?: string | null; mascot?: string | null }
export type CollegeBout = { won: boolean; opponent: string; opponent_id?: string | null; opponent_college: string; result: string | null; type: string | null; fall_secs: number | null; round: string | null }

// rounds (src/lib/ncaa/parse.ts), named like the high school brackets; in the order they're wrestled (sessions)
export const COLLEGE_ROUND_LABEL: Record<string, string> = {
  pigtail: 'Pigtail', r1: 'Round 1', r2: 'Round 2', qf: 'Quarterfinal', sf: 'Semifinal', f: 'Final',
  cpig: 'Cons. Pigtail', c1: 'Cons. R1', c2: 'Cons. R2', c3: 'Cons. R3', c4: 'Cons. R4', cqf: 'Cons. Quarters', csf: 'Cons. Semis',
  '3rd': '3rd Place', '5th': '5th Place', '7th': '7th Place',
}
const SESSION_ORDER = ['pigtail', 'r1', 'cpig', 'r2', 'c1', 'qf', 'c2', 'c3', 'sf', 'c4', 'cqf', 'csf', '7th', '5th', '3rd', 'f']
/** The wrestleback side: consolation rounds and the 3rd / 5th / 7th place bouts */
export const isConsRound = (r: string | null) => r != null && (r.startsWith('c') || ['3rd', '5th', '7th'].includes(r))
export type CollegeYear = {
  entry_id: number; year: number; level: string; weight: number; seed: number | null; place: number | null
  college: College | null; college_raw: string; wins: number; losses: number; falls: number; techs: number; majors: number; consWins: number
  complete: boolean; bouts: CollegeBout[]
}
export type CareerTotals = { years: number; wins: number; losses: number; falls: number; techs: number; majors: number; consWins: number; aa: number; titles: number; best: number | null; complete: boolean }

const MATCHED = ['auto', 'confirmed']

/** The championships a side's college results come from, as stored on {g}_college_events.level, with the tab name the
 *  site shows (Kyle 2026-11-17: boys DI, DII, DIII, NAIA — Juco dropped 2026-11-18, too much; girls NCWWC and NAIA — plus the NCAA's own women's
 *  championship, first held in 2026) */
export const COLLEGE_LEVELS: Record<Side, { level: string; tab: string; full: string }[]> = {
  M: [
    { level: 'NCAA DI', tab: 'DI', full: 'NCAA Division I' }, { level: 'NCAA DII', tab: 'DII', full: 'NCAA Division II' },
    { level: 'NCAA DIII', tab: 'DIII', full: 'NCAA Division III' }, { level: 'NAIA', tab: 'NAIA', full: 'NAIA' },
  ],
  F: [{ level: 'NCWWC', tab: 'NCWWC', full: 'NCWWC' }, { level: 'NAIA', tab: 'NAIA', full: 'NAIA' }, { level: 'NCAA', tab: 'NCAA', full: 'NCAA' }],
}
export const levelFull = (g: Side, level: string) => COLLEGE_LEVELS[g].find(l => l.level === level)?.full ?? level
/** A level's short tab name (DI, DIII, NAIA, NCWWC …) on either side's list — for chips that don't know the side */
export const levelTab = (level: string) => [...COLLEGE_LEVELS.M, ...COLLEGE_LEVELS.F].find(l => l.level === level)?.tab ?? level
export const levelFullAny = (level: string) => [...COLLEGE_LEVELS.M, ...COLLEGE_LEVELS.F].find(l => l.level === level)?.full ?? level
export const collegeTablesOf = (g: Side) => ({
  events: g === 'F' ? 'girls_college_events' : 'boys_college_events',
  entries: g === 'F' ? 'girls_college_entries' : 'boys_college_entries',
  bouts: g === 'F' ? 'girls_college_bouts' : 'boys_college_bouts',
})

/** Does a year's record end the way a bracket must? */
export function recordComplete(place: number | null, w: number, l: number): boolean {
  if (place === 1) return l === 0 && w >= 5
  if (place === 2) return l === 1 && w >= 4
  if (place === 3 || place === 5 || place === 7) return l >= 1 && l <= 2 && w >= 3
  if (place === 4 || place === 6 || place === 8) return l >= 2 && l <= 3 && w >= 3
  return l === 2 || (l === 1 && w === 0)   // out after two; or one loss and a medical forfeit out
}

export function careerTotals(years: CollegeYear[]): CareerTotals {
  const placed = years.filter(y => y.place != null).map(y => y.place!)
  return {
    years: years.length,
    wins: years.reduce((s, y) => s + y.wins, 0), losses: years.reduce((s, y) => s + y.losses, 0),
    falls: years.reduce((s, y) => s + y.falls, 0), techs: years.reduce((s, y) => s + y.techs, 0), majors: years.reduce((s, y) => s + y.majors, 0),
    consWins: years.reduce((s, y) => s + y.consWins, 0),
    aa: placed.length, titles: placed.filter(p => p === 1).length, best: placed.length ? Math.min(...placed) : null,
    complete: years.every(y => y.complete),
  }
}

type EntryRow = { id: number; weight: number; seed: number | null; place: number | null; name: string; wrestler_id: string | null; college_raw: string; college: College | null; event: { year: number; level: string } }
type BoutRow = { id: number; winner_entry_id: number; loser_entry_id: number | null; result_raw: string | null; result_type: string | null; fall_secs: number | null; round?: string | null }

async function pages<T>(q: (from: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let f = 0; ; f += 1000) { const { data, error } = await q(f); if (error) throw new Error(error.message); const d = (data ?? []) as T[]; out.push(...d); if (d.length < 1000) break }
  return out
}

/** Years for a set of entries, with their bouts and opponents */
async function buildYears(db: SupabaseClient, g: Side, entries: EntryRow[]): Promise<CollegeYear[]> {
  if (!entries.length) return []
  const T = collegeTablesOf(g), ids = entries.map(e => e.id)
  const bouts: BoutRow[] = []
  for (let i = 0; i < ids.length; i += 150) {
    const chunk = ids.slice(i, i + 150), cols = '*'   // (round arrives with 20261117_college_details_rounds.sql)
    const [w, l] = await Promise.all([
      pages<BoutRow>(f => db.from(T.bouts).select(cols).in('winner_entry_id', chunk).order('id').range(f, f + 999)),
      pages<BoutRow>(f => db.from(T.bouts).select(cols).in('loser_entry_id', chunk).order('id').range(f, f + 999)),
    ])
    bouts.push(...w, ...l)
  }
  const oppIds = [...new Set(bouts.flatMap(b => [b.winner_entry_id, b.loser_entry_id]).filter((x): x is number => x != null && !ids.includes(x)))]
  const opp = new Map<number, { name: string; college_raw: string; college: { name: string } | null; wrestler_id?: string | null; match_status?: string }>()
  for (let i = 0; i < oppIds.length; i += 300) {
    const { data } = await db.from(T.entries).select('id, name, college_raw, wrestler_id, match_status, college:colleges(name)').in('id', oppIds.slice(i, i + 300))
    for (const o of (data ?? []) as unknown as { id: number; name: string; college_raw: string; college: { name: string } | null; wrestler_id: string | null; match_status: string }[]) opp.set(o.id, o)
  }
  const self = new Map(entries.map(e => [e.id, e]))
  return entries.map(e => {
    // in the order wrestled (by round when every bout has one, else as read); a bout between two listed wrestlers appears once
    const mine = [...new Map(bouts.filter(b => b.winner_entry_id === e.id || b.loser_entry_id === e.id).map(b => [b.id, b])).values()]
    const at = (b: BoutRow) => SESSION_ORDER.indexOf(b.round ?? '')
    mine.sort(mine.every(b => at(b) >= 0) ? (a, b) => at(a) - at(b) : (a, b) => a.id - b.id)
    const list: CollegeBout[] = mine.map(b => {
      const won = b.winner_entry_id === e.id, oid = won ? b.loser_entry_id : b.winner_entry_id
      const o = oid != null ? opp.get(oid) ?? self.get(oid) : undefined
      // an opponent matched to one of our wrestlers opens his profile (Kyle 2026-11-19: every name clickable)
      const oe = oid != null ? opp.get(oid) : undefined
      const opponent_id = oe && oe.wrestler_id && MATCHED.includes(oe.match_status ?? '') ? oe.wrestler_id : oid != null && self.get(oid)?.wrestler_id ? self.get(oid)!.wrestler_id : null
      return { won, opponent: o?.name ?? 'Unknown', opponent_id, opponent_college: o?.college?.name ?? 'TBD', result: b.result_raw, type: b.result_type, fall_secs: b.fall_secs, round: b.round ?? null }
    })
    const w = list.filter(b => b.won)
    const wins = w.length, losses = list.length - wins
    return {
      entry_id: e.id, year: e.event.year, level: e.event.level, weight: e.weight, seed: e.seed, place: e.place,
      college: e.college, college_raw: e.college_raw, wins, losses,
      falls: w.filter(b => b.type === 'fall').length, techs: w.filter(b => b.type === 'tf').length, majors: w.filter(b => b.type === 'md').length, consWins: w.filter(b => isConsRound(b.round)).length,
      complete: recordComplete(e.place, wins, losses), bouts: list,
    }
  }).sort((a, b) => a.year - b.year)
}

const ENTRY_COLS = 'id, weight, seed, place, name, wrestler_id, college_raw, college:colleges(*), event:EVENTS!inner(year, level)'

/** One of our wrestlers' college years (empty for most) */
export async function collegeCareer(db: SupabaseClient, g: Side, wrestlerId: string): Promise<CollegeYear[]> {
  const T = collegeTablesOf(g)
  const { data, error } = await db.from(T.entries).select(ENTRY_COLS.replace('EVENTS', T.events)).eq('wrestler_id', wrestlerId).in('match_status', MATCHED)
  if (error) return []   // before the college migrations: no college section
  return buildYears(db, g, (data ?? []) as unknown as EntryRow[])
}

export type CollegeRosterRow = { wrestler_id: string; name: string; hs: { id: number; name: string } | null; years: CollegeYear[]; totals: CareerTotals }

/** A college's NJ wrestlers, each with his years there */
export async function collegeNjRoster(db: SupabaseClient, g: Side, collegeId: number): Promise<CollegeRosterRow[]> {
  const T = collegeTablesOf(g)
  const rows = await pages<EntryRow>(f => db.from(T.entries).select(ENTRY_COLS.replace('EVENTS', T.events)).eq('college_id', collegeId).in('match_status', MATCHED).not('wrestler_id', 'is', null).order('id').range(f, f + 999))
  const years = await buildYears(db, g, rows)
  const byW = new Map<string, CollegeYear[]>()
  const wid = new Map(rows.map(r => [r.id, r.wrestler_id!]))
  for (const y of years) { const k = wid.get(y.entry_id)!; byW.set(k, [...(byW.get(k) ?? []), y]) }
  const ids = [...byW.keys()]
  const names = new Map<string, string>()
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await db.from('wrestlers').select('id, first_name, last_name, suffix').in('id', ids.slice(i, i + 300))
    for (const w of data ?? []) names.set(w.id, [w.first_name, w.last_name, w.suffix].filter(Boolean).join(' '))
  }
  const hs = await highSchools(db, ids)
  return ids.map(id => ({ wrestler_id: id, name: names.get(id) ?? '', hs: hs.get(id) ?? null, years: byW.get(id)!, totals: careerTotals(byW.get(id)!) }))
    .sort((a, b) => (a.totals.titles - b.totals.titles) * -1 || (a.totals.aa - b.totals.aa) * -1 || a.years[0].year - b.years[0].year)
}

/** Every college with at least one NJ wrestler: counts for the college list */
export async function collegesWithNj(db: SupabaseClient, g: Side, level?: string): Promise<{ college: College; wrestlers: number; aa: number; titles: number; first: number; last: number }[]> {
  const T = collegeTablesOf(g)
  const rows = await pages<EntryRow>(f => { const q = db.from(T.entries).select(ENTRY_COLS.replace('EVENTS', T.events)).in('match_status', MATCHED).not('wrestler_id', 'is', null).not('college_id', 'is', null); return (level ? q.eq('event.level', level) : q).order('id').range(f, f + 999) })
  const by = new Map<number, { college: College; ws: Set<string>; aa: Set<string>; titles: number; years: number[] }>()
  for (const r of rows) {
    const c = by.get(r.college!.id) ?? by.set(r.college!.id, { college: r.college!, ws: new Set(), aa: new Set(), titles: 0, years: [] }).get(r.college!.id)!
    c.ws.add(r.wrestler_id!); c.years.push(r.event.year)
    if (r.place != null) c.aa.add(r.wrestler_id!)
    if (r.place === 1) c.titles++
  }
  return [...by.values()].map(c => ({ college: c.college, wrestlers: c.ws.size, aa: c.aa.size, titles: c.titles, first: Math.min(...c.years), last: Math.max(...c.years) }))
    .sort((a, b) => b.wrestlers - a.wrestlers || a.college.name.localeCompare(b.college.name))
}

/** Readable text on a college color */
export function textOn(hex: string | null | undefined): string {
  const h = (hex ?? '#334155').replace('#', '')
  const [r, gg, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) || 0)
  return (0.299 * r + 0.587 * gg + 0.114 * b) / 255 > 0.6 ? '#0f172a' : '#ffffff'
}

export const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? 'th'}`
export const fallTime = (secs: number | null) => (secs == null ? '' : `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`)

/** High school(s) of our wrestlers: postseason entries first (latest school), else the pre-2013 finishes */
export async function highSchools(db: SupabaseClient, ids: string[]): Promise<Map<string, { id: number; name: string }>> {
  const out = new Map<string, { id: number; name: string; season: number }>()
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200)
    const [ents, fins] = await Promise.all([
      pages<{ wrestler_id: string; school: { id: number; display_name: string } | null; tournament: { season_id: number } | null }>(f =>
        db.from('tournament_entries').select('wrestler_id, school:schools(id, display_name), tournament:tournaments(season_id)').in('wrestler_id', chunk).order('id').range(f, f + 999)),
      pages<{ wrestler_id: string; year: number; school: { id: number; display_name: string } | null }>(f =>
        db.from('history_finishes').select('wrestler_id, year, school:schools(id, display_name)').in('wrestler_id', chunk).order('id').range(f, f + 999)),
    ])
    for (const r of [...ents.map(e => ({ w: e.wrestler_id, s: e.school, y: e.tournament?.season_id ?? 0 })), ...fins.map(f => ({ w: f.wrestler_id, s: f.school, y: f.year }))]) {
      if (!r.s) continue
      const cur = out.get(r.w)
      if (!cur || r.y > cur.season) out.set(r.w, { id: r.s.id, name: r.s.display_name, season: r.y })
    }
  }
  return new Map([...out].map(([k, v]) => [k, { id: v.id, name: v.name }]))
}

/** Every matched NJ wrestler's college career, for the leader boards (Kyle 2026-11-17: "see which jersey wrestler is
 *  the back side warrior"): name, high school, colleges and totals */
// finishes: his placing years (All-American, top 8), oldest first — the college list's Champions / All-Americans boards
export async function njCollegeCareers(db: SupabaseClient, g: Side, level?: string): Promise<{ wrestler_id: string; name: string; hs: { id: number; name: string } | null; colleges: College[]; totals: CareerTotals; finishes: { year: number; place: number; weight: number; college: string }[] }[]> {
  const T = collegeTablesOf(g)
  const rows = await pages<EntryRow>(f => { const q = db.from(T.entries).select(ENTRY_COLS.replace('EVENTS', T.events)).in('match_status', MATCHED).not('wrestler_id', 'is', null); return (level ? q.eq('event.level', level) : q).order('id').range(f, f + 999) })
  const years = await buildYears(db, g, rows)
  const wid = new Map(rows.map(r => [r.id, r.wrestler_id!]))
  const byW = new Map<string, CollegeYear[]>()
  for (const y of years) { const k = wid.get(y.entry_id)!; byW.set(k, [...(byW.get(k) ?? []), y]) }
  const ids = [...byW.keys()]
  const names = new Map<string, string>()
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await db.from('wrestlers').select('id, first_name, last_name, suffix').in('id', ids.slice(i, i + 300))
    for (const w of data ?? []) names.set(w.id, [w.first_name, w.last_name, w.suffix].filter(Boolean).join(' '))
  }
  const hs = await highSchools(db, ids)
  return ids.map(id => {
    const ys = byW.get(id)!
    return { wrestler_id: id, name: names.get(id) ?? '', hs: hs.get(id) ?? null, colleges: [...new Map(ys.filter(y => y.college).map(y => [y.college!.id, y.college!])).values()], totals: careerTotals(ys),
      finishes: ys.filter(y => y.place != null).map(y => ({ year: y.year, place: y.place!, weight: y.weight, college: y.college?.name ?? 'TBD' })).sort((a, b) => a.year - b.year) }
  })
}
