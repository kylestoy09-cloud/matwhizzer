// Bout projections (Kyle 2026-11-19: "we need to be able to check our parameters to see how accurate they are and look
// backwards to see what we could change"). One function makes every projection the site shows (H2H, match cards) and
// every projection the tracker records (match_projections), from one settings version (projection_settings). Version 1
// is the formula as it stood: the WRR gap read off the expected-result ladder, blended with common opponents and past
// meetings. The finish-style levers start off and are turned on by saving a new version from Projection Accuracy.
//
// The WRR formula has its own copy of the ladder (getExpectedOutcomeRank in hammerScore.ts) for scoring a result against
// expectation: changing a projection setting never changes anyone's rating.
import { OUTCOME_LABELS } from '@/lib/hammerScore'
import { oddsFor, topOutcomes, KIND_KEYS, type OddsTable } from '@/lib/projectionOdds'
import { speedLabel, type BandCutoffs } from '@/lib/speedBands'
import { weightFactor, type WeightMix } from '@/lib/weightGroups'

/** A wrestler's finishes this season before the bout */
export type Finishes = { wins: number; pins: number; techs: number; majors: number; losses: number; pinned: number; teched: number }
export const NO_FINISHES: Finishes = { wins: 0, pins: 0, techs: 0, majors: 0, losses: 0, pinned: 0, teched: 0 }

export type ProjectionParams = {
  /** ladder[i] = the WRR gap needed to project result rank i+1 (1 = 1st Minute Pin … 15 = 1–3 Decision); below the last, OT */
  ladder: number[]
  /** blend weights [WRR, common opponents, past meetings] for whichever parts exist */
  weights: { all: [number, number, number]; meetings: [number, number]; common: [number, number] }
  /** a blended score this close to 0 (either way) is a toss-up */
  tossUp: number
  /** the projected winner's own finishes: a pin becomes a tech in the same period for a wrestler who techs more than he pins, and back */
  finishStyle: { on: boolean; minWins: number }
  /** a wrestler who rarely wins with bonus is projected no better than a major */
  bonusCap: { on: boolean; minWins: number; floorPct: number }
  /** the projected loser is rarely pinned: a projected pin becomes a tech in the same period */
  hardToPin: { on: boolean; minLosses: number; floorPct: number }
  /** the finish comes from the records, not the gap: the projected winner's most common way of winning, weighed by how
   *  the loser usually loses (each kind: winner's share of wins × (1 + loser's share of losses that way)). Pins and techs
   *  keep the gap's period when it gave one, else the 3rd period. Applied before the other finish levers. */
  fromRecord: { on: boolean; minWins: number }
  /** close bouts finish by how good they are (Kyle 2026-11-20): within maxGap, a pin (pinRank) when the higher WRR is
   *  under splitAt, a decision (decRank) at or above it. Runs before "finish from the records", which overrides it for
   *  a winner with enough record. */
  byLevel: { on: boolean; maxGap: number; splitAt: number; pinRank: number; decRank: number }
  /** outcome odds (Kyle 2026-11-20): the finish is the likeliest one for the projected winner, from an odds table of
   *  past bouts at the same rating level and spread (src/lib/projectionOdds.ts), shifted by each side's record; the
   *  top three outcomes come back with their odds. Overrides the other finish levers. The table is built from a
   *  season's tracked bouts when the version is saved. */
  odds: { on: boolean; minCell: number; recordK: number; table?: OddsTable | null
    /** how often the first wrestler won at each blended score (2-point steps, −40…+40), built when the version is
     *  saved: it sets each side's share of the odds, so the odds and the pick always agree (2026-11-20) */
    winCurve?: [number, number][] | null }
  /** the strength rating (src/lib/strengthRating.ts) as a fourth part of the blend: its chance for A, as a score from
   *  −40 to +40, weighted against the rest (weight 0.5 = half the blend) */
  strength: { on: boolean; weight: number }
  /** how pins and techs are ranked: 'clock' (by the period they ended in) or 'speed' (by how fast they are among their
   *  own kind, src/lib/speedBands.ts — "Pin under 0:25", "Tech 1:30–1:51"). Projection only: the WRR stays on the clock. */
  scale: 'clock' | 'speed'
  /** a speed version's band cutoffs, built from a season's tracked bouts when it's saved */
  bands?: BandCutoffs | null
  /** two buckets (Kyle 2026-11-20: "finish and decision. finish will defer to wrestler's most common finish. decision is
   *  more figurative. major at the high scale, ot at the low scale"): with outcome odds on, the projected winner's
   *  odds of a finish (pin + tech) against a decision (major + decision + OT) pick the bucket; a finish is the winner's
   *  own most common one (more techs than pins → tech, else pin); a decision follows the winner's chance — OT under
   *  otBelow, major from majorFrom, else a decision */
  buckets: { on: boolean; otBelow: number; majorFrom: number
    /** call a decision once its odds reach this share of the winner's outcomes (0.5 = only when likelier than a finish) */
    decisionFrom?: number }
  /** weight groups (src/lib/weightGroups.ts, Kyle 2026-11-20): with outcome odds on, each group's finish mix nudges the
   *  odds of each kind of win (285's decisions and OT, the light weights' techs) without changing who's favored; and a
   *  winner's own pin / tech record is blended with the group's mix, as if they had recordK more finishes shaped like
   *  it. The mix is built from a season's tracked bouts when the version is saved. */
  weight: { on: boolean; recordK: number; mix?: WeightMix | null }
  /** labels with the time or margin ("Pin 1:00–1:42", "4–7 Point Decision") or the win type only ("Pin", "Decision"),
   *  Kyle 2026-11-20: the time isn't really predicted — times still weight results in the WRR and the grading */
  showTimes: boolean
}

