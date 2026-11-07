// The site look in effect: the newest Aesthetic Tool save (site_aesthetic_versions), over the defaults.
// Cached for 5 minutes under the 'site-look' tag; a save in the tool clears it
// (src/app/api/admin/aesthetic/route.ts), so a saved change shows on the site right away.
import { createClient } from '@supabase/supabase-js'
import { mergeLook, type SiteLook } from './siteLook'

export const SITE_LOOK_TAG = 'site-look'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder', {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input, init) => fetch(input, { ...init, cache: 'force-cache', next: { revalidate: 300, tags: [SITE_LOOK_TAG] } }) },
})

export async function getSiteLook(): Promise<SiteLook> {
  const { data, error } = await db.from('site_aesthetic_versions').select('settings').order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error) console.error('[site look] falling back to the defaults:', error.message)
  return mergeLook(data?.settings as Partial<SiteLook> | undefined)
}
