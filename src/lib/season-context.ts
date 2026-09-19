import { createSupabaseAdmin } from '@/lib/supabase/service'
import { getSeasons } from '@/lib/seasons-server'
import { previousSeason, workingSeason, type Gender, type SeasonInfo } from '@/lib/seasons'

export function parseGender(v: unknown): Gender {
  return v === 'F' ? 'F' : 'M'
}

/** Season in progress for a gender — what admin tools (rankings, power points, schedules, hammer) operate on. */
export async function getWorkingSeason(gender: Gender): Promise<SeasonInfo> {
  const s = workingSeason(await getSeasons(), gender)
  if (!s) throw new Error(`No season exists for gender ${gender}`)
  return s
}

export async function getPreviousSeason(season: SeasonInfo): Promise<SeasonInfo> {
  const s = previousSeason(await getSeasons(), season)
  if (!s) throw new Error(`No season before ${season.label}`)
  return s
}

/** Rankings / power points lock once the season is marked complete (archived) for that gender. */
export function lockedError(season: SeasonInfo, gender: Gender): string | null {
  return season.stages[gender] === 'archived'
    ? `${season.label} is complete for ${gender === 'M' ? 'boys' : 'girls'} and locked`
    : null
}

/** Newest season overall — the season being set up (e.g. collecting next season's coaches). */
export async function getNewestSeason(): Promise<SeasonInfo> {
  const s = (await getSeasons())[0]
  if (!s) throw new Error('No seasons found')
  return s
}

/** Roster-grade review works on the newest season (by start_year) that has roster rows loaded. */
export async function getRosterImportSeason(db: ReturnType<typeof createSupabaseAdmin>): Promise<SeasonInfo> {
  for (const s of await getSeasons()) {
    const { count, error } = await db.from('roster_grade_import').select('id', { count: 'exact', head: true }).eq('season_id', s.id)
    if (error) throw new Error(`roster_grade_import: ${error.message}`)
    if (count) return s
  }
  throw new Error('No roster rows loaded for any season')
}
