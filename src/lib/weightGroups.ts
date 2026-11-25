// Weight groups for projections (Kyle 2026-11-20). How bouts end shifts with weight — boys techs 17% at 106 vs 3% at
// 285, decisions + OT highest at 285; girls pins 80% at 100 → 89% at 235 — while who wins doesn't. Boys groups are
// Kyle's; girls mirror them (lightest alone, pairs through the middle, the top pair, heavyweight alone).
import { WEIGHT_ORDER_BOYS, WEIGHT_ORDER_GIRLS } from '@/lib/hammerScore'

export const WEIGHT_GROUPS: Record<'M' | 'F', { label: string; classes: number[] }[]> = {
  M: [
    { label: '106', classes: [106] }, { label: '113–120', classes: [113, 120] }, { label: '126–132', classes: [126, 132] },
    { label: '138–144', classes: [138, 144] }, { label: '150–157', classes: [150, 157] }, { label: '165–175', classes: [165, 175] },
    { label: '190–215', classes: [190, 215] }, { label: '285', classes: [285] },
  ],
  F: [
    { label: '100', classes: [100] }, { label: '107–114', classes: [107, 114] }, { label: '120–126', classes: [120, 126] },
    { label: '132–138', classes: [132, 138] }, { label: '145–152', classes: [145, 152] }, { label: '165–185', classes: [165, 185] },
    { label: '235', classes: [235] },
  ],
}

/** A bout's weight group (its weight snapped to the nearest class on the side's ladder); null without a weight */
export function weightGroup(g: 'M' | 'F', weight: number | null | undefined): string | null {
  if (weight == null || !Number.isFinite(weight) || weight <= 0) return null
  const ladder = g === 'F' ? WEIGHT_ORDER_GIRLS : WEIGHT_ORDER_BOYS
  const c = ladder.reduce((b, x) => (Math.abs(x - weight) < Math.abs(b - weight) ? x : b))
  return WEIGHT_GROUPS[g].find(grp => grp.classes.includes(c))?.label ?? null
}

/** How bouts ended, by weight group and overall: shares of pin / tech / major / dec / ot (index 0–4) */
export type WeightMix = { groups: Record<string, number[]>; overall: number[] }

/** A season's mix from its bouts' groups and winning result ranks (1–16) */
export function buildWeightMix(bouts: { group: string | null; rank: number }[], kindIndex: (rank: number) => number): WeightMix {
  const groups: Record<string, number[]> = {}, overall = [0, 0, 0, 0, 0]
  for (const b of bouts) {
    const k = kindIndex(b.rank)
    overall[k]++
    if (b.group) (groups[b.group] ??= [0, 0, 0, 0, 0])[k]++
  }
  const share = (xs: number[]) => { const t = xs.reduce((a, c) => a + c, 0) || 1; return xs.map(x => x / t) }
  return { groups: Object.fromEntries(Object.entries(groups).map(([g, xs]) => [g, share(xs)])), overall: share(overall) }
}

/** How a group's finishes compare with the whole side's, per kind (1 = the same) */
export function weightFactor(mix: WeightMix, group: string | null | undefined): number[] | null {
  const m = group ? mix.groups[group] : null
  if (!m) return null
  return m.map((v, k) => (mix.overall[k] > 0 ? v / mix.overall[k] : 1))
}
