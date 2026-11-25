// The college pages' data for the live site (Kyle 2026-11-18: shipped), cached 5 minutes like the other public reads
// (service role; the college tables aren't public). Per level: the colleges and every NJ wrestler's career; per
// college: its row, its NJ roster, their NJSIAA medals (public view) and offseason badges. Maps become plain objects
// (the cache stores JSON). The Aesthetic mock reads fresh instead.
import { unstable_cache } from 'next/cache'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { collegeNjRoster, collegesWithNj, njCollegeCareers, type College, type Side } from '@/lib/ncaa/stats'
import { hsAccolades, type HsAccolade } from '@/lib/ncaa/hsAccolades'
import { offseasonBadges, type OffseasonBadge } from '@/lib/offseasonBadges'

const DEPLOY = process.env.VERCEL_DEPLOYMENT_ID ?? 'local'

export async function loadLevel(g: Side, level: string, fresh = false) {
  const build = async () => {
    const db = createSupabaseAdmin()
    const [list, careers] = await Promise.all([collegesWithNj(db, g, level), njCollegeCareers(db, g, level)])
    return { list, careers }
  }
  return fresh ? build() : unstable_cache(build, ['college-level', g, level, DEPLOY], { revalidate: 300, tags: ['college-pages'] })()
}

export async function loadCollege(g: Side, cid: number, fresh = false) {
  const build = async () => {
    const db = createSupabaseAdmin()
    const [{ data }, roster] = await Promise.all([db.from('colleges').select('*').eq('id', cid).maybeSingle(), collegeNjRoster(db, g, cid)])
    const ids = roster.map(r => r.wrestler_id)
    const [acc, badges] = await Promise.all([hsAccolades(db, g, ids, false), offseasonBadges(db, g, ids)])
    return {
      college: (data ?? null) as College | null, roster,
      accolades: Object.fromEntries(acc) as Record<string, HsAccolade[]>,
      badges: Object.fromEntries(badges) as Record<string, OffseasonBadge[]>,
    }
  }
  return fresh ? build() : unstable_cache(build, ['college-page', g, String(cid), DEPLOY], { revalidate: 300, tags: ['college-pages'] })()
}
