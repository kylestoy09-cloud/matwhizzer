/**
 * bracketOrder.ts
 *
 * NJSIAA bracket slot ordering by seed.
 *
 * The bracket path is locked to the SLOT, not the seed. When an upset
 * happens, the winner inherits the loser's slot position and follows
 * that slot's path for all subsequent rounds. Ordering in every round
 * is derived from the original R1 slot index (0-31), never re-ranked
 * by seed.
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

// seed → original R1 slot index (0-31)
const SEED_TO_SLOT = new Map<number, number>()
for (let i = 0; i < SLOT_ORDER_32.length; i++) {
  SEED_TO_SLOT.set(SLOT_ORDER_32[i], i)
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
 * Get the original R1 slot index for an entry based on its seed.
 * Returns 999 for null/unknown seeds (pushed to end).
 */
function slotOf(seed: number | null): number {
  if (seed == null) return 999
  return SEED_TO_SLOT.get(seed) ?? 999
}

/**
 * Get the minimum original R1 slot index among a match's participants.
 * This determines the match's position within its round — the match
 * containing the entry from the lower slot always appears higher
 * (closer to the top of the bracket).
 */
function matchSlotKey(m: MatchLike, entrySlot: Map<string, number>): number {
  let best = 999
  if (m.winner_entry_id) {
    const s = entrySlot.get(m.winner_entry_id)
    if (s != null && s < best) best = s
  }
  if (m.loser_entry_id) {
    const s = entrySlot.get(m.loser_entry_id)
    if (s != null && s < best) best = s
  }
  return best
}

/**
 * Orders championship matches for bracket display.
 *
 * 1. Every entry is assigned an immutable slot index from R1 based on
 *    its seed (using SLOT_ORDER_32). This slot index never changes —
 *    upset winners inherit the slot path of the position they won into.
 *
 * 2. R1 matches are sorted by the lower slot index of their two entries.
 *
 * 3. For R2 and beyond, each entry keeps its original R1 slot index.
 *    Matches are sorted by the minimum slot index among their participants.
 *    Within a match, the entry from the lower slot index is the "top"
 *    participant and the higher slot index is "bottom" — but since the
 *    DB stores winner/loser (not top/bottom), the visual rendering
 *    handles that separately.
 */
export type BracketOrderResult<T> = {
  byRound: Map<string, T[]>
  /** Maps entry_id → original R1 slot index (0-31). Lower = higher on bracket. */
  entrySlot: Map<string, number>
}

export function orderChampMatchesBySeed<T extends MatchLike>(
  allChamp: T[],
  bracketSize: 32 | 16 = 32,
): BracketOrderResult<T> {
  const byRound = new Map<string, T[]>()
  for (const m of allChamp) {
    const list = byRound.get(m.round) ?? []
    list.push(m)
    byRound.set(m.round, list)
  }

  const entrySlot = new Map<string, number>()

  if (bracketSize === 32) {
    // Assign every entry an immutable slot index from their seed in R1.
    // This map persists across all rounds — entries never get re-indexed.

    // Phase 1: Seed all entries from R1 matches
    const r1 = byRound.get('R1') ?? []
    for (const m of r1) {
      if (m.winner_entry_id && m.winner_seed != null) {
        entrySlot.set(m.winner_entry_id, slotOf(m.winner_seed))
      }
      if (m.loser_entry_id && m.loser_seed != null) {
        entrySlot.set(m.loser_entry_id, slotOf(m.loser_seed))
      }
    }

    // Phase 2: For entries in later rounds that weren't in R1 (shouldn't
    // happen in a normal bracket, but handle gracefully), assign slot
    // from their seed if available.
    for (const m of allChamp) {
      if (m.winner_entry_id && !entrySlot.has(m.winner_entry_id) && m.winner_seed != null) {
        entrySlot.set(m.winner_entry_id, slotOf(m.winner_seed))
      }
      if (m.loser_entry_id && !entrySlot.has(m.loser_entry_id) && m.loser_seed != null) {
        entrySlot.set(m.loser_entry_id, slotOf(m.loser_seed))
      }
    }

    // Sort every round by the minimum slot index of the match's participants.
    // This preserves the bracket path structure across all rounds.
    for (const [, matches] of byRound) {
      matches.sort((a, b) => matchSlotKey(a, entrySlot) - matchSlotKey(b, entrySlot))
    }
  }

  return { byRound, entrySlot }
}
