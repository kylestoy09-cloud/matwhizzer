/**
 * bracketRouting.ts
 *
 * NJSIAA 32-man double-elimination bracket routing graph.
 *
 * This file encodes the complete structure of the NJSIAA state tournament
 * bracket: which seeds face each other in Round 1, and how winners/losers
 * flow through the championship and consolation brackets.
 *
 * CHAMPIONSHIP SIDE (rounds: R1 → R2 → QF → SF → F):
 *   - R1: 16 matches, 32 seeds paired per the standard NJSIAA draw
 *   - R2: 8 matches, winners of adjacent R1 pairs
 *   - QF: 4 matches, winners of adjacent R2 pairs
 *   - SF: 2 matches, winners of adjacent QF pairs
 *   - F:  1 match, winners of the two SFs
 *
 * CONSOLATION SIDE (rounds: C1 → C2 → C3 → C4 → C5 → C6):
 *   - C1: 8 matches — paired R1 losers face each other
 *   - C2: 8 matches — C1 winners face R2 losers (same bracket pod)
 *   - C3: 4 matches — adjacent C2 winner pairs face each other
 *   - C4: 4 matches — C3 winners face QF losers
 *   - C5: 2 matches — adjacent C4 winner pairs face each other
 *   - C6: 2 matches — C5 winners face SF losers
 *
 * PLACE MATCHES:
 *   - 3rd_Place: C6 winners face each other
 *   - 5th_Place: C6 losers face each other
 *   - 7th_Place: C5 losers face each other
 *
 * NOTE: The NJSIAA bracket may use crossover patterns in C2/C4/C6
 * (where consolation wrestlers face championship losers from the
 * opposite side of the bracket to avoid rematches). This file uses
 * same-side routing per the spec. If eligibility dropdowns don't
 * match the official PDF, the crossover pattern may need adjustment.
 * The admin can always select any entry via the full entry list.
 */

import type { MatchRecord, EntryRecord, BracketSlot, MatchStatus } from './types'

// ─── R1 Seed Matchups ──────────────────────────────────────────────
// Position index 0–15 maps to bout_number order (sorted ascending).
// Each pair is [seedA, seedB] — the two seeds that meet in that R1 slot.

// IMPORTANT: Each pair is [TOP, BOTTOM] — the fixed visual position
// within the match card. TOP is always listed first, BOTTOM second.
// This order is determined by the NJSIAA bracket draw, NOT by seed
// magnitude. For example slot 1 (pos 1) is TOP=17, BOTTOM=16.
export const R1_MATCHUPS: [number, number][] = [
  [1, 32],   // pos 0  — pod [1,32,17,16]
  [17, 16],  // pos 1
  [9, 24],   // pos 2  — pod [9,24,25,8]
  [25, 8],   // pos 3
  [5, 28],   // pos 4  — pod [5,28,21,12]
  [21, 12],  // pos 5
  [13, 20],  // pos 6  — pod [13,20,29,4]
  [29, 4],   // pos 7
  [3, 30],   // pos 8  — pod [3,30,19,14]
  [19, 14],  // pos 9
  [11, 22],  // pos 10 — pod [11,22,27,6]
  [27, 6],   // pos 11
  [7, 26],   // pos 12 — pod [7,26,23,10]
  [23, 10],  // pos 13
  [15, 18],  // pos 14 — pod [15,18,31,2]
  [31, 2],   // pos 15
]

// ─── Round Metadata ────────────────────────────────────────────────

export const CHAMPIONSHIP_ROUNDS = ['R1', 'R2', 'QF', 'SF', 'F'] as const
export const CONSOLATION_ROUNDS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'] as const
export const PLACE_ROUNDS = ['3rd_Place', '5th_Place', '7th_Place'] as const

export const ALL_ROUNDS = [
  ...CHAMPIONSHIP_ROUNDS,
  ...CONSOLATION_ROUNDS,
  ...PLACE_ROUNDS,
] as const

export const ROUND_LABELS: Record<string, string> = {
  R1: 'Round 1',
  R2: 'Round of 16',
  QF: 'Quarterfinals',
  SF: 'Semifinals',
  F: 'Final',
  C1: 'Con. Round 1',
  C2: 'Con. Round 2',
  C3: 'Con. QF',
  C4: 'Con. Cross-QF',
  C5: 'Con. SF',
  C6: 'Con. Cross-SF',
  '3rd_Place': '3rd Place',
  '5th_Place': '5th Place',
  '7th_Place': '7th Place',
}

