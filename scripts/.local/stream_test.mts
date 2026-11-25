import { createClient } from '@supabase/supabase-js'
import { setStreamingLink, streamingLinks, cleanStreamingUrl } from '../../src/lib/streamingLinks'
import { getNewestSeason } from '../../src/lib/season-context'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log('clean:', cleanStreamingUrl('nfhsnetwork.com/schools/roselle-park'), '|', cleanStreamingUrl('  '), '|', cleanStreamingUrl('not a link'))
const season = (await getNewestSeason()).id
for (const g of ['M', 'F'] as const) {
  const before = (await streamingLinks(db, g, season)).size
  const set = await setStreamingLink(db, g, 125, season, 'https://www.nfhsnetwork.com/schools/test')
  const read = (await streamingLinks(db, g, season)).get(125)
  const bad = await setStreamingLink(db, g, 125, season, 'not a link')
  const cleared = await setStreamingLink(db, g, 125, season, null)
  const after = (await streamingLinks(db, g, season)).size
  console.log(g, 'season', season, '| before', before, '| save', set.error ?? 'ok', '| read back', read, '| bad address', bad.error, '| clear', cleared.error ?? 'ok', '| after', after)
}
