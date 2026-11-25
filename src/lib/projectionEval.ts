// Grading projections against what happened (Projection Accuracy). Pure: the rows come from match_projections; the
// picks are either the frozen ones (what we projected at the time) or a replay of any settings over the same inputs
// (what a lever change would have done).
import { project, finishKind, ladderRank, type Finishes, type ProjectionParams } from '@/lib/projection'
import { bandCutoffs, speedRank, type BandCutoffs } from '@/lib/speedBands'
import { buildWeightMix, type WeightMix } from '@/lib/weightGroups'

export type EvalRow = {
  id: number; d: string; a: string; b: string; wa: number; wb: number
  c: number | null; h: number | null; finA: Finishes; finB: Finishes
  sid: number; pw: 'a' | 'b' | 'even'; pr: number | null; aw: 'a' | 'b'; ar: number
  /** pin / tech time, and whether it was estimated at import */
  t: number | null; te: boolean
  /** strength ratings going in */
  sa?: number | null; sb?: number | null
  /** who gets a dead-even projection (home slot / lower seed / second-listed) */
  e?: 'a' | 'b' | null
  /** the bout's weight group (src/lib/weightGroups.ts) */
  wg?: string | null
}
export type Pick = { w: 'a' | 'b' | 'even'; r: number | null }

export type Line = { n: number; called: number; winRight: number; kindRight: number; exact: number; tiersOff: number; tiersN: number }
export const KINDS = ['pin', 'tech', 'major', 'dec', 'ot'] as const
export type Report = {
  total: Line
  byGap: (Line & { label: string })[]
  byMonth: (Line & { label: string })[]
  /** two weeks at a time from the season's first bout — early-season form vs later */
  byFortnight: (Line & { label: string })[]
  /** bouts the less-experienced wrestler had this season going in */
  byExperience: (Line & { label: string })[]
  /** by weight group (src/lib/weightGroups.ts), in group order */
  byWeight: (Line & { label: string })[]
  bySettings: (Line & { label: string })[]
  /** projected kind (or toss-up) → what happened from the projected winner's side (or 'lost') */
  matrix: Record<string, Record<string, number>>
  /** favored WRR band × underdog WRR band: bouts and how often the higher WRR won */
  bands: { fav: string; dog: string; n: number; favWon: number }[]
}

const blank = (): Line => ({ n: 0, called: 0, winRight: 0, kindRight: 0, exact: 0, tiersOff: 0, tiersN: 0 })
export const GAPS: [number, number, string][] = [[0, 4, '0–4'], [4, 8, '4–8'], [8, 12, '8–12'], [12, 16, '12–16'], [16, 24, '16–24'], [24, 32, '24–32'], [32, 999, '32+']]
const BANDS: [number, string][] = [[60, '60+'], [50, '50s'], [40, '40s'], [30, '30s'], [-Infinity, 'Under 30']]
const band = (v: number) => BANDS.find(([lo]) => v >= lo)![1]
const EXPERIENCE: [number, number, string][] = [[0, 0, 'First bout'], [1, 2, '1–2 bouts'], [3, 5, '3–5'], [6, 10, '6–10'], [11, 20, '11–20'], [21, 999, '21+']]
const DAY = 86_400_000
const fmtDay = (ms: number) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

/** How far off a pick was, in result tiers on the 1–32 scale (a pick from the winner's side vs what happened) */
export function tiersOff(p: Pick, r: EvalRow): number | null {
  if (p.w === 'even' || p.r == null) return null
  const happened = r.aw === p.w ? r.ar : 33 - r.ar
  return Math.abs(p.r - happened)
}

function add(l: Line, p: Pick, r: EvalRow) {
  l.n++
  if (p.w === 'even' || p.r == null) return
  l.called++
  const t = tiersOff(p, r)!
  l.tiersOff += t; l.tiersN++
  if (p.w !== r.aw) return
  l.winRight++
  if (finishKind(p.r) === finishKind(r.ar)) l.kindRight++
  if (p.r === r.ar) l.exact++
}