/** Expected number of matches per round in a 32-man bracket. */
export const ROUND_MATCH_COUNT: Record<string, number> = {
  R1: 16, R2: 8, QF: 4, SF: 2, F: 1,
  C1: 8, C2: 8, C3: 4, C4: 4, C5: 2, C6: 2,
  '3rd_Place': 1, '5th_Place': 1, '7th_Place': 1,
}

// ─── Win Type Labels ───────────────────────────────────────────────

export const WIN_TYPE_OPTIONS = [
  'DEC', 'MD', 'TF', 'TF-1', 'TF-1.5', 'FALL',
  'SV-1', '2-OT', 'UTB', 'TB-1', 'TB-2',
  'INJ', 'DQ', 'FORF', 'BYE',
] as const

export const WIN_TYPE_LABELS: Record<string, string> = {
  DEC: 'Decision', MD: 'Major Decision',
  TF: 'Tech Fall', 'TF-1': 'Tech Fall (1pt)', 'TF-1.5': 'Tech Fall (1.5)',
  FALL: 'Fall',
  'SV-1': 'Sudden Victory', '2-OT': 'Double OT',
  UTB: 'Ultimate Tiebreaker', 'TB-1': 'Tiebreaker 1', 'TB-2': 'Tiebreaker 2',
  INJ: 'Injury Default', DQ: 'Disqualification', FORF: 'Forfeit', BYE: 'Bye',
}

/** Win types that require winner_score and loser_score. */
export const SCORED_WIN_TYPES = new Set([
  'DEC', 'MD', 'TF', 'TF-1', 'TF-1.5', 'SV-1', '2-OT', 'UTB', 'TB-1', 'TB-2',
])

/** Win types that use fall_time_seconds. */
export const TIMED_WIN_TYPES = new Set(['FALL', 'TF', 'TF-1', 'TF-1.5'])

// ─── Routing Graph ─────────────────────────────────────────────────
// For each match slot (round + position), defines where its two
// participants come from: a specific upstream match, taking the
// winner or loser of that match.

interface UpstreamSource {
  round: string
  position: number
  take: 'winner' | 'loser'
}

/**
 * For every round (except R1), maps each position to its two upstream
 * sources — the two match slots whose winner or loser feeds into this slot.
 */
export const ROUTING: Record<string, [UpstreamSource, UpstreamSource][]> = {
  // ── Championship: each round takes winners of adjacent pairs ─────
  R2: Array.from({ length: 8 }, (_, i) => [
    { round: 'R1', position: i * 2, take: 'winner' as const },
    { round: 'R1', position: i * 2 + 1, take: 'winner' as const },
  ]),
  QF: Array.from({ length: 4 }, (_, i) => [
    { round: 'R2', position: i * 2, take: 'winner' as const },
    { round: 'R2', position: i * 2 + 1, take: 'winner' as const },
  ]),
  SF: Array.from({ length: 2 }, (_, i) => [
    { round: 'QF', position: i * 2, take: 'winner' as const },
    { round: 'QF', position: i * 2 + 1, take: 'winner' as const },
  ]),
  F: [[
    { round: 'SF', position: 0, take: 'winner' },
    { round: 'SF', position: 1, take: 'winner' },
  ]],

  // ── Consolation Round 1: paired R1 losers ────────────────────────
  C1: Array.from({ length: 8 }, (_, i) => [
    { round: 'R1', position: i * 2, take: 'loser' as const },
    { round: 'R1', position: i * 2 + 1, take: 'loser' as const },
  ]),

  // ── Consolation Round 2: C1 winners meet R2 losers ───────────────
  // Same-pod routing (C2-i gets C1-i winner + R2-i loser).
  // TODO: NJSIAA may use crossover here (C2-i vs R2-(7-i) loser)
  // to avoid rematches. Adjust if eligibility doesn't match PDFs.
  C2: Array.from({ length: 8 }, (_, i) => [
    { round: 'C1', position: i, take: 'winner' as const },
    { round: 'R2', position: i, take: 'loser' as const },
  ]),

  // ── Con QF (C3): adjacent C2 winner pairs ────────────────────────
  C3: Array.from({ length: 4 }, (_, i) => [
    { round: 'C2', position: i * 2, take: 'winner' as const },
    { round: 'C2', position: i * 2 + 1, take: 'winner' as const },
  ]),

  // ── Con Cross-QF (C4): C3 winners meet QF losers ────────────────
  // TODO: May need crossover (C4-i vs QF-(3-i) loser).
  C4: Array.from({ length: 4 }, (_, i) => [
    { round: 'C3', position: i, take: 'winner' as const },
    { round: 'QF', position: i, take: 'loser' as const },
  ]),

  // ── Con SF (C5): adjacent C4 winner pairs ────────────────────────
  C5: Array.from({ length: 2 }, (_, i) => [
    { round: 'C4', position: i * 2, take: 'winner' as const },
    { round: 'C4', position: i * 2 + 1, take: 'winner' as const },
  ]),

  // ── Con Cross-SF (C6): C5 winners meet SF losers ─────────────────
  // TODO: May need crossover (C6-0 vs SF-1 loser, C6-1 vs SF-0 loser).
  C6: Array.from({ length: 2 }, (_, i) => [
    { round: 'C5', position: i, take: 'winner' as const },
    { round: 'SF', position: i, take: 'loser' as const },
  ]),

  // ── Place matches ────────────────────────────────────────────────
  '3rd_Place': [[
    { round: 'C6', position: 0, take: 'winner' },
    { round: 'C6', position: 1, take: 'winner' },
  ]],
  '5th_Place': [[
    { round: 'C6', position: 0, take: 'loser' },
    { round: 'C6', position: 1, take: 'loser' },
  ]],
  '7th_Place': [[
    { round: 'C5', position: 0, take: 'loser' },
    { round: 'C5', position: 1, take: 'loser' },
  ]],
}

