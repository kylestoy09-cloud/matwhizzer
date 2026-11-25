import { cookies } from 'next/headers'
import { getSeasons, getHistorySeasons } from '@/lib/seasons-server'
import { getAdminUser } from '@/lib/auth/isAdminUser'
import { createSupabaseAdmin } from '@/lib/supabase/service'
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

/** The Schools directory's season (Kyle 2026-11-14): the visitor's pick, else the live season once its competition has
 *  begun ("Competition May Begin" on its season_calendar), and until then the season before — a new season's directory
 *  is empty until it starts. */
export async function getDirectorySeason(gender: Gender): Promise<number> {
  const [store, seasons] = await Promise.all([cookies(), getSeasons()])
  const picked = parseInt(store.get(seasonPickCookie(gender))?.value ?? '')
  if (seasons.some(s => s.id === picked && s.public_genders.includes(gender))) return picked
  const live = liveSeasonId(seasons, gender)
  if (live === undefined) throw new Error('No seasons found')
  const { data } = await createSupabaseAdmin().from('season_calendar').select('event_date, gender').eq('season_id', live).eq('label', 'Competition May Begin')
  const start = (data ?? []).filter(r => r.gender == null || r.gender === gender).map(r => r.event_date as string).sort()[0]
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  if (!start || today >= start) return live
  return seasons.filter(s => s.id < live && s.public_genders.includes(gender)).sort((a, b) => b.id - a.id)[0]?.id ?? live
}

/** A season the district / region / state pages can show: the public seasons, the Playoff History seasons Kyle has
 *  switched on, and — for an admin only — the hidden ones, to check before switching them on (2026-11-14). */
export type PostseasonOption = { id: number; label: string; hidden: boolean }

// `fromUrl`: the Individual Post Season page (Kyle 2026-11-14) always opens on the live season; a year picked there rides
// in the URL (?season=) instead of the session pick, so coming back to the page starts over
export async function getPostseasonSeason(gender: Gender, fromUrl?: { season: string | undefined }): Promise<{ season: number; options: PostseasonOption[] }> {
  const [store, seasons, history, admin] = await Promise.all([cookies(), getSeasons(), getHistorySeasons(gender), getAdminUser().catch(() => null)])
  // A preview deployment made to review hidden seasons sets REVIEW_HIDDEN_SEASONS=1 (never on production)
  const options: PostseasonOption[] = [
    ...seasons.filter(s => s.public_genders.includes(gender)).map(s => ({ id: s.id, label: s.label, hidden: false })),
    ...history.filter(h => h.public || admin || (process.env.VERCEL_ENV === 'preview' && process.env.REVIEW_HIDDEN_SEASONS === '1')).map(h => ({ id: h.id, label: h.label, hidden: !h.public })),
  ].sort((a, b) => b.id - a.id)
  const picked = parseInt((fromUrl ? fromUrl.season : store.get(seasonPickCookie(gender))?.value) ?? '')
  if (options.some(o => o.id === picked)) return { season: picked, options }
  const live = liveSeasonId(seasons, gender)
  if (live === undefined) throw new Error('No seasons found')
  return { season: live, options }
}

/** Whether this viewer sees Playoff History seasons that aren't switched on yet: an admin, or a preview deployment made
 *  to review them (REVIEW_HIDDEN_SEASONS=1, never production). Wrestler profiles and the year's wrestler search use it. */
export async function canSeeHiddenHistory(): Promise<boolean> {
  if (process.env.VERCEL_ENV === 'preview' && process.env.REVIEW_HIDDEN_SEASONS === '1') return true
  return !!(await getAdminUser().catch(() => null))
}
