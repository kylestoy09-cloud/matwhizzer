// Bracket bouts in the order they were wrestled (review 2026-11-20). A tournament's bouts used to replay in id order —
// random — so a wrestler's "pre-match" WRR for a quarterfinal could already hold that day's semifinal. Each wrestler's
// own bouts have a fixed order — championship rounds first (R1 → QF → SF → F), then consolation rounds (C1 → … → 3rd)
// — and ratings only move for the two wrestlers in a bout, so replaying in any order that keeps every wrestler's own
// sequence is exact: each bout sees each wrestler's earlier bouts and nothing later. Labels vary by bracket (C3 is
// the consolation semi in some, not others), which doesn't matter: only one wrestler's own sequence is ever compared.

// championship side: earlier rounds lower
const CHAMP: Record<string, number> = {
  R128: 1, R64: 2, R32: 3, R1: 3, 'Round 1': 3, '20th Round': 3,
  R16: 4, R2: 4, 'Round 2': 4, 'Round 16': 4, '16th Round': 4,
  R3: 5, 'Round 3': 5, R4: 6, 'Round 4': 6, R5: 7, 'Round 8': 8,
  QF: 8, SF: 9, F: 20, '2nd_Place_Match': 21,
}
// consolation side, after any championship bout
const CONS: Record<string, number> = {
  'Cons. 1st': 101, CQF: 109, 'Cons. Quarters': 109, CSF: 110, 'Cons. Semis': 110, CF: 111,
  '3rd_Place': 112, '5th_Place': 112, '7th_Place': 112, 'Cons._3rd': 112, PL: 113,
}

/** Where a round label falls in one wrestler's own sequence (unknown labels last) */
export function roundStep(round: string | null | undefined): number {
  const r = (round ?? '').trim()
  if (r in CHAMP) return CHAMP[r]
  if (r in CONS) return CONS[r]
  const c = /^C(\d+)$/.exec(r)
  if (c) return 100 + Number(c[1])            // C1 … C16
  return 200                                  // UNK, Cross_Bracket, anything new
}

/** The bouts in an order that keeps every wrestler's own sequence; ties go to the earlier round, then the given order */
export function orderBouts<T>(bouts: T[], round: (b: T) => string | null | undefined, wrestlers: (b: T) => (string | null | undefined)[]): T[] {
  const step = bouts.map(b => roundStep(round(b)))
  // each wrestler's bouts in their own order → an edge from each to the next
  const byWrestler = new Map<string, number[]>()
  bouts.forEach((b, i) => { for (const w of wrestlers(b)) if (w) (byWrestler.get(w) ?? byWrestler.set(w, []).get(w)!).push(i) })
  const next = bouts.map(() => [] as number[]), waiting = bouts.map(() => 0)
  for (const list of byWrestler.values()) {
    list.sort((x, y) => step[x] - step[y] || x - y)
    for (let k = 1; k < list.length; k++) { next[list[k - 1]].push(list[k]); waiting[list[k]]++ }
  }
  // repeatedly take the earliest-round bout with nothing left before it
  const ready = bouts.map((_, i) => i).filter(i => waiting[i] === 0)
  const out: T[] = []
  while (ready.length) {
    let best = 0
    for (let k = 1; k < ready.length; k++) if (step[ready[k]] < step[ready[best]] || (step[ready[k]] === step[ready[best]] && ready[k] < ready[best])) best = k
    const i = ready.splice(best, 1)[0]
    out.push(bouts[i])
    for (const j of next[i]) if (--waiting[j] === 0) ready.push(j)
  }
  return out
}