// ─── Eligibility Logic ─────────────────────────────────────────────

/**
 * Groups matches by round and sorts by bout_number within each round.
 * Returns a Map<round, MatchRecord[]> where array index = position.
 */
export function groupMatchesByRound(
  matches: MatchRecord[]
): Map<string, MatchRecord[]> {
  const map = new Map<string, MatchRecord[]>()
  for (const m of matches) {
    const arr = map.get(m.round) ?? []
    arr.push(m)
    map.set(m.round, arr)
  }
  // Sort each round's matches by bout_number
  for (const [, arr] of map) {
    arr.sort((a, b) => (a.bout_number ?? 0) - (b.bout_number ?? 0))
  }
  return map
}

/**
 * Returns the match at a given bracket slot, or null.
 */
function findMatch(
  round: string,
  position: number,
  byRound: Map<string, MatchRecord[]>
): MatchRecord | null {
  return byRound.get(round)?.[position] ?? null
}

/**
 * Returns the hard-capped theoretical seed pool for a bracket slot.
 * This is the maximum set of seeds that can EVER appear in this slot,
 * regardless of match results. Used to enforce strict dropdown scoping.
 *
 * Example: SF-0 (top half) → seeds {1,32,17,16,9,24,25,8,5,28,21,12,13,20,29,4}
 *          SF-1 (bottom half) → seeds {3,30,19,14,11,22,27,6,7,26,23,10,15,18,31,2}
 */
export function getTheoreticalSeeds(round: string, position: number): number[] {
  if (round === 'R1') {
    const pair = R1_MATCHUPS[position]
    return pair ? [...pair] : []
  }
  const sources = ROUTING[round]?.[position]
  if (!sources) return []
  const seeds: number[] = []
  for (const source of sources) {
    // For 'winner' or 'loser' take — the theoretical pool is the
    // same: all seeds that could appear in the upstream slot.
    seeds.push(...getTheoreticalSeeds(source.round, source.position))
  }
  return [...new Set(seeds)]
}

/**
 * Returns the entry IDs that could legitimately appear in a given
 * bracket slot based on the routing graph and confirmed upstream results.
 *
 * STRICT SCOPING: The result is always a subset of the slot's theoretical
 * seed pool. No "all entries" fallback — the maximum is the seed pool cap.
 *
 * DB-AWARE NARROWING: If upstream matches have confirmed winners/losers,
 * the pool is narrowed further to only those who actually advanced.
 */
