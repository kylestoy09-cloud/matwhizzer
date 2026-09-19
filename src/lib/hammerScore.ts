/**
 * Hammer Score calculation engine.
 *
 * Three components sum to a 0–100 score:
 *   postseason  0–50  (base from prior season finish, adjusted mid-season)
 *   tournament  0–20  (average point awards across in-season tournaments)
 *   match       0–30  (rolling 20-match average, normalised to 30-pt scale)
 */

// ─── Weight class ordering ────────────────────────────────────────────────────
// Used to compute how far a wrestler is competing away from their main weight.

export const WEIGHT_ORDER_BOYS = [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285]

// Returns the hammer score adjustment when a wrestler competes away from their main weight.
// Up by N classes: –8 per class. Down by N classes: +6 per class.
export function getWeightAdjustment(mainWeight: string | null, matchWeight: string | null): number {
  if (!mainWeight || !matchWeight) return 0
  const mainIdx = WEIGHT_ORDER_BOYS.indexOf(parseInt(mainWeight))
  const matchIdx = WEIGHT_ORDER_BOYS.indexOf(parseInt(matchWeight))
  if (mainIdx === -1 || matchIdx === -1 || mainIdx === matchIdx) return 0
  const classDiff = matchIdx - mainIdx
  return classDiff > 0 ? classDiff * -8 : classDiff * -6
}

// ─── Outcome rank constants ──────────────────────────────────────────────────
// 1 = best possible win (1st Minute Pin), 16 = OT win
// 17 = OT loss, 32 = worst possible loss (1st Minute Pin loss)
// For any match: winner_rank + loser_rank = 33

export const OUTCOME_LABELS: Record<number, string> = {
  1:  '1st Minute Pin',
  2:  '1st Minute Tech',
  3:  '1st Period Pin',
  4:  '1st Period Tech',
  5:  '3 Minute Pin',
  6:  '3 Minute Tech',
  7:  '2nd Period Pin',
  8:  '2nd Period Tech',
  9:  '5 Minute Pin',
  10: '5 Minute Tech',
  11: '3rd Period Pin',
  12: '3rd Period Tech',
  13: 'Major Decision',
  14: '4–7 Point Decision',
  15: '1–3 Point Decision',
  16: 'OT Win',
  17: 'OT Loss',
  18: '1–3 Loss',
  19: '4–7 Loss',
  20: 'MD Loss',
  21: '3rd Period Tech Loss',
  22: '3rd Period Pin Loss',
  23: '5 Minute Tech Loss',
  24: '5 Minute Pin Loss',
  25: '2nd Period Tech Loss',
  26: '2nd Period Pin Loss',
  27: '3 Minute Tech Loss',
  28: '3 Minute Pin Loss',
  29: '1st Period Tech Loss',
  30: '1st Period Pin Loss',
  31: '1st Minute Tech Loss',
  32: '1st Minute Pin Loss',
}

// ─── Expected outcome (favored wrestler) ─────────────────────────────────────
// Given the Hammer Score differential (favored − underdog), returns the
// outcome rank (1–16) that the favored wrestler is expected to achieve.

export function getExpectedOutcomeRank(diff: number): number {
  if (diff >= 38) return 1   // 1st Minute Pin
  if (diff >= 36) return 2   // 1st Minute Tech
  if (diff >= 34) return 3   // 1st Period Pin
  if (diff >= 32) return 4   // 1st Period Tech
  if (diff >= 30) return 5   // 3 Minute Pin
  if (diff >= 28) return 6   // 3 Minute Tech
  if (diff >= 26) return 7   // 2nd Period Pin
  if (diff >= 24) return 8   // 2nd Period Tech
  if (diff >= 22) return 9   // 5 Minute Pin
  if (diff >= 20) return 10  // 5 Minute Tech
  if (diff >= 18) return 11  // 3rd Period Pin
  if (diff >= 17) return 12  // 3rd Period Tech
  if (diff >= 13) return 13  // Major Decision
  if (diff >= 9)  return 14  // 4–7 Decision
  if (diff >= 5)  return 15  // 1–3 Decision
  return 16                   // OT win (diff 0–4)
}

// ─── Outcome classification ───────────────────────────────────────────────────
// Returns the outcome rank from the WINNER'S perspective (1–16).
// Returns null if the match should not count toward match score.

function fallTimeTier(secs: number, type: 'fall' | 'tf'): number {
  // Pins are odd ranks (1,3,5,7,9,11); tech falls are even (2,4,6,8,10,12)
  const base = type === 'fall' ? 1 : 2
  if (secs <= 60)  return base       // First Minute   (0:00–1:00)
  if (secs <= 120) return base + 2   // First Period   (1:01–2:00)
  if (secs <= 180) return base + 4   // 3 Minute       (2:01–3:00)
  if (secs <= 240) return base + 6   // Second Period  (3:01–4:00)
  if (secs <= 300) return base + 8   // 5 Minute       (4:01–5:00)
  return base + 10                   // Third Period   (5:00+)
}

