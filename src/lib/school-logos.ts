import { cache } from 'react'
import { supabase } from '@/lib/supabase'

type LogoMap = {
  byId: Map<number, string | null>
  byName: Map<string, string | null>
}

// React.cache() deduplicates per request — one DB round-trip no matter how many
// server components call this in the same render.
export const getSchoolLogos = cache(async (): Promise<LogoMap> => {
  const { data } = await supabase.from('schools').select('id, display_name, logo_url')
  const byId   = new Map<number, string | null>()
  const byName = new Map<string, string | null>()
  for (const s of (data ?? []) as { id: number; display_name: string; logo_url: string | null }[]) {
    byId.set(s.id, s.logo_url)
    byName.set(s.display_name, s.logo_url)
  }
  return { byId, byName }
})
