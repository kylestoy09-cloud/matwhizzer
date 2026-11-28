// Roster Import (preseason step 3, Kyle 2026-11-28): this season's TrackWrestling rosters against what last season's
// rollover expects at each school.
//   Expected at a school: our wrestlers who were on its roster or wrestled for it last season and still belong to it
//   (src/lib/hubSchools.ts: a logged transfer moves them), active (not graduated), plus transfers in, plus the stored
//   Track roster players (roster_grade_import, rolled over a grade) at that school.
//   Each Track wrestler:
//     exact name among the expected, same grade   → confirmed (our wrestler, or the stored roster player)
//     exact name, different grade                 → review
//     close spelling among the expected            → review (suggested)
//     same name and grade as someone expected at another school but missing from that school's new roster
//                                                 → review: a transfer ("this isn't a lock, but should be reviewed")
//     same name at a school whose roster isn't in yet → review
//     a new name: a freshman                       → confirmed as new (stored, so match uploads find the grade)
//                 anyone else                      → review (a transfer from out of state, a misspelling, …)
//   Expected wrestlers Track doesn't list are the school's "missing" (left the team, transferred, or not entered yet).
//   On the school page, a confirmed wrestler shows on the preseason roster only if they wrestled varsity last season.
// Server only. Boys and girls each use their own tables.
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { schoolIdsOfWrestlers } from '@/lib/hubSchools'
import { transferTable } from '@/lib/transfers'
import { closeName, personKey, type TrackRoster, type TrackRosterRow } from './rosters'
import { looseName } from './teams'
import type { OurData, Side } from './teamReview'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>
const OPEN = ['pending', 'school_matched', 'wrestler_matched', 'no_match']
const NEXT: Record<string, number> = { Fr: 9, So: 10, Jr: 11, Sr: 12 }

export type Person = { id: string; name: string; key: string; grade: string | null; schoolId: number | null; kind: 'wrestler' | 'pool' }
export type Suggestion = { kind: 'wrestler' | 'pool'; id: string; name: string; grade: string | null; schoolId: number | null; school: string | null; why: string }
export type PlannedRow = {
  schoolId: number; team: string; row: TrackRosterRow
  match: 'wrestler' | 'pool' | 'new'; wrestlerId: string | null; poolId: string | null
  expectedGrade: string | null; varsity: boolean; lastWeight: number | null
  status: 'confirmed' | 'review'; reason: string | null; suggestions: Suggestion[]
}
export type SchoolPlan = { schoolId: number; team: string; rows: PlannedRow[]; missing: { id: string; name: string; grade: string | null; kind: 'wrestler' | 'pool' }[] }
export type RosterPlan = { schools: SchoolPlan[]; unmatchedTeams: { team: string; count: number; suggestions: { id: number; name: string }[] }[] }

/** a roster's "<School> Roster" heading → our school: Track's names saved in the School Data Review, else one school
 *  by exactly that name, else by the same loose name */
export function schoolOfTeam(team: string, our: OurData): number | null {
  const lower = team.toLowerCase()
  const exact = [...our.namesBySchool].filter(([, ns]) => ns.has(lower)).map(([id]) => id)
  const pick = (ids: number[]) => (ids.length === 1 ? ids[0] : ids.filter(i => our.programs.has(i)).length === 1 ? ids.filter(i => our.programs.has(i))[0] : null)
  const a = pick(exact)
  if (a != null) return a
  const l = looseName(team)
  return pick([...our.namesBySchool].filter(([, ns]) => [...ns].some(n => looseName(n) === l)).map(([id]) => id))
}

// size: ids per request. A request returns at most `limit` rows (the project allows 100,000): bouts by school go 25
// schools at a time so a season's bouts never reach it; a request that comes back full is an error, never cut short
async function inChunks<T>(ids: (string | number)[], q: (chunk: (string | number)[]) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>, size = 200, limit = 50000): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; i < ids.length; i += size) {
    const { data, error } = await q(ids.slice(i, i + size))
    if (error) throw new Error(error.message)
    if ((data?.length ?? 0) >= limit) throw new Error(`a request reached ${limit} rows: split it smaller`)
    out.push(...(data ?? []))
  }
  return out
}

/** who wrestled a varsity bout in a season (duals, in-season tournaments, the postseason), among these wrestlers →
 *  each one's most common weight that season */
