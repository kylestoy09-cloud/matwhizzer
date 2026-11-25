import { createClient } from '@supabase/supabase-js'

// Anon client for public client components (the browser). Table and RPC reads go
// through /api/public-read, which answers repeats from the Next data cache for
// 5 minutes instead of sending every visitor's click to Postgres (2026-11-11).
// Read-only: the route refuses writes. Server components use './public-cached'.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const REST = `${supabaseUrl}/rest/v1/`

const viaCache: typeof fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (!url.startsWith(REST)) return fetch(input, init)
  return fetch(`/api/public-read/${url.slice(REST.length)}`, init)
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder',
  {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'mw-public-read' },
    global: { fetch: viaCache },
  },
)
