// Name links (wrestler_name_aliases): a name as written at a school → the wrestler it is.
// The roster tools (grade %, Roster Grade Import, microcheck) list a school's wrestlers from these,
// and imports use them to recognize a wrestler next time. Every import that records a bout for a
// wrestler at a school saves the link, whether the wrestler was created, picked in the review or
// matched automatically at exact or high confidence (a low-confidence guess is left out by the
// caller, so it can't become a permanent link). (Before 2026-11-05 the tournament imports saved it only for created or
// picked wrestlers, so automatic matches left wrestlers missing from their school's roster.)
// A link already pointing at a different wrestler is never replaced here: changing who a name
// belongs to is done on purpose, in the review ('existing'), not by an automatic match.

import { isPlaceholderName } from '@/lib/personName'

type Link = { raw_name: string; school_id: number; wrestler_id: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (t: string) => any }

export async function saveNameLinks(db: Db, links: (Partial<Link> | null | undefined)[]): Promise<{ saved: number; error?: string }> {
  const seen = new Set<string>()
  const rows: Link[] = []
  for (const l of links) {
    if (!l?.raw_name?.trim() || l.school_id == null || !l.wrestler_id || isPlaceholderName(l.raw_name)) continue
    const raw = l.raw_name.trim()
    const k = `${raw}|${l.school_id}`
    if (seen.has(k)) continue
    seen.add(k)
    rows.push({ raw_name: raw, school_id: l.school_id, wrestler_id: l.wrestler_id })
  }
  if (!rows.length) return { saved: 0 }
  const { error } = await db.from('wrestler_name_aliases').upsert(rows, { onConflict: 'raw_name,school_id', ignoreDuplicates: true })
  return error ? { saved: 0, error: error.message } : { saved: rows.length }
}
