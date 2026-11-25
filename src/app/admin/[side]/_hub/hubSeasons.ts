// Seasons for a tournament hub (see hubSeasonOfDate): the offseason is a calendar year, the middle school
// season runs June through May. The hub opens on the season today falls in; the picker reaches back 10.
import { hubSeasonOfDate, type HubKey } from '@/lib/hub'

const SEASONS_BACK = 10

export function hubSeasons(hub: HubKey, picked: string | undefined): { seasons: number[]; season: number } {
  const current = hubSeasonOfDate(hub, new Date().toISOString().slice(0, 10))
  const seasons = Array.from({ length: SEASONS_BACK }, (_, i) => current - i)
  const p = Number(picked)
  return { seasons, season: seasons.includes(p) ? p : current }
}
