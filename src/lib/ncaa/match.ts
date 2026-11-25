// College entrant → one of our NJ wrestlers (Kyle 2026-11-17). The college files give a name and a college only, so the
// match is name + timing:
//   name     last name the same (letters only); first name the same, a common nickname or an initial (sameFirst)
//   timing   college year − high school graduation: 1–5 fits; 6–7 only from 2020 on (extra COVID years) and flagged
// Graduation year: the profile's, else from a postseason grade (Jr in 2015 → 2016), else a range from the seasons on
// file (last season … first season + 3) — the 2000–2012 history profiles have only their finishes.
//   weight   (Kyle 2026-11-19: Collingswood's Cory Ferguson, 215, isn't Wisconsin–La Crosse's at 165 — "a giant man won't
//            shrink") his last high school season's weight against the college weight: well under the bottom of his
//            class rules him out; far heavier (half again) only sends him to review (collegeWeightFits)
// Status: 'auto' (Kyle: "100% matches can go through") = the exact full name, the only NJ wrestler with that name in
// all our records, and the timing and weight fit; 'review' = any other candidate (nickname, shared name, 6–7 years,
// a much bigger college weight); 'none'.
import type { SupabaseClient } from '@supabase/supabase-js'
import { sameFirst } from '@/lib/historyPeople'

export type PoolWrestler = { id: string; first: string; last: string; name: string; gradMin: number; gradMax: number; schools: string; label: string; hsMax: number | null; g: 'M' | 'F' }
export type Candidate = { wrestler_id: string; name: string; schools: string; hs: string; gap: string; why: string }
export type MatchResult = { status: 'auto' | 'review' | 'none'; wrestler_id: string | null; note: string | null; candidates: Candidate[] }

const letters = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
const lastOf = (full: string) => full.trim().split(/\s+/).slice(-1)[0] ?? ''
const firstOf = (full: string) => full.trim().split(/\s+/).slice(0, -1).join(' ')

/** Every NJ wrestler on our records for one side, with a graduation year (or range) */
export async function matchPool(db: SupabaseClient, g: 'M' | 'F'): Promise<PoolWrestler[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all = async <T,>(q: (from: number) => PromiseLike<{ data: any; error: { message: string } | null }>) => {
    const out: T[] = []
    for (let f = 0; ; f += 1000) { const { data, error } = await q(f); if (error) throw new Error(error.message); out.push(...((data ?? []) as T[])); if ((data ?? []).length < 1000) break }
    return out
  }
  const [wrestlers, entries, finishes, schools, playoff] = await Promise.all([
    all<{ id: string; first_name: string; last_name: string; graduation_year: number | null; is_oos: boolean }>(f =>
      db.from('wrestlers').select('id, first_name, last_name, graduation_year, is_oos').eq('gender', g).order('id').range(f, f + 999)),
    all<{ wrestler_id: string; school_id: number | null; grade: number | null; tournament: { season_id: number; gender: string }; wc: { weight: number } | null }>(f =>
      db.from('tournament_entries').select('wrestler_id, school_id, grade, tournament:tournaments!inner(season_id, gender), wc:weight_classes(weight)').eq('tournament.gender', g).not('wrestler_id', 'is', null).order('id').range(f, f + 999)),
    all<{ wrestler_id: string; year: number; school_id: number | null; weight: string | null }>(f =>
      db.from('history_finishes').select('wrestler_id, year, school_id, weight').eq('gender', g).not('wrestler_id', 'is', null).order('id').range(f, f + 999)),
    all<{ id: number; display_name: string }>(f => db.from('schools').select('id, display_name').order('id').range(f, f + 999)),
    all<{ wrestler_id: string; weight: number; season_id: number }>(f => db.from('playoff_history_entrants').select('wrestler_id, weight, season_id').eq('gender', g).not('wrestler_id', 'is', null).order('id').range(f, f + 999)),
  ])
  const schoolName = new Map(schools.map(s => [s.id, s.display_name]))
  const seen = new Map<string, { seasons: number[]; grad: number | null; schools: Set<number>; hsMax: number | null; hsSeason: number }>()
  const at = (id: string) => seen.get(id) ?? seen.set(id, { seasons: [], grad: null, schools: new Set(), hsMax: null, hsSeason: 0 }).get(id)!
  // his weight in his last high school season on file (Olivia Palmer: 161 as a freshman, 120 as a senior, 117 in college)
  const heavier = (s: { hsMax: number | null; hsSeason: number }, w: number | null | undefined, season: number) => {
    if (!w || w <= 0 || w >= 400) return
    if (season > s.hsSeason || (season === s.hsSeason && (s.hsMax == null || w > s.hsMax))) { s.hsMax = w; s.hsSeason = season }
  }
  for (const e of entries) {
    const s = at(e.wrestler_id), season = e.tournament.season_id
    s.seasons.push(season)
    if (e.school_id) s.schools.add(e.school_id)
    if (e.grade && e.grade >= 9 && e.grade <= 12 && !s.grad) s.grad = season + (12 - e.grade)
    heavier(s, e.wc?.weight, season)
  }
  for (const e of playoff) heavier(at(e.wrestler_id), e.weight, e.season_id)
  for (const f of finishes) { const s = at(f.wrestler_id); s.seasons.push(f.year); if (f.school_id) s.schools.add(f.school_id); heavier(s, Number.parseInt(f.weight ?? ''), f.year) }
  const out: PoolWrestler[] = []
  for (const w of wrestlers) {
    if (w.is_oos) continue
    const s = seen.get(w.id)
    let gradMin: number, gradMax: number
    if (w.graduation_year) gradMin = gradMax = w.graduation_year
    else if (s?.grad) gradMin = gradMax = s.grad
    else if (s?.seasons.length) { gradMin = Math.max(...s.seasons); gradMax = Math.min(...s.seasons) + 3 }
    else continue   // nothing to time a college career by
    const sch = [...(s?.schools ?? [])].map(id => schoolName.get(id)).filter(Boolean).join(' / ')
    const name = `${w.first_name} ${w.last_name}`
    out.push({ id: w.id, first: w.first_name, last: w.last_name, name, gradMin, gradMax, schools: sch, label: `${name}${sch ? ` (${sch})` : ''}`, hsMax: s?.hsMax ?? null, g })
  }
  return out
}