export function evaluate(rows: EvalRow[], picks: Pick[], settingsLabel: (id: number) => string = id => `#${id}`): Report {
  const total = blank()
  const gap = new Map<string, Line>(), month = new Map<string, Line>(), sets = new Map<string, Line>()
  const fort = new Map<number, Line>(), exp = new Map<string, Line>(), wgt = new Map<string, Line>()
  const first = rows.reduce((m, r) => (r.d < m ? r.d : m), rows[0]?.d ?? new Date().toISOString().slice(0, 10))
  const firstMs = Date.parse(`${first}T00:00:00Z`)
  const matrix: Report['matrix'] = {}
  const bandMap = new Map<string, { fav: string; dog: string; n: number; favWon: number }>()
  const get = (m: Map<string, Line>, k: string) => m.get(k) ?? m.set(k, blank()).get(k)!
  rows.forEach((r, i) => {
    const p = picks[i]
    add(total, p, r)
    const g = Math.abs(r.wa - r.wb)
    add(get(gap, GAPS.find(([lo, hi]) => g >= lo && g < hi)?.[2] ?? '32+'), p, r)
    add(get(month, r.d.slice(0, 7)), p, r)
    add(get(sets, settingsLabel(r.sid)), p, r)
    const f = Math.floor((Date.parse(`${r.d}T00:00:00Z`) - firstMs) / (14 * DAY))
    add(fort.get(f) ?? fort.set(f, blank()).get(f)!, p, r)
    const bouts = Math.min(r.finA.wins + r.finA.losses, r.finB.wins + r.finB.losses)
    add(get(exp, EXPERIENCE.find(([lo, hi]) => bouts >= lo && bouts <= hi)![2]), p, r)
    if (r.wg) add(get(wgt, r.wg), p, r)
    const pk = p.w === 'even' || p.r == null ? 'toss-up' : finishKind(p.r)
    const ak = p.w === 'even' ? finishKind(r.ar) : p.w === r.aw ? finishKind(r.ar) : 'lost'
    matrix[pk] ??= {}; matrix[pk][ak] = (matrix[pk][ak] ?? 0) + 1
    // side A is always the higher WRR going in
    const bk = `${band(r.wa)}|${band(r.wb)}`
    const b = bandMap.get(bk) ?? bandMap.set(bk, { fav: band(r.wa), dog: band(r.wb), n: 0, favWon: 0 }).get(bk)!
    b.n++; if (r.aw === 'a') b.favWon++
  })
  const order = (labels: string[]) => (m: Map<string, Line>) => labels.filter(l => m.has(l)).map(l => ({ label: l, ...m.get(l)! }))
  return {
    total,
    byGap: order(GAPS.map(x => x[2]))(gap),
    byMonth: [...month.keys()].sort().map(k => ({ label: k, ...month.get(k)! })),
    byFortnight: [...fort.keys()].sort((x, y) => x - y).map(k => ({ label: `${fmtDay(firstMs + k * 14 * DAY)} – ${fmtDay(firstMs + (k * 14 + 13) * DAY)}`, ...fort.get(k)! })),
    byExperience: order(EXPERIENCE.map(x => x[2]))(exp),
    byWeight: [...wgt.keys()].sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).map(k => ({ label: k, ...wgt.get(k)! })),
    bySettings: [...sets.keys()].map(k => ({ label: k, ...sets.get(k)! })),
    matrix,
    bands: [...bandMap.values()].sort((x, y) => BANDS.findIndex(b => b[1] === x.fav) - BANDS.findIndex(b => b[1] === y.fav) || BANDS.findIndex(b => b[1] === x.dog) - BANDS.findIndex(b => b[1] === y.dog)),
  }
}

export const frozenPicks = (rows: EvalRow[]): Pick[] => rows.map(r => ({ w: r.pw, r: r.pr }))
export const replayPicks = (rows: EvalRow[], params: ProjectionParams): Pick[] => rows.map(r => {
  const p = project({ wrrA: r.wa, wrrB: r.wb, common: r.c, meetings: r.h, finA: r.finA, finB: r.finB, strA: r.sa, strB: r.sb, edge: r.e, weightGroup: r.wg }, params)
  return { w: p.winner, r: p.rank }
})

