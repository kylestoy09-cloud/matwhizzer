/** Season metadata types + pure helpers — safe in server and client components. */
/** is_public: live for a gender, or at least one gender has it past preseason. */
export type SeasonInfo = { id: number; label: string; start_year: number; is_public: boolean }

export function seasonLabel(seasons: SeasonInfo[], id: number): string | undefined {
  return seasons.find(s => s.id === id)?.label
}

/** Newest first. Season IDs are not chronological once past seasons are backfilled. */
export function sortSeasonIds(seasons: SeasonInfo[], ids: number[]): number[] {
  const year = new Map(seasons.map(s => [s.id, s.start_year]))
  return [...ids].sort((a, b) => (year.get(b) ?? b) - (year.get(a) ?? a))
}
