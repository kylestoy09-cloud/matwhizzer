// Home Video (Kyle 2026-11-12): the weekly historical match video on each side's home page, with credit to
// whoever posted it. Weeks start Monday (Eastern). The page shows the current week's video, or the latest
// earlier one when a week was left empty or its video no longer plays; nothing when the side's switch is off.
import { addDays, easternDate, weekStart } from '@/lib/challenge'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (t: string) => any }
export type HomeVideo = { week_start: string; youtube_url: string; video_id: string; title: string | null; creator_name: string | null; creator_url: string | null }

export const homeVideoTable = (g: 'M' | 'F') => (g === 'F' ? 'girls_home_videos' : 'boys_home_videos')
export { addDays, easternDate, weekStart }

/** The 11-character video id from any YouTube link (watch, youtu.be, shorts, live, embed), or null. */
export function youTubeId(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim()
  if (!s) return null
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`)
    const host = u.hostname.replace(/^www\.|^m\./, '')
    let id: string | null = null
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0]
    else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      id = u.searchParams.get('v') ?? (u.pathname.match(/^\/(?:shorts|live|embed|v)\/([^/?#]+)/)?.[1] ?? null)
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
  } catch { return null }
}

/** What the home page shows today: null when the switch is off or there's no video yet. */
export async function currentHomeVideo(db: Db, g: 'M' | 'F'): Promise<HomeVideo | null> {
  const { data: s } = await db.from('home_video_settings').select('enabled').eq('gender', g).maybeSingle()
  if (!s?.enabled) return null
  const { data } = await db.from(homeVideoTable(g)).select('week_start, youtube_url, video_id, title, creator_name, creator_url')
    .lte('week_start', weekStart(easternDate())).order('week_start', { ascending: false }).limit(8)
  // a video YouTube no longer plays is skipped for the latest earlier one that does (Kyle 2026-11-16)
  const { youtubeAvailable } = await import('@/lib/youtubeAvailable')
  for (const v of (data ?? []) as HomeVideo[]) if (await youtubeAvailable(v.youtube_url)) return v
  return null
}