export async function varsityIn(db: Db, side: Side, seasonId: number, seasonLabel: string, wrestlerIds: string[]): Promise<Map<string, number | null>> {
  const g = side === 'boys' ? 'M' : 'F'
  const tally = new Map<string, Map<number, number>>()
  const add = (w: string | null, wt: number | null) => { if (!w) return; const m = tally.get(w) ?? new Map<number, number>(); if (wt != null) m.set(wt, (m.get(wt) ?? 0) + 1); tally.set(w, m) }
  if (!wrestlerIds.length) return new Map()
  const meetT = side === 'boys' ? 'dual_meets' : 'dual_meets_girls', boutT = side === 'boys' ? 'dual_meet_matches' : 'dual_meet_matches_girls'
  const tourT = side === 'boys' ? 'in_season_tournaments' : 'in_season_tournaments_girls', tbT = side === 'boys' ? 'tournament_bouts' : 'tournament_bouts_girls'
  let mq = db.from(meetT).select('id').eq('season_id', seasonId)
  if (side === 'boys') mq = mq.eq('gender', 'M')
  const meets = new Set((await fetchAllRows<{ id: string }>((f, t) => mq.order('id').range(f, t))).data.map(m => m.id))
  const tours = new Set((await fetchAllRows<{ id: string }>((f, t) => db.from(tourT).select('id').eq('season', seasonLabel).order('id').range(f, t))).data.map(m => m.id))
  const posts = new Set((await fetchAllRows<{ id: number }>((f, t) => db.from('tournaments').select('id').eq('season_id', seasonId).eq('gender', g).order('id').range(f, t))).data.map(m => m.id))
  for (const col of ['wrestler_a_id', 'wrestler_b_id']) {
    const rows = await inChunks<{ dual_meet_id: string; weight_class: number | null; wrestler_a_id: string | null; wrestler_b_id: string | null }>(wrestlerIds, c => db.from(boutT).select('dual_meet_id, weight_class, wrestler_a_id, wrestler_b_id').in(col, c).limit(50000))
    for (const r of rows) if (meets.has(r.dual_meet_id)) add((r as Record<string, unknown>)[col] as string | null, r.weight_class)
  }
  for (const col of ['wrestler1_id', 'wrestler2_id']) {
    const rows = await inChunks<{ in_season_tournament_id: string; weight_class: number | null; wrestler1_id: string | null; wrestler2_id: string | null }>(wrestlerIds, c => db.from(tbT).select('in_season_tournament_id, weight_class, wrestler1_id, wrestler2_id').in(col, c).limit(50000))
    for (const r of rows) if (tours.has(r.in_season_tournament_id)) add((r as Record<string, unknown>)[col] as string | null, r.weight_class)
  }
  const entries = await inChunks<{ wrestler_id: string; tournament_id: number }>(wrestlerIds, c => db.from('tournament_entries').select('wrestler_id, tournament_id').in('wrestler_id', c).limit(50000))
  for (const e of entries) if (posts.has(e.tournament_id)) add(e.wrestler_id, null)
  return new Map([...tally].map(([w, m]) => [w, [...m].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? null]))
}

