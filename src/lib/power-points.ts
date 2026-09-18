/**
 * NJSIAA Wrestling Power Points formula.
 *
 * Source: 2025-26 Boys Wrestling Regular Season/Team Tournament Regulations,
 * pages 5-6. Implements the Ranking Scale lookup used to determine how many
 * Power Points each dual meet is worth.
 *
 * Final Power Points = average of best 9 qualifying meet values.
 */

// ── Ranking Scale ─────────────────────────────────────────────────────────────
//
// Rows  → opponent's Power Rating band (index 0 = 32.00+, index 19 = <23.00)
// Cols  → 0:Win19+  1:Win13-18  2:Win7-12  3:Win1-6
//           4:Loss1-6  5:Loss7-12  6:Loss13-18  7:Loss19-29  8:Loss30-39  9:Loss40+

const RANKING_SCALE: readonly (readonly number[])[] = [
  [43, 42, 41, 40, 38, 36, 33, 29, 26, 24], // 32.00+
  [42, 41, 40, 39, 37, 35, 32, 28, 25, 23], // 31.50–31.99
  [41, 40, 39, 38, 36, 34, 31, 27, 24, 22], // 31.00–31.49
  [40, 39, 38, 37, 35, 33, 30, 26, 23, 21], // 30.50–30.99
  [39, 38, 37, 36, 34, 32, 29, 25, 22, 20], // 30.00–30.49
  [38, 37, 36, 35, 33, 31, 28, 24, 21, 19], // 29.50–29.99
  [37, 36, 35, 34, 32, 30, 27, 23, 20, 18], // 29.00–29.49
  [36, 35, 34, 33, 31, 29, 27, 22, 19, 17], // 28.50–28.99
  [35, 34, 33, 32, 30, 28, 26, 21, 18, 16], // 28.00–28.49
  [34, 33, 32, 31, 29, 27, 26, 20, 17, 15], // 27.50–27.99
  [33, 32, 31, 30, 28, 26, 25, 19, 16, 14], // 27.00–27.49
  [32, 31, 30, 29, 27, 25, 24, 18, 15, 13], // 26.50–26.99
  [31, 30, 29, 28, 26, 24, 23, 17, 15, 12], // 26.00–26.49
  [30, 29, 28, 27, 25, 23, 22, 16, 14, 11], // 25.50–25.99
  [29, 28, 27, 26, 24, 22, 21, 15, 14, 10], // 25.00–25.49
  [28, 27, 27, 26, 24, 22, 20, 15, 14, 10], // 24.50–24.99
  [28, 27, 27, 26, 24, 22, 20, 15, 14, 10], // 24.00–24.49
  [27, 26, 26, 25, 23, 21, 19, 14, 13, 10], // 23.50–23.99
  [27, 26, 26, 25, 23, 21, 19, 14, 13,  9], // 23.00–23.49
  [26, 26, 25, 25, 23, 21, 18, 14, 13,  9], // <23.00
] as const

function ppBandRow(opponentPP: number): number {
  if (opponentPP >= 32.00) return 0
  if (opponentPP >= 31.50) return 1
  if (opponentPP >= 31.00) return 2
  if (opponentPP >= 30.50) return 3
  if (opponentPP >= 30.00) return 4
  if (opponentPP >= 29.50) return 5
  if (opponentPP >= 29.00) return 6
  if (opponentPP >= 28.50) return 7
  if (opponentPP >= 28.00) return 8
  if (opponentPP >= 27.50) return 9
  if (opponentPP >= 27.00) return 10
  if (opponentPP >= 26.50) return 11
  if (opponentPP >= 26.00) return 12
  if (opponentPP >= 25.50) return 13
  if (opponentPP >= 25.00) return 14
  if (opponentPP >= 24.50) return 15
  if (opponentPP >= 24.00) return 16
  if (opponentPP >= 23.50) return 17
  if (opponentPP >= 23.00) return 18
  return 19
}