/** Bouts a change moved: closer to what happened, further, or a different pick no closer or further */
export function compareChanges(rows: EvalRow[], before: Pick[], after: Pick[], rowsAfter: EvalRow[] = rows) {
  let changed = 0, better = 0, worse = 0
  rows.forEach((r, i) => {
    const x = before[i], y = after[i]
    if (x.w === y.w && x.r === y.r && r.ar === rowsAfter[i].ar) return
    changed++
    const tx = tiersOff(x, r), ty = tiersOff(y, rowsAfter[i])
    if (tx == null || ty == null) return
    if (ty < tx) better++; else if (ty > tx) worse++
  })
  return { changed, better, worse }
}

/** The worst calls, worst first. 'upset': the projected winner lost (biggest WRR gap first). 'finish': the projected
 *  winner won, but not the way we said (furthest from the projected result first) — e.g. a pin projected for a
 *  wrestler who techs. */
export function biggestMisses(rows: EvalRow[], picks: Pick[], kind: 'upset' | 'finish', n = 30): number[] {
  const out: { i: number; key: number }[] = []
  rows.forEach((r, i) => {
    const p = picks[i]
    if (p.w === 'even' || p.r == null) return
    if (kind === 'upset' && p.w !== r.aw) out.push({ i, key: Math.abs(r.wa - r.wb) })
    if (kind === 'finish' && p.w === r.aw && finishKind(p.r) !== finishKind(r.ar)) out.push({ i, key: Math.abs(p.r - r.ar) * 1000 + Math.abs(r.wa - r.wb) })
  })
  return out.sort((x, y) => y.key - x.key).slice(0, n).map(x => x.i)
}

/** The same bouts with what happened re-ranked on the speed scale: a timed, not-estimated pin or tech by its band;
 *  everything else as it was (decisions, and pins / techs with no usable time keep their clock rank) */
export function onSpeedScale(rows: EvalRow[], cut: BandCutoffs): EvalRow[] {
  return rows.map(r => (r.ar <= 12 && r.t != null && r.t > 0 && !r.te ? { ...r, ar: speedRank(r.ar % 2 ? 'pin' : 'tech', r.t, cut) } : r))
}

/** Speed-band cutoffs from a season's tracked bouts */
export function cutoffsFrom(rows: EvalRow[]): BandCutoffs {
  return bandCutoffs(rows.filter(r => r.ar <= 12 && r.t != null && r.t > 0 && r.t <= 420 && !r.te).map(r => ({ kind: r.ar % 2 ? 'pin' as const : 'tech' as const, secs: r.t! })))
}

/** One point of the spread chart (Kyle 2026-11-20): every bout seen from both wrestlers' sides, the WRR spread going in
 *  rounded and capped at ±32; what happened most often at that spread, what the ladder assumes there, and how often
 *  the result was exactly the assumption. Ranks are from that wrestler's side: 1–16 wins, 17–32 losses. */
export type SpreadPoint = { s: number; n: number; top: number; topPct: number; assumed: number | null; hitPct: number | null }

export function spreadChart(rows: EvalRow[], ladder: number[]): SpreadPoint[] {
  const counts = new Map<number, number[]>()
  const bump = (s: number, rank: number) => { const c = counts.get(s) ?? counts.set(s, new Array(33).fill(0)).get(s)!; c[rank]++ }
  for (const r of rows) {
    const s = Math.max(-32, Math.min(32, Math.round(r.wa - r.wb)))
    const rankA = r.aw === 'a' ? r.ar : 33 - r.ar
    bump(s, rankA)
    bump(-s, 33 - rankA)
  }
  const out: SpreadPoint[] = []
  for (let s = -32; s <= 32; s++) {
    const c = counts.get(s)
    const assumed = s > 0 ? ladderRank(s, ladder) : s < 0 ? 33 - ladderRank(-s, ladder) : null
    if (!c) { out.push({ s, n: 0, top: 0, topPct: 0, assumed, hitPct: null }); continue }
    const n = c.reduce((a, b) => a + b, 0)
    let top = 1
    for (let k = 2; k <= 32; k++) if (c[k] > c[top]) top = k
    out.push({ s, n, top, topPct: 100 * c[top] / n, assumed, hitPct: assumed == null ? null : 100 * c[assumed] / n })
  }
  return out
}

