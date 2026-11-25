// A YouTube video that's been removed, made private or blocked from embedding shows "Video unavailable" in the
// player. Pages leave such a video off (Kyle 2026-11-16) instead of showing a dead player. Asks YouTube's oEmbed
// endpoint, which answers 401/403/404 for those; checked once a day per video. A failed check (network) keeps
// the video, so a hiccup never hides a good one.
import { unstable_cache } from 'next/cache'
import { youTubeId } from '@/lib/homeVideo'

const check = unstable_cache(async (id: string): Promise<boolean> => {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, { cache: 'no-store' })
    return ![400, 401, 403, 404].includes(r.status)
  } catch {
    return true
  }
}, ['youtube-available-v1'], { revalidate: 86400 })

/** false when the link's video is gone (or the link isn't a YouTube video) */
export async function youtubeAvailable(url: string | null | undefined): Promise<boolean> {
  const id = youTubeId(url)
  return id ? check(id) : false
}
