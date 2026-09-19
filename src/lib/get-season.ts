import { cookies } from 'next/headers'
import { getSeasons } from '@/lib/seasons-server'
import { liveSeasonId, seasonPickCookie, type Gender } from '@/lib/seasons'

/** Visitor's pick for this session if it's public for the program, otherwise the program's live season. */
export async function getActiveSeason(gender: Gender): Promise<number> {
  const [store, seasons] = await Promise.all([cookies(), getSeasons()])
  const picked = parseInt(store.get(seasonPickCookie(gender))?.value ?? '')
  if (seasons.some(s => s.id === picked && s.public_genders.includes(gender))) return picked
  const live = liveSeasonId(seasons, gender)
  if (live === undefined) throw new Error('No seasons found')
  return live
}
