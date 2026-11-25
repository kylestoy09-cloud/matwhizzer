// Strength rating (review 2026-11-20): a "who beats whom" rating for projections, beside the WRR (the resume, which
// stays as it is). Elo-style: every bout moves both wrestlers by how surprising the result was — a win over a stronger
// opponent moves more — and a bonus win moves more than a decision. A wrestler starts the season at 1500 nudged by the
// WRR they had at their first bout (what's known going in). Updated a whole day at a time, so a bout only ever sees
// earlier days. On 2025-26 it picked the winner of NJ-vs-NJ bouts 79.2% boys / 75.3% girls (the WRR's own pick 76.2 /
// 72.7%) — scripts/strength_rating_test_20261120.mts.
export const STRENGTH_K = 40
export const STRENGTH_START = 1500
export const STRENGTH_PER_WRR = 8

/** Bigger moves for bonus wins; rank is either side's result rank (1–32) */
export function marginWeight(rank: number): number {
  const r = rank <= 16 ? rank : 33 - rank
  return r <= 12 ? (r % 2 ? 1.5 : 1.4) : r === 13 ? 1.25 : r <= 15 ? 1.0 : 0.8   // pin, tech, major, decision, OT
}

/** The chance the first wrestler beats the second */
export const winChance = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400))

export type StrengthLogRow = { wrestler_id: string; opponent_wrestler_id: string | null; match_date: string; outcome_rank: number; pre_match_hammer: number }

/** Run a season's log: each wrestler's strength going into each day they wrestled, and where everyone ended */
export function runStrength(log: StrengthLogRow[]): { before: (wrestlerId: string, day: string) => number; final: Map<string, { strength: number; bouts: number }> } {
  const rows = [...log].sort((a, b) => a.match_date.localeCompare(b.match_date))
  const startWrr = new Map<string, number>()
  for (const r of rows) if (!startWrr.has(r.wrestler_id)) startWrr.set(r.wrestler_id, r.pre_match_hammer)
  const strength = new Map<string, number>(), bouts = new Map<string, number>()
  const get = (id: string) => strength.get(id) ?? STRENGTH_START + STRENGTH_PER_WRR * (startWrr.get(id) ?? 0)
  // strength going into a day = after every earlier day
  const history = new Map<string, { day: string; value: number }[]>()
  const byDay = new Map<string, StrengthLogRow[]>()
  for (const r of rows) if (r.opponent_wrestler_id && r.outcome_rank <= 16) (byDay.get(r.match_date) ?? byDay.set(r.match_date, []).get(r.match_date)!).push(r)
  for (const day of [...byDay.keys()].sort()) {
    const delta = new Map<string, number>()
    for (const r of byDay.get(day)!) {
      const w = r.wrestler_id, l = r.opponent_wrestler_id!
      const move = STRENGTH_K * marginWeight(r.outcome_rank) * (1 - winChance(get(w), get(l)))
      delta.set(w, (delta.get(w) ?? 0) + move); delta.set(l, (delta.get(l) ?? 0) - move)
      bouts.set(w, (bouts.get(w) ?? 0) + 1); bouts.set(l, (bouts.get(l) ?? 0) + 1)
    }
    for (const [id, dv] of delta) {
      const v = get(id) + dv
      strength.set(id, v)
      ;(history.get(id) ?? history.set(id, []).get(id)!).push({ day, value: v })
    }
  }
  const before = (id: string, day: string) => {
    const h = history.get(id)
    let v = STRENGTH_START + STRENGTH_PER_WRR * (startWrr.get(id) ?? 0)
    if (h) for (const x of h) { if (x.day < day) v = x.value; else break }
    return v
  }
  const final = new Map<string, { strength: number; bouts: number }>()
  for (const id of new Set([...startWrr.keys()])) final.set(id, { strength: get(id), bouts: bouts.get(id) ?? 0 })
  return { before, final }
}
