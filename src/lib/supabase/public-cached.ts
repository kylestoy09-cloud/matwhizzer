import { createClient } from '@supabase/supabase-js'

// Anon client for public (site) server components. Reads go through the Next
// data cache for PUBLIC_DATA_REVALIDATE seconds, so repeated page views don't
// re-run the same query or RPC against Postgres.
//
// Public pages already declare `revalidate = 300`, but most read the season
// cookie (getActiveSeason), which renders them dynamically and skips the route
// cache. Caching at the fetch level keeps the 5-minute freshness they ask for.
// The cache key includes the URL and request body, so each RPC argument set
// (district, season, wrestler id...) is cached separately.
//
// Writes (table POST without an rpc path, PATCH, DELETE) are never cached.
// Admin pages and client components keep using '@/lib/supabase'.

export const PUBLIC_DATA_REVALIDATE = 300
export const PUBLIC_DATA_TAG = 'public-data'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const cachedFetch: typeof fetch = (input, init) => {
  const method = (init?.method ?? 'GET').toUpperCase()
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const isRead = method === 'GET' || method === 'HEAD' || (method === 'POST' && url.includes('/rest/v1/rpc/'))
  if (!isRead) return fetch(input, init)
  return fetch(input, {
    ...init,
    cache: 'force-cache',
    next: { revalidate: PUBLIC_DATA_REVALIDATE, tags: [PUBLIC_DATA_TAG] },
  })
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder',
  {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: cachedFetch },
  },
)