function marginCol(margin: number, won: boolean): number {
  if (won) {
    if (margin >= 19) return 0
    if (margin >= 13) return 1
    if (margin >= 7)  return 2
    return 3
  } else {
    if (margin >= 40) return 9
    if (margin >= 30) return 8
    if (margin >= 19) return 7
    if (margin >= 13) return 6
    if (margin >= 7)  return 5
    return 4
  }
}

/** Raw point value from the Ranking Scale for one dual meet result. */
export function meetPointValue(
  opponentPP: number,
  myScore: number,
  oppScore: number,
): number {
  const margin = Math.abs(myScore - oppScore)
  const won = myScore > oppScore
  const raw = RANKING_SCALE[ppBandRow(opponentPP)][marginCol(margin, won)]
  return raw
}

// ── Iterative calculation ─────────────────────────────────────────────────────

export type DualMeetResult = {
  opponentId: number
  myScore: number
  oppScore: number
}

export type SchoolMeets = {
  schoolId: number
  meets: DualMeetResult[]
}

/**
 * Compute Power Points for all schools via the NJSIAA Ranking Scale algorithm.
 *
 * - All schools start at `initialPP` (default 23.0 — the NJSIAA default for
 *   unranked teams when preseason data is unavailable).
 * - Runs `iterations` passes until the values converge.
 * - Returns a Map<schoolId, finalPP>.
 */
export function computePowerPoints(
  allSchools: SchoolMeets[],
  initialPP = 23.0,
  iterations = 10,
): Map<number, number> {
  const pp = new Map<number, number>()
  for (const s of allSchools) pp.set(s.schoolId, initialPP)

  for (let iter = 0; iter < iterations; iter++) {
    const prev = new Map(pp)

    for (const { schoolId, meets } of allSchools) {
      // Group meets by opponent; keep only the highest raw value per opponent
      // (clause: only highest-valued match against a given team counts)
      const bestPerOpponent = new Map<number, number>()

      for (const m of meets) {
        const oppPP = prev.get(m.opponentId) ?? initialPP
        let myVal = meetPointValue(oppPP, m.myScore, m.oppScore)
        const won = m.myScore > m.oppScore

        if (won) {
          // Clause: loser can't receive more PP than winner
          let oppVal = meetPointValue(prev.get(schoolId) ?? initialPP, m.oppScore, m.myScore)
          if (oppVal >= myVal) oppVal = myVal - 1
          // (We use myVal as-is; oppVal adjustment is handled when processing the opponent)
        } else {
          // Check if the winner's value (from the opponent's perspective) would be
          // lower — if so, cap our loss value to winner - 1
          const winnerVal = meetPointValue(prev.get(m.opponentId) ?? initialPP, m.oppScore, m.myScore)
          // winnerVal is what the OPPONENT earns (they won); our value is the loss row
          // Clause applies in reverse: our loss value can't exceed the winner's win value
          if (myVal >= winnerVal) myVal = winnerVal - 1
        }

        const prev_ = bestPerOpponent.get(m.opponentId) ?? -Infinity
        if (myVal > prev_) bestPerOpponent.set(m.opponentId, myVal)
      }

      // Sort all best values descending, take top 9, average
      const vals = [...bestPerOpponent.values()].sort((a, b) => b - a).slice(0, 9)
      if (vals.length === 0) {
        pp.set(schoolId, initialPP)
      } else {
        const avg = vals.reduce((s, v) => s + v, 0) / vals.length
        pp.set(schoolId, Math.round(avg * 100) / 100)
      }
    }
  }

  return pp
}

/** Count W/L from a school's meets (only NJ-vs-NJ, already filtered upstream). */
export function computeRecord(meets: DualMeetResult[]): { wins: number; losses: number } {
  let wins = 0, losses = 0
  for (const m of meets) {
    if (m.myScore > m.oppScore) wins++
    else if (m.myScore < m.oppScore) losses++
  }
  return { wins, losses }
}
