// Lock the 2025-26 school directory (Kyle 2026-11-12): copy today's per-school values into the season's own
// rows so later edits for 2026-27 don't change 2025-26. Kyle corrects any value already updated for
// 2026-27 on the Past Seasons page.
//   * {g}_school_season_details (season 2026): address, website, Twitter, Facebook, AD, AD email (schools)
//     and section, group ({g}_school_profiles), for every program on that side. Existing rows are kept.
//   * {g}_coaches (season 2026): today's coach for each program with no 2025-26 coach (the coaches were
//     rolled over to 2026-27 and are edited there). Existing 2025-26 coaches are kept.
// Inserts only; nothing is overwritten or deleted.
//   node --env-file=.env.local --import tsx scripts/lock_2025_26_directory_20261112.mts           dry run
//   ... --apply
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const SEASON = 2026, COACH_SOURCE = 2027
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ok = <T,>(r: { data: T | null; error: { message: string } | null }, w: string): T => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as T }

for (const g of ['boys', 'girls'] as const) {
  const programs = ok(await db.from(`${g}_schools`).select('school_id'), `${g}_schools`) as { school_id: number }[]
  const ids = programs.map(p => p.school_id)
  const schools = new Map<number, any>()
  for (let i = 0; i < ids.length; i += 200) for (const s of ok(await db.from('schools').select('id, address, website_url, twitter_handle, facebook_url, ad_name, ad_email').in('id', ids.slice(i, i + 200)), 'schools') as any[]) schools.set(s.id, s)
  const profiles = new Map((ok(await db.from(`${g}_school_profiles`).select('school_id, section, classification'), 'profiles') as any[]).map(p => [p.school_id, p]))
  const have = new Set((ok(await db.from(`${g}_school_season_details`).select('school_id').eq('season_id', SEASON), 'details') as any[]).map(r => r.school_id))
  const details = ids.filter(id => !have.has(id) && schools.has(id)).map(id => {
    const s = schools.get(id), p = profiles.get(id)
    return { school_id: id, season_id: SEASON, address: s.address, website_url: s.website_url, twitter_handle: s.twitter_handle, facebook_url: s.facebook_url,
      ad_name: s.ad_name, ad_email: s.ad_email, section: p?.section ?? null, classification: p?.classification ?? null }
  })

  const coachCols = 'school_id, name, email, is_active'
  const current = ok(await db.from(`${g}_coaches`).select(coachCols).eq('season_id', COACH_SOURCE).eq('is_active', true), 'coaches 2027') as any[]
  const past = new Set((ok(await db.from(`${g}_coaches`).select('school_id').eq('season_id', SEASON), 'coaches 2026') as any[]).map(c => c.school_id))
  const coaches = current.filter(c => !past.has(c.school_id) && ids.includes(c.school_id)).map(c => ({ school_id: c.school_id, season_id: SEASON, name: c.name, email: c.email, is_active: true }))

  console.log(`${g}: ${ids.length} programs | directory rows to add ${details.length} (already ${have.size}) | 2025-26 coaches to add ${coaches.length} (already ${past.size})`)
  if (!APPLY) continue
  for (let i = 0; i < details.length; i += 200) ok(await db.from(`${g}_school_season_details`).insert(details.slice(i, i + 200)).select('school_id'), 'insert details')
  for (let i = 0; i < coaches.length; i += 200) ok(await db.from(`${g}_coaches`).insert(coaches.slice(i, i + 200)).select('school_id'), 'insert coaches')
  const n1 = (await db.from(`${g}_school_season_details`).select('*', { count: 'exact', head: true }).eq('season_id', SEASON)).count
  const n2 = (await db.from(`${g}_coaches`).select('*', { count: 'exact', head: true }).eq('season_id', SEASON)).count
  console.log(`  now: directory rows ${n1}, 2025-26 coaches ${n2}`)
}
