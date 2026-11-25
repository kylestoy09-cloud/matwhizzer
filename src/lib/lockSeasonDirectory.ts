// Lock a season's school directory when it ends (Kyle 2026-11-12). Address, website, Twitter, Facebook,
// AD, AD email (schools) and section / group ({g}_school_profiles) have one value per school, which is
// the current season's; this copies them into the ending season's own rows ({g}_school_season_details)
// so editing the next season doesn't change it. Rows the season already has are kept (never overwritten).
// Coaches, conferences, districts, regions, inactive marks and streaming links are already per season.
// Called by Finalize Season (/api/admin/seasons); 2025-26 was locked by
// scripts/lock_2025_26_directory_20261112.mts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (t: string) => any }

export async function lockSeasonDirectory(db: Db, gender: 'M' | 'F', seasonId: number): Promise<{ locked: number; error?: string }> {
  const g = gender === 'F' ? 'girls' : 'boys'
  const { data: programs, error: pErr } = await db.from(`${g}_schools`).select('school_id')
  if (pErr) return { locked: 0, error: pErr.message }
  const ids = ((programs ?? []) as { school_id: number }[]).map(p => p.school_id)
  const { data: have, error: hErr } = await db.from(`${g}_school_season_details`).select('school_id').eq('season_id', seasonId)
  if (hErr) return { locked: 0, error: hErr.message }
  const done = new Set(((have ?? []) as { school_id: number }[]).map(r => r.school_id))
  const todo = ids.filter(id => !done.has(id))
  const { data: profiles } = await db.from(`${g}_school_profiles`).select('school_id, section, classification')
  const prof = new Map(((profiles ?? []) as { school_id: number; section: string | null; classification: string | null }[]).map(p => [p.school_id, p]))
  let locked = 0
  for (let i = 0; i < todo.length; i += 200) {
    const { data: schools, error } = await db.from('schools')
      .select('id, address, website_url, twitter_handle, facebook_url, ad_name, ad_email').in('id', todo.slice(i, i + 200))
    if (error) return { locked, error: error.message }
    const rows = ((schools ?? []) as Record<string, unknown>[]).map(s => ({
      school_id: s.id, season_id: seasonId, address: s.address, website_url: s.website_url, twitter_handle: s.twitter_handle,
      facebook_url: s.facebook_url, ad_name: s.ad_name, ad_email: s.ad_email,
      section: prof.get(s.id as number)?.section ?? null, classification: prof.get(s.id as number)?.classification ?? null,
    }))
    if (!rows.length) continue
    const { error: insErr } = await db.from(`${g}_school_season_details`).insert(rows)
    if (insErr) return { locked, error: insErr.message }
    locked += rows.length
  }
  return { locked }
}
