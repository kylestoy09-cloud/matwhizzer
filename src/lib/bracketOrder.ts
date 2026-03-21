/**
 * bracketOrder.ts
 *
 * NJSIAA bracket slot ordering by seed.
 * Defines the exact top-to-bottom visual order for bracket matches
 * based on the standard 32-man and 16-man bracket draws.
 */

// The array index is the slot position (0-31), the value is the seed
// that belongs in that slot. Adjacent pairs form R1 matches:
// slots [0,1] = match 0, slots [2,3] = match 1, etc.
const SLOT_ORDER_32 = [
   1, 32, 17, 16,
   9, 24, 25,  8,
   5, 28, 21, 12,
  13, 20, 29,  4,
   3, 30, 19, 14,
  11, 22, 27,  6,
   7, 26, 23, 10,
  15, 18, 31,  2,
]

// Build seed → slot index lookup
const SEED_TO_SLOT_32 = new Map<number, number>()
for (let i = 0; i < SLOT_ORDER_32.length; i++) {
  SEED_TO_SLOT_32.set(SLOT_ORDER_32[i], i)
}

// Build seed → R1 match index (each pair of slots is one match)
const SEED_TO_R1_MATCH_32 = new Map<number, number>()
for (let i = 0; i < SLOT_ORDER_32.length; i++) {
  SEED_TO_R1_MATCH_32.set(SLOT_ORDER_32[i], Math.floor(i / 2))
}

type MatchLike = {
  match_id: string
  round: string
  winner_seed: number | null
  loser_seed: number | null
  winner_entry_id: string | null
  loser_entry_id: string | null
  [key: string]: unknown
}

/**
 * Returns the R1 match index (0-15) for a match based on the seeds present.
 * Uses the lowest slot index of either participant's seed.
 */
function r1MatchIndex(m: MatchLike): number {
  let best = 999
  for (const seed of [m.winner_seed, m.loser_seed]) {
    if (seed == null) continue
    const idx = SEED_TO_R1_MATCH_32.get(seed)
    if (idx != null && idx < best) best = idx
  }
  return best
}

/**
 * Orders championship matches for bracket display.
 *
 * R1 matches are sorted by seed-based match index (deterministic from
 * the NJSIAA 32-man bracket draw). Later rounds inherit order by
 * tracking which R1 pod each entry came from and propagating forward.
 *
 * Entries with null seeds or seeds not in the bracket are pushed to the end.
 */
export function orderChampMatchesBySeed<T extends MatchLike>(
  allChamp: T[],
  bracketSize: 32 | 16 = 32,
): Map<string, T[]> {
  const byRound = new Map<string, T[]>()
  for (const m of allChamp) {
    const list = byRound.get(m.round) ?? []
    list.push(m)
    byRound.set(m.round, list)
  }

  if (bracketSize === 32) {
    // Sort R1 by seed-based match index
    const r1 = byRound.get('R1') ?? []
    r1.sort((a, b) => r1MatchIndex(a) - r1MatchIndex(b))

    // Build entry → R1 match position for propagation to later rounds
    const entryToR1Pos = new Map<string, number>()
    for (let i = 0; i < r1.length; i++) {
      if (r1[i].winner_entry_id) entryToR1Pos.set(r1[i].winner_entry_id!, i)
      if (r1[i].loser_entry_id) entryToR1Pos.set(r1[i].loser_entry_id!, i)
    }

    // R2: sort by pod (pairs of adjacent R1 matches feed one R2 match)
    const r2 = byRound.get('R2') ?? []
    r2.sort((a, b) => getPodPos(a, entryToR1Pos, 2) - getPodPos(b, entryToR1Pos, 2))

    const entryToR2Pos = new Map<string, number>()
    for (let i = 0; i < r2.length; i++) {
      if (r2[i].winner_entry_id) entryToR2Pos.set(r2[i].winner_entry_id!, i)
      if (r2[i].loser_entry_id) entryToR2Pos.set(r2[i].loser_entry_id!, i)
    }

    // QF
    const qf = byRound.get('QF') ?? []
    qf.sort((a, b) => getPodPos(a, entryToR2Pos, 2) - getPodPos(b, entryToR2Pos, 2))

    const entryToQFPos = new Map<string, number>()
    for (let i = 0; i < qf.length; i++) {
      if (qf[i].winner_entry_id) entryToQFPos.set(qf[i].winner_entry_id!, i)
      if (qf[i].loser_entry_id) entryToQFPos.set(qf[i].loser_entry_id!, i)
    }

    // SF
    const sf = byRound.get('SF') ?? []
    sf.sort((a, b) => getPodPos(a, entryToQFPos, 2) - getPodPos(b, entryToQFPos, 2))
  }

  return byRound
}

/** Get the minimum pod position of a match's participants in the previous round. */
function getPodPos(
  m: MatchLike,
  entryToPrevPos: Map<string, number>,
  podSize: number,
): number {
  let minPos = 999
  if (m.winner_entry_id) {
    const pos = entryToPrevPos.get(m.winner_entry_id)
    if (pos != null) minPos = Math.min(minPos, Math.floor(pos / podSize))
  }
  if (m.loser_entry_id) {
    const pos = entryToPrevPos.get(m.loser_entry_id)
    if (pos != null) minPos = Math.min(minPos, Math.floor(pos / podSize))
  }
  return minPos
}