export function getEligibleEntryIds(
  round: string,
  position: number,
  byRound: Map<string, MatchRecord[]>,
  entryBySeed: Map<number, EntryRecord>
): string[] {
  // Base case: R1 uses direct seed matchups
  if (round === 'R1') {
    const pair = R1_MATCHUPS[position]
    if (!pair) return []
    const ids: string[] = []
    for (const seed of pair) {
      const entry = entryBySeed.get(seed)
      if (entry) ids.push(entry.id)
    }
    return ids
  }

  const sources = ROUTING[round]?.[position]
  if (!sources) return []

  // Compute the hard seed cap for this slot
  const seedCap = new Set(getTheoreticalSeeds(round, position))

  const ids: string[] = []

  for (const source of sources) {
    const upstreamMatch = findMatch(source.round, source.position, byRound)

    if (source.take === 'winner') {
      if (upstreamMatch?.winner_entry_id) {
        ids.push(upstreamMatch.winner_entry_id)
      } else {
        // No confirmed winner — include full upstream pool (already capped by recursion)
        ids.push(
          ...getEligibleEntryIds(source.round, source.position, byRound, entryBySeed)
        )
      }
    } else {
      // take === 'loser'
      if (upstreamMatch?.loser_entry_id) {
        ids.push(upstreamMatch.loser_entry_id)
      } else if (upstreamMatch?.winner_entry_id) {
        // Winner known but loser not recorded — loser is everyone
        // in the upstream pool EXCEPT the winner
        const pool = getEligibleEntryIds(
          source.round, source.position, byRound, entryBySeed
        )
        ids.push(...pool.filter(id => id !== upstreamMatch.winner_entry_id))
      } else {
        // Nothing known — include full upstream pool
        ids.push(
          ...getEligibleEntryIds(source.round, source.position, byRound, entryBySeed)
        )
      }
    }
  }

  // Enforce hard seed cap: only include entries whose seed is in the theoretical pool
  const filtered = [...new Set(ids)].filter(id => {
    const entry = [...entryBySeed.values()].find(e => e.id === id)
    return entry?.seed != null && seedCap.has(entry.seed)
  })

  return filtered
}

// ─── Bracket Slot Builder ──────────────────────────────────────────

function getMatchStatus(match: MatchRecord | null): MatchStatus {
  if (!match) return 'empty'
  if (!match.winner_entry_id || !match.loser_entry_id) return 'broken'
  if (!match.win_type) return 'partial'
  return 'complete'
}

/**
 * Builds the full array of bracket slots for all rounds, mapping
 * existing DB matches to their positional slots and creating empty
 * slots where no match record exists.
 */
export function buildBracketSlots(matches: MatchRecord[]): BracketSlot[] {
  const byRound = groupMatchesByRound(matches)
  const slots: BracketSlot[] = []

  for (const round of ALL_ROUNDS) {
    const expected = ROUND_MATCH_COUNT[round] ?? 0
    const roundMatches = byRound.get(round) ?? []

    for (let pos = 0; pos < expected; pos++) {
      const match = roundMatches[pos] ?? null
      slots.push({
        round,
        position: pos,
        match,
        status: getMatchStatus(match),
      })
    }
  }

  return slots
}

// ─── Display Helpers ───────────────────────────────────────────────

/** Format fall_time_seconds as M:SS. */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Parse "M:SS" string to total seconds, or null. */
export function parseTime(str: string): number | null {
  const match = str.match(/^(\d+):(\d{1,2})$/)
  if (!match) return null
  return parseInt(match[1]) * 60 + parseInt(match[2])
}

/** Build a short result string for a match card (e.g. "DEC 8-3", "FALL 2:14"). */
export function formatResult(match: MatchRecord): string {
  if (!match.win_type) return ''
  const wt = match.win_type

  if (wt === 'FALL') {
    return match.fall_time_seconds != null
      ? `FALL ${formatTime(match.fall_time_seconds)}`
      : 'FALL'
  }

  if (SCORED_WIN_TYPES.has(wt) && match.winner_score != null && match.loser_score != null) {
    const time = TIMED_WIN_TYPES.has(wt) && match.fall_time_seconds != null
      ? ` ${formatTime(match.fall_time_seconds)}`
      : ''
    return `${wt} ${match.winner_score}-${match.loser_score}${time}`
  }

  return wt
}

/** Format entry as "(seed) Last, First — School" for dropdown display. */
export function formatEntryLabel(entry: EntryRecord): string {
  const seed = entry.seed != null ? `(${entry.seed}) ` : ''
  const name = `${entry.wrestlerLast}, ${entry.wrestlerFirst}`
  const school = entry.schoolName ? ` — ${entry.schoolName}` : ''
  return `${seed}${name}${school}`
}
