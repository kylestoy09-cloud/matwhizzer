// Projection odds (Kyle 2026-11-20: "we can still have the prediction based on the likeliest of outcomes, but also
// show the % against the top 3 predictions … i don't want pin to be the guess for a 76 vs 77 … a 3v4 is fish on fish
// so the chance of pin makes sense"). Each bout gets odds over ten outcomes — the WRR favorite or the underdog winning
// by pin, tech, major, decision or OT — read from an odds table: what happened in past bouts at the same rating level
// (the favorite's WRR) and the same spread. Thin cells lean on the spread's overall mix. Each wrestler's own record
// then shifts how they win (never whether). The likeliest outcome is the pick; the top three are shown with their odds.
import { finishKind, type Finishes } from '@/lib/projection'

export const KIND_KEYS = ['pin', 'tech', 'major', 'dec', 'ot'] as const
export const KIND_WORD: Record<string, string> = { pin: 'Pin', tech: 'Tech', major: 'Major', dec: 'Decision', ot: 'OT' }
/** outcome index: 0–4 the favorite wins by pin … OT, 5–9 the underdog wins by pin … OT */
export const OUTCOME_COUNT = 10

export const LEVEL_EDGES = [10, 20, 30, 45, 60]          // favorite's WRR: under 10 · 10–20 · 20–30 · 30–45 · 45–60 · 60+
export const SPREAD_EDGES = [2, 5, 10, 16, 24, 32]       // spread: under 2 · 2–5 · 5–10 · 10–16 · 16–24 · 24–32 · 32+
export const LEVEL_NAMES = ['Under 10', '10–20', '20–30', '30–45', '45–60', '60+']
export const SPREAD_NAMES = ['Under 2', '2–5', '5–10', '10–16', '16–24', '24–32', '32+']

/** counts[level][spread][outcome], from past bouts */
export type OddsTable = { counts: number[][][]; bouts: number; builtFrom: string }
export type OddsOptions = { minCell: number; recordK: number; useRecords: boolean }
export const DEFAULT_ODDS: OddsOptions = { minCell: 40, recordK: 20, useRecords: true }

const band = (v: number, edges: number[]) => { const i = edges.findIndex(e => v < e); return i < 0 ? edges.length : i }
export const levelBand = (favWrr: number) => band(favWrr, LEVEL_EDGES)
export const spreadBand = (spread: number) => band(Math.abs(spread), SPREAD_EDGES)

/** A bout's outcome index from the favorite's side; rankFav is the favorite's result rank (1–16 won, 17–32 lost) */
export function outcomeIndex(rankFav: number): number {
  const k = KIND_KEYS.indexOf(finishKind(rankFav <= 16 ? rankFav : 33 - rankFav))
  return rankFav <= 16 ? k : 5 + k
}

export type OddsBout = { favWrr: number; dogWrr: number; rankFav: number }

export function buildOddsTable(bouts: OddsBout[], builtFrom: string): OddsTable {
  const counts = LEVEL_NAMES.map(() => SPREAD_NAMES.map(() => new Array(OUTCOME_COUNT).fill(0)))
  for (const b of bouts) counts[levelBand(b.favWrr)][spreadBand(b.favWrr - b.dogWrr)][outcomeIndex(b.rankFav)]++
  return { counts, bouts: bouts.length, builtFrom }
}

/** The odds (sum 1) of the ten outcomes for a favorite at favWrr against an underdog at dogWrr */
export function oddsFor(t: OddsTable, favWrr: number, dogWrr: number, finFav: Finishes | null, finDog: Finishes | null, o: OddsOptions = DEFAULT_ODDS): number[] {
  const li = levelBand(favWrr), si = spreadBand(favWrr - dogWrr)
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
  const cell = t.counts[li][si]
  // a thin cell leans on its neighbors — the rating levels and spreads next to it — and they in turn on the spread's
  // overall mix; never straight on the overall mix, which low-rated pins swamp (77 vs 76 came out a pin)
  const near = new Array(OUTCOME_COUNT).fill(0)
  for (let l = li - 1; l <= li + 1; l++) for (let sp = si - 1; sp <= si + 1; sp++) {
    const c = t.counts[l]?.[sp]; if (c) for (let k = 0; k < OUTCOME_COUNT; k++) near[k] += c[k]
  }
  const spreadAll = new Array(OUTCOME_COUNT).fill(0)
  for (const lv of t.counts) for (let k = 0; k < OUTCOME_COUNT; k++) spreadAll[k] += lv[si][k]
  const m = sum(spreadAll) || 1, nn = sum(near)
  const nearP = near.map((c, k) => (c + o.minCell * spreadAll[k] / m) / (nn + o.minCell))
  const n = sum(cell)
  let p = cell.map((c, k) => (c + o.minCell * nearP[k]) / (n + o.minCell))
  if (o.useRecords) {
    // how each side wins follows their own record, weighted by how much record there is; their chance to win stays
    const shift = (from: number, f: Finishes | null) => {
      if (!f || f.wins === 0) return
      const decs = f.wins - f.pins - f.techs - f.majors
      const own = [f.pins, f.techs, f.majors, Math.max(0, decs), 0].map(x => x / f.wins)
      const w = f.wins / (f.wins + o.recordK)
      const side = p.slice(from, from + 5), tot = side.reduce((a, b) => a + b, 0)
      if (tot <= 0) return
      for (let k = 0; k < 5; k++) {
        // OT stays as the table has it: a record says little about overtime
        p[from + k] = k === 4 ? side[4] : (1 - w) * side[k] + w * own[k] * (tot - side[4])
      }
    }
    shift(0, finFav)
    shift(5, finDog)
    const s = p.reduce((a, b) => a + b, 0)
    p = p.map(x => x / s)
  }
  return p
}

/** The top outcomes, likeliest first */
export function topOutcomes(p: number[], n = 3): { i: number; favorite: boolean; kind: string; pct: number }[] {
  return p.map((v, i) => ({ i, favorite: i < 5, kind: KIND_KEYS[i % 5], pct: 100 * v })).sort((a, b) => b.pct - a.pct).slice(0, n)
}
