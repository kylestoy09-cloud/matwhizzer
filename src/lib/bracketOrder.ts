/**
 * bracketOrder.ts
 *
 * NJSIAA bracket slot ordering by seed.
 * Defines the exact top-to-bottom visual order for R1 matches
 * based on the standard 32-man and 16-man bracket draws.
 */

// 32-man bracket: R1 slot order by [top_seed, bottom_seed]
// Each pair of adjacent slots forms a pod that feeds one R2 match.
const R1_32_SLOTS: [number, number][] = [
  [1, 32], [17, 16],   // pod 1 → R2-0
  [9, 24], [25, 8],    // pod 2 → R2-1
  [5, 28], [21, 12],   // pod 3 → R2-2
  [13, 20], [29, 4],   // pod 4 → R2-3
  [3, 30], [19, 14],   // pod 5 → R2-4
  [11, 22], [27, 6],   // pod 6 → R2-5
  [7, 26], [23, 10],   // pod 7 → R2-6
  [15, 18], [31, 2],   // pod 8 → R2-7
]

// 16-man bracket: QF slot order (R1 = play-in, QF is the main bracket start)
const QF_16_SLOTS: [number, number][] = [
  [1, 8], [5, 4],    // pod 1 → SF-0
  [3, 6], [7, 2],    // pod 2 → SF-1
]

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
 * Returns the slot index (0-based top-to-bottom position) for an R1 match
 * in a 32-man bracket, based on the seeds present in that match.
 */
function r1SlotIndex32(m: MatchLike): number {
  const seeds = new Set<number>()
  if (m.winner_seed != null) seeds.add(m.winner_seed)
  if (m.loser_seed != null) seeds.add(m.loser_seed)

  for (let i = 0; i < R1_32_SLOTS.length; i++) {
    const [a, b] = R1_32_SLOTS[i]
    if (seeds.has(a) || seeds.has(b)) return i
  }
  return 999 // unknown seed — push to end
}

/**
 * Orders championship matches for bracket display.
 *
 * Strategy:
 * 1. R1 matches are sorted by seed-based slot position (deterministic)
 * 2. R2 matches inherit order from their R1 feeder pods (pos 0,1 → R2-0, etc.)
 * 3. QF/SF/F inherit naturally from R2 order
 *
 * This replaces the fragile DFS-through-winner-linkage approach that breaks
 * when forfeit matches have NULL loser_entry_id.
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
    // Sort R1 by seed-based slot position
    const r1 = byRound.get('R1') ?? []
    r1.sort((a, b) => r1SlotIndex32(a) - r1SlotIndex32(b))

    // Build entry→R1 position map for propagation
    const entryToR1Pos = new Map<string, number>()
    for (let i = 0; i < r1.length; i++) {
      if (r1[i].winner_entry_id) entryToR1Pos.set(r1[i].winner_entry_id!, i)
      if (r1[i].loser_entry_id) entryToR1Pos.set(r1[i].loser_entry_id!, i)
    }

    // R2: each R2 match gets the pod index of its participants (R1 pos / 2)
    const r2 = byRound.get('R2') ?? []
    r2.sort((a, b) => {
      const aPos = getPodPos(a, entryToR1Pos, 2)
      const bPos = getPodPos(b, entryToR1Pos, 2)
      return aPos - bPos
    })

    // Build entry→R2 position for QF
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

  // For 16-man brackets, R2 is the first round displayed and QF follows
  // The DFS approach works better here since seeds aren't always available
  // Keep existing order (already sorted by whatever came from DB)

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
