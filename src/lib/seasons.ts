/** Season metadata types + pure helpers — safe in server and client components. */
export type Gender = 'M' | 'F'

/** public_genders: live for that gender, or past preseason. live_genders: is_public_default for that gender. */
export type SeasonInfo = {
  id: number
  label: string
  start_year: number
  end_year: number
  public_genders: Gender[]
  live_genders: Gender[]
  /** season_gender_state.stage per gender; missing = season doesn't exist for that gender. */
  stages: Partial<Record<Gender, string>>
}

export function seasonLabel(seasons: SeasonInfo[], id: number): string | undefined {
  return seasons.find(s => s.id === id)?.label
}

/** Newest first. Season IDs are not chronological once past seasons are backfilled. */
export function sortSeasonIds(seasons: SeasonInfo[], ids: number[]): number[] {
  const year = new Map(seasons.map(s => [s.id, s.start_year]))
  return [...ids].sort((a, b) => (year.get(b) ?? b) - (year.get(a) ?? a))
}

/** Live season for a gender; falls back to its newest public season, then newest season. */
export function liveSeasonId(seasons: SeasonInfo[], gender: Gender): number | undefined {
  return (
    seasons.find(s => s.live_genders.includes(gender)) ??
    seasons.find(s => s.public_genders.includes(gender)) ??
    seasons[0]
  )?.id
}

export function seasonPickCookie(gender: Gender) {
  return `season_pick_${gender}`
}

/** Season in progress for a gender: its newest season (by start_year). Backfilled past seasons are older, so never chosen. */
export function workingSeason(seasons: SeasonInfo[], gender: Gender): SeasonInfo | undefined {
  return seasons.filter(s => s.stages[gender]).sort((a, b) => b.start_year - a.start_year)[0]
}

/** The season immediately before this one chronologically. */
export function previousSeason(seasons: SeasonInfo[], season: SeasonInfo): SeasonInfo | undefined {
  return seasons.filter(s => s.start_year < season.start_year).sort((a, b) => b.start_year - a.start_year)[0]
}