export const V1_PARAMS: ProjectionParams = {
  ladder: [38, 36, 34, 32, 30, 28, 26, 24, 22, 20, 18, 17, 13, 9, 5],
  weights: { all: [0.25, 0.25, 0.5], meetings: [0.5, 0.5], common: [0.5, 0.5] },
  tossUp: 0,
  finishStyle: { on: false, minWins: 8 },
  bonusCap: { on: false, minWins: 8, floorPct: 20 },
  hardToPin: { on: false, minLosses: 5, floorPct: 20 },
  fromRecord: { on: false, minWins: 5 },
  byLevel: { on: false, maxGap: 5, splitAt: 20, pinRank: 3, decRank: 15 },
  odds: { on: false, minCell: 40, recordK: 20, table: null },
  strength: { on: false, weight: 0.5 },
  scale: 'clock',
  showTimes: true,
  buckets: { on: false, otBelow: 0.55, majorFrom: 0.85, decisionFrom: 0.5 },
  weight: { on: false, recordK: 3, mix: null },
}

/** Saved settings may predate a lever: fill anything missing from version 1 */
export function withDefaults(p: Partial<ProjectionParams> | null | undefined): ProjectionParams {
  const q = p ?? {}
  return {
    ladder: Array.isArray(q.ladder) && q.ladder.length === 15 ? q.ladder.map(Number) : V1_PARAMS.ladder,
    weights: { ...V1_PARAMS.weights, ...(q.weights ?? {}) },
    tossUp: q.tossUp ?? V1_PARAMS.tossUp,
    finishStyle: { ...V1_PARAMS.finishStyle, ...(q.finishStyle ?? {}) },
    bonusCap: { ...V1_PARAMS.bonusCap, ...(q.bonusCap ?? {}) },
    hardToPin: { ...V1_PARAMS.hardToPin, ...(q.hardToPin ?? {}) },
    fromRecord: { ...V1_PARAMS.fromRecord, ...(q.fromRecord ?? {}) },
    byLevel: { ...V1_PARAMS.byLevel, ...(q.byLevel ?? {}) },
    odds: { ...V1_PARAMS.odds, ...(q.odds ?? {}) },
    strength: { ...V1_PARAMS.strength, ...(q.strength ?? {}) },
    scale: q.scale === 'speed' ? 'speed' : 'clock',
    bands: q.bands ?? null,
    showTimes: q.showTimes ?? true,
    buckets: { ...V1_PARAMS.buckets, ...(q.buckets ?? {}) },
    weight: { ...V1_PARAMS.weight, ...(q.weight ?? {}) },
  }
}

/** A result rank (1–32, from one wrestler's side) as a score from +40 (1st minute pin) to −40 */
export function rankToScore(rank: number): number {
  if (rank <= 12) return 42 - 2 * rank          // 40 … 18
  if (rank <= 16) return 4 * (17 - rank)         // 16, 12, 8, 4
  if (rank <= 20) return -4 * (rank - 16)        // -4, -8, -12, -16
  return -2 * rank + 24                          // -18 … -40
}

export function ladderRank(gap: number, ladder: number[]): number {
  for (let i = 0; i < ladder.length; i++) if (gap >= ladder[i]) return i + 1
  return 16
}