export function classifyOutcome(
  resultType: string | null,
  fallTimeSeconds: number | null,
  winnerScore: number | null,
  loserScore: number | null,
  isWinner: boolean,
): number | null {
  switch (resultType) {
    case 'For':
    case 'MFFL':
    case 'DQ':
    case 'Inj':
      return null  // excluded from match score

    case 'SV-1':
    case 'UTB':
      return isWinner ? 16 : 17

    case 'Dec': {
      const margin = ((winnerScore ?? 0) - (loserScore ?? 0))
      if (isWinner) return margin >= 4 ? 14 : 15
      else          return margin >= 4 ? 19 : 18
    }

    case 'MD':
      return isWinner ? 13 : 20

    case 'TF': {
      const secs = fallTimeSeconds ?? 300
      const winRank = fallTimeTier(secs, 'tf')
      return isWinner ? winRank : (33 - winRank)
    }

    case 'Fall': {
      const secs = fallTimeSeconds ?? 300
      const winRank = fallTimeTier(secs, 'fall')
      return isWinner ? winRank : (33 - winRank)
    }

    default:
      return null
  }
}

// ─── Per-match score calculation ──────────────────────────────────────────────
// Returns the score earned by BOTH wrestlers for a single match.
//
// outcomeRankA: rank from wrestler A's perspective (1–16 if A wins, 17–32 if A loses)
// If hammerB > hammerA, A is the underdog; the function handles that internally.

export function computeMatchScore(
  hammerA: number,
  hammerB: number,
  outcomeRankA: number,
): { scoreA: number; scoreB: number } {
  const diff = hammerA - hammerB

  if (diff < 0) {
    // B is the favored wrestler — swap roles and re-enter
    const { scoreA: sB, scoreB: sA } = computeMatchScore(hammerB, hammerA, 33 - outcomeRankA)
    return { scoreA: sA, scoreB: sB }
  }

  // A is favored (or equal). diff >= 0.
  const expectedRankA = getExpectedOutcomeRank(diff)  // 1–16 (a winning rank)

  // ── Score for A (the favored wrestler) ──────────────────────────────────────
  let scoreA: number

  if (outcomeRankA <= expectedRankA) {
    // A did as expected or better
    const tiersBetter = expectedRankA - outcomeRankA
    scoreA = diff >= 40
      ? hammerA                                   // cap: can't earn above pre-match
      : hammerA + tiersBetter * 0.25
  } else if (outcomeRankA <= 16) {
    // A won but worse than expected (still a win)
    const tiersWorse = outcomeRankA - expectedRankA
    scoreA = hammerA - tiersWorse * 4
  } else {
    // A lost (rank 17–32)
    const tiersToOtLoss  = 17 - expectedRankA      // steps from expected win to OT loss
    const tiersBeyondOt  = outcomeRankA - 17       // additional steps past OT loss
    scoreA = hammerA - tiersToOtLoss * 4 - tiersBeyondOt * 0.5
  }

  // ── Score for B (the underdog) ───────────────────────────────────────────────
  const outcomeRankB = 33 - outcomeRankA
  const expectedRankB = 33 - expectedRankA          // a losing rank (17–32)
  const tiersBetterB  = expectedRankB - outcomeRankB // positive if B outperformed

  let scoreB: number

  if (tiersBetterB >= 0) {
    // B did as expected or better
    const tiersToOtWin = expectedRankB - 16          // steps from B's expected loss to OT win
    if (tiersBetterB <= tiersToOtWin) {
      // B is still in the +4/tier zone (still losing, but less badly)
      scoreB = hammerB + tiersBetterB * 4
    } else {
      // B crossed into winning territory
      scoreB = hammerB + tiersToOtWin * 4 + (tiersBetterB - tiersToOtWin) * 0.5
    }
    // If A is 40+ favored, B can't score below pre-match (only up)
    if (diff >= 40) scoreB = Math.max(scoreB, hammerB)
  } else {
    // B did worse than expected (lost more badly): –0.25 per tier
    scoreB = hammerB + tiersBetterB * 0.25
  }

  return {
    scoreA: Math.round(scoreA * 100) / 100,
    scoreB: Math.round(scoreB * 100) / 100,
  }
}

// ─── Tournament score component ───────────────────────────────────────────────
// placements: one entry per scored tournament. pointsEarned=0 → excluded.
// A WIN (1st place) in a lower-point tournament cannot lower the average.