/** Can his college weight be the same body as his high school one (hsMax: his weight in his last high school season)? A high school weight class holds everyone from
 *  the class below it up (roughly 92% of its number up to it — a heavyweight class taken as 205 boys / 180 girls), and
 *  a college wrestler 15–30 lbs under that cut hard ('cut': a person's call, not an automatic match); more than 30
 *  under = 'light', not him. Half again his high school weight or more = 'heavy' (growing that much happens, but it's
 *  a person's call too). */
export function collegeWeightFits(w: PoolWrestler, collegeWeight: number | null | undefined): 'ok' | 'cut' | 'light' | 'heavy' {
  if (!w.hsMax || !collegeWeight) return 'ok'
  const top = w.g === 'F' ? (w.hsMax >= 200 ? 180 : w.hsMax) : (w.hsMax >= 250 ? 205 : w.hsMax)
  if (collegeWeight < top * 0.92 - 30) return 'light'
  if (collegeWeight < top * 0.92 - 15) return 'cut'
  if (w.hsMax < 250 && collegeWeight >= w.hsMax * 1.5) return 'heavy'
  return 'ok'
}

/** Can a championship in `year` fall in this wrestler's college years? 1–5 years after high school (6–7 from 2020 on) */
export function collegeTimingFits(w: PoolWrestler, year: number): boolean {
  const lo = year - w.gradMax, hi = year - w.gradMin
  return (hi >= 1 && lo <= 5) || (year >= 2020 && hi >= 6 && lo <= 7)
}

/** Index the pool by last name (letters) for fast lookups */
export function poolIndex(pool: PoolWrestler[]) {
  const byId = new Map(pool.map(w => [w.id, w]))
  const byLast = new Map<string, PoolWrestler[]>()
  const fullCount = new Map<string, number>()
  for (const w of pool) {
    const k = letters(w.last)
    byLast.set(k, [...(byLast.get(k) ?? []), w])
    const f = letters(w.name)
    fullCount.set(f, (fullCount.get(f) ?? 0) + 1)
  }
  return { byLast, fullCount, byId }
}

/** One college entrant (name as printed, championship year) against the pool */
export function matchEntrant(idx: ReturnType<typeof poolIndex>, name: string, year: number, weight?: number): MatchResult {
  const last = letters(lastOf(name)), first = firstOf(name)
  const hs = (w: PoolWrestler) => (w.gradMin === w.gradMax ? `class of ${w.gradMin}` : `class of ${w.gradMin}–${w.gradMax}`)
  const cands: (Candidate & { exact: boolean; flagged: boolean })[] = []
  for (const w of idx.byLast.get(last) ?? []) {
    if (!sameFirst(w.first, first) && letters(w.first) !== letters(first)) continue
    // years after graduation: the closest the range allows
    const lo = year - w.gradMax, hi = year - w.gradMin
    const fitsNormal = hi >= 1 && lo <= 5
    const fitsLate = !fitsNormal && year >= 2020 && hi >= 6 && lo <= 7
    if (!fitsNormal && !fitsLate) continue
    const wf = collegeWeightFits(w, weight)
    if (wf === 'light') continue   // a bigger high school wrestler than this college one: not him
    const gap = lo === hi ? `${lo} yr after HS` : `${Math.max(lo, 1)}–${hi} yrs after HS`
    const exact = letters(w.first) === letters(first)
    cands.push({ wrestler_id: w.id, name: w.name, schools: w.schools, hs: hs(w), gap, exact, flagged: fitsLate || wf === 'heavy' || wf === 'cut',
      why: [exact ? 'same name' : 'nickname / initial', fitsLate ? '6–7 years after HS (extra years)' : null, wf === 'heavy' || wf === 'cut' ? `${weight} in college, ${w.hsMax} in his last high school season` : null].filter(Boolean).join('; ') })
  }
  if (!cands.length) return { status: 'none', wrestler_id: null, note: null, candidates: [] }
  const only = cands.length === 1 ? cands[0] : null
  const unique = only && only.exact && !only.flagged && (idx.fullCount.get(letters(only.name)) ?? 0) === 1
  const strip = ({ exact: _e, flagged: _f, ...c }: Candidate & { exact: boolean; flagged: boolean }) => c
  return unique
    ? { status: 'auto', wrestler_id: only!.wrestler_id, note: `${only!.why}; ${only!.gap}; the only NJ wrestler with this name`, candidates: [strip(only!)] }
    : { status: 'review', wrestler_id: null, note: cands.length > 1 ? `${cands.length} possible NJ wrestlers` : cands[0].why, candidates: cands.map(strip) }
}
