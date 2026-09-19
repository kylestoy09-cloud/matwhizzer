import { cookies } from 'next/headers'
import { getLiveSeasonId } from '@/lib/seasons-server'

export const SEASON_PICK_COOKIE = 'season_pick'

/** Visitor's pick for this browser session, otherwise the live season for the program. */
export async function getActiveSeason(gender: 'M' | 'F'): Promise<number> {
  const store = await cookies()
  const val = store.get(SEASON_PICK_COOKIE)?.value
  const n = val ? parseInt(val) : NaN
  if (Number.isFinite(n) && n >= 1) return n
  return getLiveSeasonId(gender)
}
