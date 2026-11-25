// Offseason score (Kyle 2026-11-13): the score being built to rate out-of-state wrestlers, used for NJ kids too.
// A result is worth the points for its place in its tournament's tier — the tournament's champion rating, or a
// division's own rating when it has one (national 90, regional 75, state 50, local 25). Places 9th–32nd count
// by the group they fall in (9th–12th, 13th–16th, 17th–24th, 25th–32nd); below 32nd counts 0. Freestyle counts
// the same as folkstyle. A kid's score is their single best result.

// Kyle's tables (2026-11-13)
const TABLES: Record<number, { places: number[]; groups: [number, number, number][] }> = {
  90: { places: [90, 89, 88, 87, 86, 85, 84, 83], groups: [[9, 12, 80], [13, 16, 75], [17, 24, 70], [25, 32, 65]] },
  75: { places: [75, 74, 72, 70, 68, 66, 64, 62], groups: [[9, 12, 58], [13, 16, 50], [17, 24, 45], [25, 32, 40]] },
  50: { places: [50, 49, 48, 46, 44, 42, 40, 38], groups: [[9, 12, 34], [13, 16, 28], [17, 24, 25], [25, 32, 20]] },
}
export const SCORED_TIERS = Object.keys(TABLES).map(Number)

export type ScoredTournament = { champion_rating: number | null; division_ratings?: Record<string, number> | null }

export function championRating(t: ScoredTournament, division: string | null): number {
  return (division ? t.division_ratings?.[division] : undefined) ?? t.champion_rating ?? 0
}

/** A result's points. A rating without its own table (local 25, or a custom one) takes the 50 table scaled to it,
 *  until it has one. A tied group (place 9, place_to 12) counts by where it starts, so only its first place matters. */
export function placementScore(rating: number, place: number): number {
  if (!rating) return 0
  const t = TABLES[rating] ?? TABLES[50]
  const scale = TABLES[rating] ? 1 : rating / 50
  const pts = place <= 8 ? t.places[place - 1] : t.groups.find(([a, b]) => place >= a && place <= b)?.[2] ?? 0
  return Math.round(pts * scale * 10) / 10
}