/** last season's people at these schools, where they belong now, and the stored roster players at them */
async function expectedAt(db: Db, side: Side, seasonId: number, prevLabel: string, schoolIds: number[]) {
  const g = side === 'boys' ? 'M' : 'F'
  const prev = seasonId - 1
  const cand = new Set<string>()
  // last season's Track rosters (tied to our wrestlers), last season's bouts and postseason entries for these schools
  for (const r of await inChunks<{ wrestler_id: string | null }>(schoolIds, c => db.from('roster_grade_import').select('wrestler_id').eq('gender', g).eq('season_id', prev).in('school_id', c).not('wrestler_id', 'is', null).limit(50000))) if (r.wrestler_id) cand.add(r.wrestler_id)
  const meetT = side === 'boys' ? 'dual_meets' : 'dual_meets_girls', boutT = side === 'boys' ? 'dual_meet_matches' : 'dual_meet_matches_girls'
  let mq = db.from(meetT).select('id').eq('season_id', prev)
  if (side === 'boys') mq = mq.eq('gender', 'M')
  const meetIds = (await fetchAllRows<{ id: string }>((f, t) => mq.order('id').range(f, t))).data.map(m => m.id)
  const meetSet = new Set(meetIds)
  for (const [w, s] of [['wrestler_a_id', 'school_a_id'], ['wrestler_b_id', 'school_b_id']]) {
    const rows = await inChunks<Record<string, string | number | null>>(schoolIds, c => db.from(boutT).select(`dual_meet_id, ${w}`).in(s, c).limit(50000) as unknown as PromiseLike<{ data: Record<string, string | number | null>[] | null; error: { message: string } | null }>, 25)
    for (const r of rows) if (meetSet.has(r.dual_meet_id as string) && r[w]) cand.add(r[w] as string)
  }
  const tourT = side === 'boys' ? 'in_season_tournaments' : 'in_season_tournaments_girls', tbT = side === 'boys' ? 'tournament_bouts' : 'tournament_bouts_girls'
  const tours = new Set((await fetchAllRows<{ id: string }>((f, t) => db.from(tourT).select('id').eq('season', prevLabel).order('id').range(f, t))).data.map(m => m.id))
  for (const [w, s] of [['wrestler1_id', 'wrestler1_school_id'], ['wrestler2_id', 'wrestler2_school_id']]) {
    const rows = await inChunks<Record<string, string | number | null>>(schoolIds, c => db.from(tbT).select(`in_season_tournament_id, ${w}`).in(s, c).limit(50000) as unknown as PromiseLike<{ data: Record<string, string | number | null>[] | null; error: { message: string } | null }>, 25)
    for (const r of rows) if (tours.has(r.in_season_tournament_id as string) && r[w]) cand.add(r[w] as string)
  }
  const posts = (await fetchAllRows<{ id: number }>((f, t) => db.from('tournaments').select('id').eq('season_id', prev).eq('gender', g).order('id').range(f, t))).data.map(m => m.id)
  for (const r of await inChunks<{ wrestler_id: string | null }>(schoolIds, c => db.from('tournament_entries').select('wrestler_id').in('tournament_id', posts).in('school_id', c).limit(50000))) if (r.wrestler_id) cand.add(r.wrestler_id)
  // transfers into these schools this season
  const tIn = await inChunks<{ wrestler_id: string }>(schoolIds, c => db.from(transferTable(g)).select('wrestler_id').eq('season_id', seasonId).in('to_school_id', c))
  for (const t of tIn) cand.add(t.wrestler_id)

  const ids = [...cand]
  const people = await inChunks<{ id: string; first_name: string | null; last_name: string | null; suffix: string | null; grade: string | null; gender: string; is_active: boolean | null; is_oos: boolean | null }>(ids, c => db.from('wrestlers').select('id, first_name, last_name, suffix, grade, gender, is_active, is_oos').in('id', c))
  const live = people.filter(p => p.gender === g && p.is_active !== false && !p.is_oos && p.first_name !== 'Unknown')
  const school = await schoolIdsOfWrestlers(db, live.map(p => p.id))
  const wrestlers: Person[] = live.map(p => { const name = [p.first_name, p.last_name].filter(Boolean).join(' '); return { id: p.id, name, key: personKey(name), grade: p.grade, schoolId: school.get(p.id) ?? null, kind: 'wrestler' as const } })
  const pool = await inChunks<{ id: string; first_name_raw: string | null; last_name_raw: string | null; grade: string | null; school_id: number | null }>(schoolIds, c => db.from('roster_grade_import').select('id, first_name_raw, last_name_raw, grade, school_id').eq('gender', g).eq('season_id', seasonId).in('status', OPEN).is('wrestler_id', null).in('school_id', c).limit(50000))
  const pooled: Person[] = pool.map(p => { const name = [p.first_name_raw, p.last_name_raw].filter(Boolean).join(' '); return { id: p.id, name, key: personKey(name), grade: p.grade, schoolId: p.school_id, kind: 'pool' as const } })
  return { wrestlers: wrestlers.filter(w => w.schoolId != null && schoolIds.includes(w.schoolId)), pool: pooled }
}

