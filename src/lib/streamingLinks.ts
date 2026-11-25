// A program's streaming links (Kyle 2026-11-11; two per program since 2026-11-19 — Hudl and NFHS Network, and the
// microcheck's pick of its home account), kept in one place —
// boys_streaming_links / girls_streaming_links — and written only through this file. The preseason school
// directory saves it by hand; the schedule import fills it from the Live Stream column of a team's
// schedule page. Seasons follow coaches: entered for the upcoming season.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any

export const streamingTable = (gender: 'M' | 'F') => gender === 'F' ? 'girls_streaming_links' : 'boys_streaming_links'

/** http(s) URL, trimmed; anything else is not a link (null). */
export function cleanStreamingUrl(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim()
  if (!v) return null
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`
  try { const u = new URL(withScheme); return u.hostname.includes('.') ? u.toString() : null } catch { return null }
}

export type StreamPlatform = 'hudl' | 'nfhs'
export type StreamChoice = 'hudl' | 'nfhs' | 'both' | 'neither'
/** A program's streaming pages (Kyle 2026-11-19: "schools have both nfhs and hudl so i grabbed both"): its Hudl and
 *  NFHS Network pages and the microcheck's pick of its home account (null = not checked yet). */
export type StreamLinks = { hudl: string | null; nfhs: string | null; choice: StreamChoice | null; choice_at: string | null }
export const STREAM_LABEL: Record<StreamPlatform, string> = { hudl: 'Hudl', nfhs: 'NFHS Network' }

/** Which platform a link is on (the old single-link rows: by its address) */
export const platformOf = (url: string): StreamPlatform | null => /hudl\.com/i.test(url) ? 'hudl' : /nfhsnetwork\.com/i.test(url) ? 'nfhs' : null

// a row from before 20261119_streaming_two_links_microcheck_reset.sql has only `url`
function toLinks(r: Record<string, unknown> | null | undefined): StreamLinks | null {
  if (!r) return null
  let hudl = (r.hudl_url as string | null) ?? null, nfhs = (r.nfhs_url as string | null) ?? null
  if (!('hudl_url' in r) && r.url) { const p = platformOf(r.url as string); if (p === 'hudl') hudl = r.url as string; else nfhs = r.url as string }
  if (!hudl && !nfhs) return null
  return { hudl, nfhs, choice: (r.choice as StreamChoice | null) ?? null, choice_at: (r.choice_at as string | null) ?? null }
}

/** The links the site shows: the picked one(s); both until a pick; none for 'neither' */
export function shownStreams(l: StreamLinks | null): { platform: StreamPlatform; label: string; url: string }[] {
  if (!l || l.choice === 'neither') return []
  const out: { platform: StreamPlatform; label: string; url: string }[] = []
  for (const p of ['hudl', 'nfhs'] as const) {
    const url = l[p]
    if (url && (l.choice == null || l.choice === 'both' || l.choice === p)) out.push({ platform: p, label: STREAM_LABEL[p], url })
  }
  return out
}

/** Set (or with null, clear) one platform's link for a program's season; a row left with neither is removed. */
export async function setStreamingLink(db: Db, gender: 'M' | 'F', schoolId: number, seasonId: number, platform: StreamPlatform, url: string | null): Promise<{ error: string | null; url: string | null }> {
  const t = streamingTable(gender)
  const col = platform === 'hudl' ? 'hudl_url' : 'nfhs_url'
  const clean = url == null ? null : cleanStreamingUrl(url)
  if (url != null && !clean) return { error: 'Not a web address', url: null }
  const { data: row } = await db.from(t).select('*').eq('school_id', schoolId).eq('season_id', seasonId).maybeSingle()
  if (!row && clean == null) return { error: null, url: null }
  const other = platform === 'hudl' ? row?.nfhs_url : row?.hudl_url
  if (clean == null && !other) {
    const { error } = await db.from(t).delete().eq('school_id', schoolId).eq('season_id', seasonId)
    return { error: error?.message ?? null, url: null }
  }
  const { error } = await db.from(t).upsert({ school_id: schoolId, season_id: seasonId, [col]: clean, updated_at: new Date().toISOString() }, { onConflict: 'school_id,season_id' })
  return { error: error?.message ?? null, url: clean }
}

/** Record the microcheck's pick of the home account */
export async function setStreamChoice(db: Db, gender: 'M' | 'F', schoolId: number, seasonId: number, choice: StreamChoice, by: string): Promise<string | null> {
  const { error } = await db.from(streamingTable(gender)).update({ choice, choice_at: new Date().toISOString(), choice_by: by }).eq('school_id', schoolId).eq('season_id', seasonId)
  return error?.message ?? null
}

/** A program's links for a season, carried forward like coaches: that season's, else the latest earlier one, else
 *  the newest on file (links are entered ahead, for the upcoming season — Kyle 2026-11-18). */
export async function streamingLinkFor(db: Db, gender: 'M' | 'F', schoolId: number, seasonId: number | null): Promise<StreamLinks | null> {
  const { data } = await db.from(streamingTable(gender)).select('*').eq('school_id', schoolId).order('season_id', { ascending: false })
  const rows = (data ?? []) as Record<string, unknown>[]
  const pick = (seasonId != null ? rows.find(r => r.season_id === seasonId) ?? rows.find(r => (r.season_id as number) < seasonId) : null) ?? rows[0]
  return toLinks(pick)
}

/** Every program's links for a season: school_id → links. */
export async function streamingLinks(db: Db, gender: 'M' | 'F', seasonId: number): Promise<Map<number, StreamLinks>> {
  const { data } = await db.from(streamingTable(gender)).select('*').eq('season_id', seasonId)
  const out = new Map<number, StreamLinks>()
  for (const r of (data ?? []) as Record<string, unknown>[]) { const l = toLinks(r); if (l) out.set(r.school_id as number, l) }
  return out
}