/** The spread chart by win type only: ranks folded into 10 rows — 1 Win by Pin, 2 Tech, 3 Major, 4 Decision, 5 OT,
 *  6 Loss in OT, 7 Decision, 8 Major, 9 Tech, 10 Pin — so a point's top / assumed are those row numbers */
export const KIND_ROWS = ['Win by Pin', 'Win by Tech', 'Win by Major', 'Win by Decision', 'Win in OT', 'Loss in OT', 'Loss by Decision', 'Loss by Major', 'Loss by Tech', 'Loss by Pin']
const kindRow = (rank: number) => {
  const k = KINDS.indexOf(finishKind(rank <= 16 ? rank : 33 - rank))   // pin 0 … ot 4
  return rank <= 16 ? k + 1 : 10 - k
}
export function spreadKindChart(rows: EvalRow[], ladder: number[]): SpreadPoint[] {
  const counts = new Map<number, number[]>()
  const bump = (s: number, rank: number) => { const c = counts.get(s) ?? counts.set(s, new Array(11).fill(0)).get(s)!; c[kindRow(rank)]++ }
  for (const r of rows) {
    const s = Math.max(-32, Math.min(32, Math.round(r.wa - r.wb)))
    const rankA = r.aw === 'a' ? r.ar : 33 - r.ar
    bump(s, rankA)
    bump(-s, 33 - rankA)
  }
  const out: SpreadPoint[] = []
  for (let s = -32; s <= 32; s++) {
    const c = counts.get(s)
    const assumedRank = s > 0 ? ladderRank(s, ladder) : s < 0 ? 33 - ladderRank(-s, ladder) : null
    const assumed = assumedRank == null ? null : kindRow(assumedRank)
    if (!c) { out.push({ s, n: 0, top: 0, topPct: 0, assumed, hitPct: null }); continue }
    const n = c.reduce((a, b) => a + b, 0)
    let top = 1
    for (let k = 2; k <= 10; k++) if (c[k] > c[top]) top = k
    out.push({ s, n, top, topPct: 100 * c[top] / n, assumed, hitPct: assumed == null ? null : 100 * c[assumed] / n })
  }
  return out
}

/** A version's win curve (see ProjectionParams.odds.winCurve): each bout's blended score — the version without odds —
 *  seen from both sides, and how often that side won, in 2-point steps from −40 to +40 */
export function buildWinCurve(rows: EvalRow[], params: ProjectionParams): [number, number][] {
  const curve: [number, number][] = Array.from({ length: 41 }, () => [0, 0])
  const noOdds = { ...params, odds: { ...params.odds, on: false } }
  for (const r of rows) {
    const sc = project({ wrrA: r.wa, wrrB: r.wb, common: r.c, meetings: r.h, finA: r.finA, finB: r.finB, strA: r.sa, strB: r.sb }, noOdds).score
    for (const [x, won] of [[sc, r.aw === 'a'], [-sc, r.aw === 'b']] as const) {
      const i = Math.max(0, Math.min(40, Math.round(x / 2) + 20))
      curve[i][0]++; if (won) curve[i][1]++
    }
  }
  return curve
}

/** A season's finish mix by weight group (ProjectionParams.weight.mix) from its tracked bouts */
export function weightMixFrom(rows: EvalRow[]): WeightMix {
  return buildWeightMix(rows.map(r => ({ group: r.wg ?? null, rank: r.ar })), rank => KINDS.indexOf(finishKind(rank)))
}