function nearestWinRank(absScore: number): number {
  let best = 1, bestDist = Math.abs(absScore - rankToScore(1))
  for (let r = 2; r <= 16; r++) { const d = Math.abs(absScore - rankToScore(r)); if (d < bestDist) { best = r; bestDist = d } }
  return best
}

export type FinishKind = 'pin' | 'tech' | 'major' | 'dec' | 'ot'
/** The kind of a winning rank (1–16) */
export function finishKind(rank: number): FinishKind {
  if (rank <= 12) return rank % 2 ? 'pin' : 'tech'
  return rank === 13 ? 'major' : rank <= 15 ? 'dec' : 'ot'
}

export type ProjectionInputs = {
  /** WRR going in; null when a wrestler has none */
  wrrA: number | null; wrrB: number | null
  /** average result score vs shared opponents (A's minus B's), null when none */
  common: number | null
  /** average result score of A's past meetings with B, null when none */
  meetings: number | null
  finA: Finishes; finB: Finishes
  /** strength ratings going in (src/lib/strengthRating.ts), when known */
  strA?: number | null; strB?: number | null
  /** the bout's weight group (src/lib/weightGroups.ts weightGroup), when known */
  weightGroup?: string | null
  /** who gets a dead-even projection (Kyle 2026-11-20: the home team in a dual, the lower seed at a tournament — it's
   *  a coin flip); without it a dead-even bout stays a toss-up */
  edge?: 'a' | 'b' | null
}

export type Projection = {
  winner: 'a' | 'b' | 'even'
  /** the projected result from the winner's side (1–16); null for a toss-up */
  rank: number | null
  label: string
  score: number
  componentWrr: number
  weights: { hammer: number; commonOpp: number; h2h: number }
  /** the levers that changed the result */
  levers: string[]
  /** with outcome odds on: the three likeliest outcomes ('a' / 'b' = who wins) */
  odds?: { winner: 'a' | 'b'; kind: string; pct: number }[]
}

/** The result rank an odds pick stands for (the most common result of that kind): on the clock a 1st period pin; on
 *  speed bands the 25–50% band */
const KIND_RANK: Record<string, number> = { pin: 3, tech: 8, major: 13, dec: 15, ot: 16 }
const KIND_RANK_SPEED: Record<string, number> = { pin: 7, tech: 8, major: 13, dec: 15, ot: 16 }

/** The first wrestler's chance to win at a blended score, from a version's win curve (thin steps lean toward even) */
export function curveChance(curve: [number, number][], score: number): number {
  const i = Math.max(0, Math.min(40, Math.round(score / 2) + 20))
  const [n, won] = curve[i] ?? [0, 0]
  const lean = score > 0 ? 0.6 : score < 0 ? 0.4 : 0.5
  return (won + 10 * lean) / (n + 10)
}

/** The buckets' pick (ProjectionParams.buckets) for the winner whose outcomes start at pr[from] */
function bucketRank(pr: number[], from: number, chanceW: number, f: Finishes, p: ProjectionParams, group?: string | null): number {
  const ranks = p.scale === 'speed' ? KIND_RANK_SPEED : KIND_RANK
  const finish = pr[from] + pr[from + 1], decision = pr[from + 2] + pr[from + 3] + pr[from + 4]
  if (decision / (finish + decision) < (p.buckets.decisionFrom ?? 0.5)) {
    // the winner's own pins vs techs, blended with their weight group's (as if recordK more finishes shaped like it)
    const gm = p.weight.on && p.weight.mix && group ? p.weight.mix.groups[group] : null
    const pinShare = gm && gm[0] + gm[1] > 0 ? gm[0] / (gm[0] + gm[1]) : null
    const pinScore = f.pins + (pinShare != null ? p.weight.recordK * pinShare : 0)
    const techScore = f.techs + (pinShare != null ? p.weight.recordK * (1 - pinShare) : 0)
    return ranks[techScore > pinScore ? 'tech' : 'pin']
  }
  return ranks[chanceW < p.buckets.otBelow ? 'ot' : chanceW >= p.buckets.majorFrom ? 'major' : 'dec']
}

/** A result rank's label on the version's scale */
const TYPE_LABEL: Record<string, string> = { pin: 'Pin', tech: 'Tech Fall', major: 'Major Decision', dec: 'Decision', ot: 'OT' }
export const projectionLabel = (rank: number, p: ProjectionParams) =>
  !p.showTimes ? TYPE_LABEL[finishKind(rank)]
    : p.scale === 'speed' && p.bands && rank <= 12 ? speedLabel(rank, p.bands) : OUTCOME_LABELS[rank] ?? 'Decision'