export function computeTournamentComponent(
  placements: { pointsEarned: number; won: boolean }[]
): number {
  const included: number[] = []

  for (const p of placements) {
    if (p.pointsEarned === 0) continue
    const currentAvg = included.length > 0
      ? included.reduce((a, b) => a + b, 0) / included.length
      : 0
    if (p.won && included.length > 0 && p.pointsEarned < currentAvg) continue
    included.push(p.pointsEarned)
  }

  if (included.length === 0) return 0
  return Math.round((included.reduce((a, b) => a + b, 0) / included.length) * 100) / 100
}

// ─── Tournament point award lookup ────────────────────────────────────────────
// Returns the points earned for a given placement and tournament point tier.
// Returns 0 if the placement is outside the awarding range for that tier.

export function tournamentPointsForPlace(place: number, tournamentPointValue: number): number {
  switch (tournamentPointValue) {
    case 20:
      if (place >= 1 && place <= 8) return 21 - place  // 20,19,18,17,16,15,14,13
      return 0
    case 15:
      if (place >= 1 && place <= 8) return 16 - place  // 15,14,13,12,11,10,9,8
      return 0
    case 10:
      if (place >= 1 && place <= 4) return 11 - place  // 10,9,8,7
      return 0
    case 5:
      if (place === 1) return 5
      if (place === 2) return 3
      if (place === 3) return 1
      return 0
    case 1:
      return place === 1 ? 1 : 0
    default:
      return 0
  }
}

// ─── Match component ──────────────────────────────────────────────────────────
// Always divides by 20 (not by the number of actual scores), so wrestlers
// with fewer matches have a proportionally lower match component.
// Scores array should contain up to 20 values (oldest first).

export function computeMatchComponent(last20Scores: number[]): number {
  if (last20Scores.length === 0) return 0
  const sum = last20Scores.reduce((a, b) => a + b, 0)
  const avg = sum / 20                            // denominator is always 20
  return Math.round((avg / 100 * 30) * 100) / 100
}

// ─── Postseason score determination ──────────────────────────────────────────
// Determines the base postseason score (0–50) from 2024-25 tournament results.
// State placement takes precedence over district finish.

export type PostseasonFact = {
  madeState: boolean
  stateWins: number
  statePlacement: number | null   // 1–8, or null if didn't place top 8
  districtBest: 'champion' | 'runner-up' | 'third' | 'entry' | 'none'
  regionBest:   'champion' | 'finalist' | 'third' | 'entry' | 'none'
}

export function postseasonScore(fact: PostseasonFact): number {
  if (fact.madeState) {
    const p = fact.statePlacement
    if (p === 1) return 50
    if (p === 2) return 49
    if (p !== null && p <= 4) return 48
    if (p !== null && p <= 6) return 47
    if (p !== null && p <= 8) return 46
    if (fact.stateWins >= 3) return 40
    if (fact.stateWins === 2) return 38
    if (fact.stateWins === 1) return 36
    return 32
  }

  // Didn't make state — score is district result only
  switch (fact.districtBest) {
    case 'champion':   return 20
    case 'runner-up':  return 16
    case 'third':      return 10
    case 'entry':      return 4
    default:           return 0
  }
}

// ─── Mid-season postseason adjustment ────────────────────────────────────────
// When wrestler A beats wrestler B and B's postseason score > 20:
//   new score for A = (currentA + B.psScore) / 2  (only if B's > A's)
// When wrestler A (ps >= 20) loses to wrestler B (ps < A.ps):
//   new score for A = (currentA + B.psScore) / 2
// Called after each match is processed.

export function adjustPostseasonScore(
  winnerPs: number,
  loserPs: number,
): { newWinnerPs: number; newLoserPs: number } {
  let newWinnerPs = winnerPs
  let newLoserPs  = loserPs

  // Winner beats someone with higher PS → winner's PS goes up
  if (loserPs > 20 && loserPs > winnerPs) {
    newWinnerPs = (winnerPs + loserPs) / 2
  }

  // Loser (if PS >= 20) loses to someone with lower PS → loser's PS goes down
  if (loserPs >= 20 && winnerPs < loserPs) {
    newLoserPs = (loserPs + winnerPs) / 2
  }

  return {
    newWinnerPs: Math.round(newWinnerPs * 100) / 100,
    newLoserPs:  Math.round(newLoserPs  * 100) / 100,
  }
}

// ─── Full Hammer Score from components ───────────────────────────────────────

export function totalHammerScore(
  postseasonAdjusted: number,
  tournamentScore: number,
  matchScore: number,
): number {
  return Math.round((postseasonAdjusted + tournamentScore + matchScore) * 100) / 100
}
