import { cache } from 'react'
import { supabase } from '@/lib/supabase'

type BadgeProps = { logoUrl: string | null; bgColor: string | null }
const NULL_BADGE: BadgeProps = { logoUrl: null, bgColor: null }

type LogoMap = {
  byId: Map<number, string | null>
  byName: Map<string, string | null>
  bgById: Map<number, string | null>
  bgByName: Map<string, string | null>
  // Spread onto <SchoolLogoBadge> or <PWCell> directly — avoids repeating the key expression
  badge: (name: string | null | undefined) => BadgeProps
  badgeById: (id: number | null | undefined) => BadgeProps
}

// React.cache() deduplicates per request — one DB round-trip no matter how many
// server components call this in the same render.
export const getSchoolLogos = cache(async (): Promise<LogoMap> => {
  const { data } = await supabase.from('schools').select('id, display_name, logo_url, header_background')
  const byId     = new Map<number, string | null>()
  const byName   = new Map<string, string | null>()
  const bgById   = new Map<number, string | null>()
  const bgByName = new Map<string, string | null>()
  for (const s of (data ?? []) as { id: number; display_name: string; logo_url: string | null; header_background: string | null }[]) {
    byId.set(s.id, s.logo_url)
    byName.set(s.display_name, s.logo_url)
    bgById.set(s.id, s.header_background)
    bgByName.set(s.display_name, s.header_background)
  }
  return {
    byId, byName, bgById, bgByName,
    badge:     (name) => name   ? { logoUrl: byName.get(name) ?? null, bgColor: bgByName.get(name) ?? null } : NULL_BADGE,
    badgeById: (id)   => id != null ? { logoUrl: byId.get(id)   ?? null, bgColor: bgById.get(id)   ?? null } : NULL_BADGE,
  }
})