export function project(x: ProjectionInputs, p: ProjectionParams): Projection {
  let componentWrr = 0
  // exactly equal ratings are even (they used to give the first-listed wrestler the OT-win score, +4 — on a match
  // card, the away side; Kyle 2026-11-20: a coin flip goes to the home side)
  if (x.wrrA != null && x.wrrB != null && x.wrrA !== x.wrrB) {
    const diff = x.wrrA - x.wrrB
    const s = rankToScore(ladderRank(Math.abs(diff), p.ladder))
    componentWrr = diff >= 0 ? s : -s
  }
  const hasM = x.meetings != null, hasC = x.common != null
  let weights: Projection['weights'], score: number
  if (hasM && hasC) {
    const [h, c, m] = p.weights.all
    weights = { hammer: h, commonOpp: c, h2h: m }
    score = h * componentWrr + c * x.common! + m * x.meetings!
  } else if (hasM) {
    const [h, m] = p.weights.meetings
    weights = { hammer: h, commonOpp: 0, h2h: m }
    score = h * componentWrr + m * x.meetings!
  } else if (hasC) {
    const [h, c] = p.weights.common
    weights = { hammer: h, commonOpp: c, h2h: 0 }
    score = h * componentWrr + c * x.common!
  } else {
    weights = { hammer: 1, commonOpp: 0, h2h: 0 }
    score = componentWrr
  }
  if (p.strength.on && x.strA != null && x.strB != null) {
    const chance = 1 / (1 + 10 ** ((x.strB - x.strA) / 400))
    score = (1 - p.strength.weight) * score + p.strength.weight * 80 * (chance - 0.5)
  }
  score = Math.max(-40, Math.min(40, score))
  const even = score === 0 || Math.abs(score) <= p.tossUp
  if (even && !x.edge) {
    return { winner: 'even', rank: null, label: 'Toss-up', score, componentWrr, weights, levers: [] }
  }
  const winner: 'a' | 'b' = even ? x.edge! : score > 0 ? 'a' : 'b'
  const w = winner === 'a' ? x.finA : x.finB
  const l = winner === 'a' ? x.finB : x.finA
  let rank = even ? 16 : nearestWinRank(Math.abs(score))
  const levers: string[] = even ? ['edge'] : []
  if (p.byLevel.on && x.wrrA != null && x.wrrB != null && Math.abs(x.wrrA - x.wrrB) <= p.byLevel.maxGap) {
    const r = Math.max(x.wrrA, x.wrrB) < p.byLevel.splitAt ? p.byLevel.pinRank : p.byLevel.decRank
    if (r !== rank) { rank = r; levers.push('byLevel') }
  }
  if (p.fromRecord.on && w.wins >= p.fromRecord.minWins) {
    const lossShare = (n: number) => (l.losses ? n / l.losses : 0)
    const decs = w.wins - w.pins - w.techs - w.majors
    const lostByDec = l.losses - l.pinned - l.teched
    const odds: [FinishKind, number][] = [
      ['pin', (w.pins / w.wins) * (1 + lossShare(l.pinned))],
      ['tech', (w.techs / w.wins) * (1 + lossShare(l.teched))],
      ['major', (w.majors / w.wins) * (1 + lossShare(lostByDec))],
      ['dec', (decs / w.wins) * (1 + lossShare(lostByDec))],
    ]
    const kind = odds.sort((x, y) => y[1] - x[1])[0][0]
    if (kind !== finishKind(rank)) {
      const period = rank <= 12 ? Math.floor((rank - 1) / 2) : 5   // 0 = 1st minute … 5 = 3rd period
      rank = kind === 'pin' ? 2 * period + 1 : kind === 'tech' ? 2 * period + 2 : kind === 'major' ? 13 : Math.max(rank, 14) === 16 ? 15 : Math.max(rank, 14)
      levers.push('fromRecord')
    }
  }
  // finish style: the same period, his kind of finish
  if (p.finishStyle.on && rank <= 12 && w.wins >= p.finishStyle.minWins) {
    if (rank % 2 === 1 && w.techs > w.pins) { rank += 1; levers.push('finishStyle') }
    else if (rank % 2 === 0 && w.pins > w.techs) { rank -= 1; levers.push('finishStyle') }
  }
  // the loser rarely gets pinned
  if (p.hardToPin.on && rank <= 12 && rank % 2 === 1 && l.losses >= p.hardToPin.minLosses
      && 100 * l.pinned / l.losses < p.hardToPin.floorPct) { rank += 1; levers.push('hardToPin') }
  // rarely wins with bonus: no better than a major
  if (p.bonusCap.on && rank < 13 && w.wins >= p.bonusCap.minWins
      && 100 * (w.pins + w.techs) / w.wins < p.bonusCap.floorPct) { rank = 13; levers.push('bonusCap') }
  let odds: Projection['odds']
  if (p.odds.on && p.odds.table && x.wrrA != null && x.wrrB != null) {
    // the odds table reads the WRR favorite's side; outcomes 0–4 = favorite wins, 5–9 = underdog wins
    const aFav = x.wrrA >= x.wrrB
    const pr = oddsFor(p.odds.table, aFav ? x.wrrA : x.wrrB, aFav ? x.wrrB : x.wrrA, aFav ? x.finA : x.finB, aFav ? x.finB : x.finA,
      { minCell: p.odds.minCell, recordK: p.odds.recordK, useRecords: true })
    // the weight group's finish mix shifts how each side wins; each side keeps its chance to win
    const wf = p.weight.on && p.weight.mix ? weightFactor(p.weight.mix, x.weightGroup) : null
    if (wf) for (const from of [0, 5]) {
      const before = pr.slice(from, from + 5).reduce((s2, v) => s2 + v, 0)
      for (let k = 0; k < 5; k++) pr[from + k] *= wf[k]
      const after = pr.slice(from, from + 5).reduce((s2, v) => s2 + v, 0)
      if (after > 0) for (let k = 0; k < 5; k++) pr[from + k] *= before / after
    }
    const who = (fav: boolean): 'a' | 'b' => (fav === aFav ? 'a' : 'b')
    if (p.odds.winCurve && !even) {
      // each side's share of the odds = the full projection's chance (blend, strength), so the pick is the top line
      const chanceA = curveChance(p.odds.winCurve, score)
      const target = aFav ? chanceA : 1 - chanceA
      const favTot = pr.slice(0, 5).reduce((s2, v) => s2 + v, 0)
      for (let k = 0; k < 10; k++) pr[k] = k < 5 ? pr[k] * target / favTot : pr[k] * (1 - target) / (1 - favTot)
      if (p.buckets.on) {
        // the winner = the side with the better chance; then finish or decision (see ProjectionParams.buckets)
        const favWins = target >= 0.5
        const w = who(favWins), from = favWins ? 0 : 5, chanceW = favWins ? target : 1 - target
        odds = topOutcomes(pr, 3).map(t => ({ winner: who(t.favorite), kind: t.kind, pct: t.pct }))
        const r = bucketRank(pr, from, chanceW, w === 'a' ? x.finA : x.finB, p, x.weightGroup)
        levers.push('buckets')
        return { winner: w, rank: r, label: projectionLabel(r, p), score, componentWrr, weights, levers, odds }
      }
      const top = topOutcomes(pr, 3)
      odds = top.map(t => ({ winner: who(t.favorite), kind: t.kind, pct: t.pct }))
      const w = who(top[0].favorite), r = (p.scale === 'speed' ? KIND_RANK_SPEED : KIND_RANK)[top[0].kind]
      if (w !== winner) levers.push('odds-winner')
      if (r !== rank || w !== winner) levers.push('odds')
      return { winner: w, rank: r, label: projectionLabel(r, p), score, componentWrr, weights, levers, odds }
    }
    odds = topOutcomes(pr, 3).map(t => ({ winner: who(t.favorite), kind: t.kind, pct: t.pct }))
    // the finish: the likeliest way for the projected winner to win
    const from = (winner === 'a') === aFav ? 0 : 5
    if (p.buckets.on) {
      const r2 = bucketRank(pr, from, 0.5, winner === 'a' ? x.finA : x.finB, p, x.weightGroup)
      levers.push('buckets')
      return { winner, rank: r2, label: projectionLabel(r2, p), score, componentWrr, weights, levers, odds }
    }
    let best = 0
    for (let k = 1; k < 5; k++) if (pr[from + k] > pr[from + best]) best = k
    const r = (p.scale === 'speed' ? KIND_RANK_SPEED : KIND_RANK)[KIND_KEYS[best]]
    if (r !== rank) { rank = r; levers.push('odds') }
  }
  return { winner, rank, label: projectionLabel(rank, p), score, componentWrr, weights, levers, odds }
}