/** the plan for a file: every row matched (nothing written) */
export async function planRosters(db: Db, side: Side, season: { id: number; label: string }, prevLabel: string, rosters: TrackRoster[], our: OurData, loadedElsewhere: Map<string, { schoolId: number; name: string }[]>): Promise<RosterPlan> {
  const g = side === 'boys' ? 'M' : 'F'
  const unmatchedTeams: RosterPlan['unmatchedTeams'] = []
  const bySchool = new Map<number, TrackRoster>()
  for (const r of rosters) {
    const id = schoolOfTeam(r.team, our)
    if (id == null) {
      const words = new Set(looseName(r.team).split(' ').filter(w => w.length > 2))
      const sugg = [...our.schools.values()].map(s => ({ s, n: looseName(s.name).split(' ').filter(w => words.has(w)).length })).filter(x => x.n).sort((a, b) => b.n - a.n).slice(0, 4).map(x => ({ id: x.s.id, name: x.s.name }))
      unmatchedTeams.push({ team: r.team, count: r.rows.length, suggestions: sugg }); continue
    }
    const had = bySchool.get(id)
    bySchool.set(id, had ? { team: had.team, rows: [...had.rows, ...r.rows] } : r)
  }
  const schoolIds = [...bySchool.keys()]
  const { wrestlers, pool } = await expectedAt(db, side, season.id, prevLabel, schoolIds)
  const expected = new Map<number, Person[]>()
  for (const p of [...wrestlers, ...pool]) if (p.schoolId != null) expected.set(p.schoolId, [...(expected.get(p.schoolId) ?? []), p])
  const name = (id: number | null) => (id == null ? null : our.schools.get(id)?.name ?? null)

  // pass 1: each school's own expected people (exact, then close)
  const plans: SchoolPlan[] = []
  const usedAt = new Map<number, Set<string>>()
  for (const [schoolId, roster] of bySchool) {
    const exp = expected.get(schoolId) ?? []
    const used = new Set<string>()
    const rows: PlannedRow[] = []
    // a name listed twice on one roster counts once
    const seen = new Set<string>()
    for (const row of roster.rows) {
      const key = personKey(row.name)
      if (seen.has(key)) continue
      seen.add(key)
      const base: PlannedRow = { schoolId, team: roster.team, row, match: 'new', wrestlerId: null, poolId: null, expectedGrade: null, varsity: false, lastWeight: null, status: 'review', reason: null, suggestions: [] }
      const hits = exp.filter(p => p.key === key && !used.has(p.id))
      const sugg = (p: Person, why: string): Suggestion => ({ kind: p.kind, id: p.id, name: p.name, grade: p.grade, schoolId: p.schoolId, school: name(p.schoolId), why })
      if (hits.length === 1 || (hits.length > 1 && hits.filter(h => h.kind === 'wrestler').length === 1)) {
        const p = hits.length === 1 ? hits[0] : hits.find(h => h.kind === 'wrestler')!
        used.add(p.id)
        Object.assign(base, { match: p.kind, wrestlerId: p.kind === 'wrestler' ? p.id : null, poolId: p.kind === 'pool' ? p.id : null, expectedGrade: p.grade })
        if (row.gender !== g) Object.assign(base, { reason: `Track lists ${row.gender === 'F' ? 'a girl' : 'a boy'} on this ${side} roster` })
        else if (row.grade && p.grade && row.grade !== p.grade) Object.assign(base, { reason: `Grade: Track ${row.grade}, the rollover ${p.grade}` })
        else base.status = 'confirmed'
      } else if (hits.length > 1) {
        Object.assign(base, { reason: 'More than one of ours has this name here', suggestions: hits.map(p => sugg(p, 'same name')) })
      } else {
        const close = exp.filter(p => !used.has(p.id) && closeName(key, p.key))
        if (close.length) Object.assign(base, { reason: 'A close spelling of someone expected here', suggestions: close.map(p => sugg(p, 'close spelling')) })
      }
      rows.push(base)
    }
    for (const r of rows) for (const s of r.suggestions) used.add(s.id)   // a suggested person isn't "missing" yet
    usedAt.set(schoolId, used)
    plans.push({ schoolId, team: roster.team, rows, missing: [] })
  }
  // missing: expected and not on the school's new roster
  for (const p of plans) {
    const used = usedAt.get(p.schoolId)!
    p.missing = (expected.get(p.schoolId) ?? []).filter(x => !used.has(x.id)).map(x => ({ id: x.id, name: x.name, grade: x.grade, kind: x.kind }))
  }
  // pass 2: names still new — a transfer from a school whose new roster doesn't have them, or the same name elsewhere
  const missingByKey = new Map<string, { p: Person; from: number }[]>()
  for (const p of plans) for (const m of p.missing) if (m.kind === 'wrestler') {
    const person = wrestlers.find(w => w.id === m.id)!
    missingByKey.set(person.key, [...(missingByKey.get(person.key) ?? []), { p: person, from: p.schoolId }])
  }
  const stillNew = plans.flatMap(p => p.rows.filter(r => r.match === 'new' && !r.suggestions.length))
  // the same name anywhere on our list (a school whose roster isn't in yet)
  const keys = [...new Set(stillNew.map(r => personKey(r.row.name)))]
  const anywhere = new Map<string, Person[]>()
  if (keys.length) {
    const all = (await fetchAllRows<{ id: string; first_name: string | null; last_name: string | null; grade: string | null }>((f, t) => db.from('wrestlers').select('id, first_name, last_name, grade').eq('gender', g).eq('is_active', true).order('id').range(f, t))).data
    const want = new Set(keys)
    const hits = all.filter(w => want.has(personKey([w.first_name, w.last_name].filter(Boolean).join(' '))))
    const sch = await schoolIdsOfWrestlers(db, hits.map(h => h.id))
    for (const h of hits) { const n = [h.first_name, h.last_name].filter(Boolean).join(' '), k = personKey(n); anywhere.set(k, [...(anywhere.get(k) ?? []), { id: h.id, name: n, key: k, grade: h.grade, schoolId: sch.get(h.id) ?? null, kind: 'wrestler' }]) }
  }
  const gradeFits = (a: string | null, b: string | null) => !a || !b || Math.abs((NEXT[a] ?? 0) - (NEXT[b] ?? 0)) <= 1
  for (const r of stillNew) {
    const key = personKey(r.row.name)
    const gone = (missingByKey.get(key) ?? []).filter(x => x.from !== r.schoolId && gradeFits(x.p.grade, r.row.grade))
    if (gone.length) {
      r.suggestions = gone.map(x => ({ kind: 'wrestler', id: x.p.id, name: x.p.name, grade: x.p.grade, schoolId: x.from, school: name(x.from), why: `transfer: not on ${name(x.from)}’s new roster` }))
      r.reason = gone.length === 1 ? `Transfer from ${name(gone[0].from)}?` : 'A transfer? Several schools are missing this name'
      continue
    }
    // the same name elsewhere is common (Jordan Brown, Anthony Morales): only with the same grade
    const elsewhere = (anywhere.get(key) ?? []).filter(x => x.schoolId !== r.schoolId && (!x.grade || !r.row.grade || x.grade === r.row.grade))
    const notLoaded = elsewhere.filter(x => x.schoolId == null || !bySchool.has(x.schoolId))
    const loadedBefore = elsewhere.filter(x => x.schoolId != null && (loadedElsewhere.get(key) ?? []).some(l => l.schoolId === x.schoolId))
    if (notLoaded.length) {
      r.suggestions = notLoaded.map(x => ({ kind: 'wrestler', id: x.id, name: x.name, grade: x.grade, schoolId: x.schoolId, school: name(x.schoolId), why: x.schoolId == null ? 'same name' : `same name at ${name(x.schoolId)} (its roster isn’t in yet)` }))
      r.reason = 'Same name at another school: a transfer?'
      continue
    }
    if (loadedBefore.length) { r.reason = 'Same name on another school’s roster too'; continue }
    if (r.row.gender !== g) r.reason = `Track lists ${r.row.gender === 'F' ? 'a girl' : 'a boy'} on this ${side} roster`
    else if (r.row.grade === 'Fr') r.status = 'confirmed'
    else r.reason = `New name${r.row.grade ? ` (${r.row.grade})` : ''}: not expected here or missing anywhere`
  }
  // varsity last season, for everyone matched to one of our wrestlers (and suggested ones, for the review)
  const ids = [...new Set(plans.flatMap(p => p.rows.flatMap(r => [r.wrestlerId, ...r.suggestions.filter(s => s.kind === 'wrestler').map(s => s.id)]).filter((x): x is string => !!x)))]
  const varsity = await varsityIn(db, side, season.id - 1, prevLabel, ids)
  for (const p of plans) for (const r of p.rows) if (r.wrestlerId && varsity.has(r.wrestlerId)) { r.varsity = true; r.lastWeight = varsity.get(r.wrestlerId) ?? null }
  return { schools: plans, unmatchedTeams }
}
