// Article Hub (Kyle 2026-11-17). An article event is a publish slot; its article is the {g}_articles rows that point
// at it, one per section. Flow: save each section (status 'finalized') → save the whole article (event 'ready') →
// the publisher (/api/cron/publish, every 5 minutes) publishes it at publish_at. Not ready by then = 'missed' (not
// published). Emergency Extension = a new publish_at picked by hand. Boys and girls fully separate.
// Events: preseason (the week before competition starts, 8 AM), match_day (8 AM the day after a date with a match,
// from the master schedule), rankings (Monday 8 AM), feature (added by hand). docs/migrations/20261117_article_rankings_hubs.sql
import type { SupabaseClient } from '@supabase/supabase-js'
import { addDays, TZ } from '@/lib/challenge'

export type Side = 'M' | 'F'
export const eventTable = (g: Side) => (g === 'F' ? 'girls_article_events' : 'boys_article_events')
export const articleTable = (g: Side) => (g === 'F' ? 'girls_articles' : 'boys_articles')

/** The sections every article is written in (Kyle: boys the 4 sections, girls North / South) */
export const ARTICLE_SECTIONS: Record<Side, { key: string; label: string }[]> = {
  M: [{ key: 'north_i', label: 'North I' }, { key: 'north_ii', label: 'North II' }, { key: 'central', label: 'Central' }, { key: 'south', label: 'South' }],
  F: [{ key: 'north', label: 'North' }, { key: 'south', label: 'South' }],
}

export type EventKind = 'preseason' | 'match_day' | 'rankings' | 'feature'
export const PUBLISH_HOUR = 8   // every automatic article goes out at 8 AM Eastern

/** A wall-clock time in New York as a UTC instant (daylight saving handled): ("2026-11-30", 8) → 13:00Z */
export function easternInstant(dateIso: string, hour: number, minute = 0): Date {
  const guess = new Date(`${dateIso}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`)
  // how far New York is behind UTC at that moment
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(guess).map(p => [p.type, p.value]))
  const asNy = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute)
  return new Date(guess.getTime() + (guess.getTime() - asNy))
}

type EventRow = { season_id: number; kind: EventKind; title: string; covers_date: string; publish_at: string; auto: true; created_by: string }

/** Create the automatic events that don't exist yet (unique on season + kind + date), returning how many were new */
async function addAutoEvents(db: SupabaseClient, g: Side, rows: EventRow[]): Promise<number> {
  if (!rows.length) return 0
  const { data: have, error } = await db.from(eventTable(g)).select('kind, covers_date').eq('season_id', rows[0].season_id).eq('auto', true)
  if (error) throw new Error(`${eventTable(g)}: ${error.message}`)
  const seen = new Set((have ?? []).map(r => `${r.kind}|${r.covers_date}`))
  const fresh = rows.filter(r => !seen.has(`${r.kind}|${r.covers_date}`))
  if (!fresh.length) return 0
  const { error: iErr } = await db.from(eventTable(g)).insert(fresh)
  if (iErr) throw new Error(`${eventTable(g)}: ${iErr.message}`)
  return fresh.length
}

/** Preseason articles: 8 AM each day of the week before competition starts (season start_date − 7 … − 1) */
export async function ensurePreseasonEvents(db: SupabaseClient, g: Side, seasonId: number, competitionStart: string): Promise<number> {
  const rows: EventRow[] = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(competitionStart, i - 7)
    return { season_id: seasonId, kind: 'preseason', title: `Preseason Day ${i + 1}`, covers_date: day, publish_at: easternInstant(day, PUBLISH_HOUR).toISOString(), auto: true, created_by: 'auto' }
  })
  return addAutoEvents(db, g, rows)
}

/** Match-day recaps: 8 AM the day after each date with at least one match (from the master schedule) */
export async function ensureMatchDayEvents(db: SupabaseClient, g: Side, seasonId: number, matchDates: string[]): Promise<number> {
  const rows: EventRow[] = [...new Set(matchDates)].sort().map(d => ({
    season_id: seasonId, kind: 'match_day', title: `Recap: ${d}`, covers_date: d,
    publish_at: easternInstant(addDays(d, 1), PUBLISH_HOUR).toISOString(), auto: true, created_by: 'auto',
  }))
  return addAutoEvents(db, g, rows)
}

/** Weekly rankings articles: alongside each ranking week (Monday 8 AM) */
export async function ensureRankingEvents(db: SupabaseClient, g: Side, seasonId: number): Promise<number> {
  const { data, error } = await db.from('individual_ranking_weeks').select('week_number, week_date, publish_at').eq('season_id', seasonId).eq('gender', g)
  if (error) throw new Error(`individual_ranking_weeks: ${error.message}`)
  const rows: EventRow[] = (data ?? []).map(w => ({
    season_id: seasonId, kind: 'rankings', title: `Whiz Rank Week ${w.week_number}`, covers_date: w.week_date,
    publish_at: w.publish_at ?? easternInstant(addDays(w.week_date, 1), PUBLISH_HOUR).toISOString(), auto: true, created_by: 'auto',
  }))
  return addAutoEvents(db, g, rows)
}

/** "Save the entire article": every section finalized → the event is ready to publish at its time */
export async function markReady(db: SupabaseClient, g: Side, eventId: string, by: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: ev, error } = await db.from(eventTable(g)).select('id, status').eq('id', eventId).maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!ev) return { ok: false, error: 'Event not found' }
  if (ev.status === 'published') return { ok: false, error: 'Already published' }
  const { data: rows, error: aErr } = await db.from(articleTable(g)).select('section, status, body').eq('event_id', eventId)
  if (aErr) return { ok: false, error: aErr.message }
  const done = new Set((rows ?? []).filter(r => r.status === 'finalized' && r.body.trim()).map(r => r.section ?? ''))
  const missing = ARTICLE_SECTIONS[g].filter(s => !done.has(s.key)).map(s => s.label)
  if (missing.length) return { ok: false, error: `Save these sections first: ${missing.join(', ')}` }
  const { error: uErr } = await db.from(eventTable(g)).update({ status: 'ready', ready_at: new Date().toISOString(), ready_by: by }).eq('id', eventId)
  return uErr ? { ok: false, error: uErr.message } : { ok: true }
}

/** Emergency Extension: a new publish time (a missed event opens again) */
export async function extendEvent(db: SupabaseClient, g: Side, eventId: string, newTime: string, by: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const at = new Date(newTime)
  if (Number.isNaN(at.getTime())) return { ok: false, error: 'Bad time' }
  if (at.getTime() <= Date.now()) return { ok: false, error: 'Pick a time in the future' }
  const { data: ev, error } = await db.from(eventTable(g)).select('publish_at, extended_from, status, ready_at').eq('id', eventId).maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!ev) return { ok: false, error: 'Event not found' }
  if (ev.status === 'published') return { ok: false, error: 'Already published' }
  const { error: uErr } = await db.from(eventTable(g)).update({
    publish_at: at.toISOString(), extended_from: ev.extended_from ?? ev.publish_at, extended_by: by,
    status: ev.status === 'missed' ? (ev.ready_at ? 'ready' : 'open') : ev.status,
  }).eq('id', eventId)
  return uErr ? { ok: false, error: uErr.message } : { ok: true }
}

/** The publisher's article pass: ready events whose time has come go live; open ones past their time are missed */
export async function publishDueArticles(db: SupabaseClient, g: Side, now = new Date()): Promise<{ published: number; missed: number }> {
  const T = eventTable(g), A = articleTable(g), at = now.toISOString()
  const { data: due, error } = await db.from(T).select('id, status').in('status', ['ready', 'open']).lte('publish_at', at)
  if (error) throw new Error(`${T}: ${error.message}`)
  let published = 0, missed = 0
  for (const ev of due ?? []) {
    if (ev.status === 'ready') {
      const { error: aErr } = await db.from(A).update({ status: 'published', published_at: at }).eq('event_id', ev.id).eq('status', 'finalized')
      if (aErr) throw new Error(`${A}: ${aErr.message}`)
      await db.from(T).update({ status: 'published', published_at: at }).eq('id', ev.id)
      published++
    } else {
      await db.from(T).update({ status: 'missed' }).eq('id', ev.id)
      missed++
    }
  }
  return { published, missed }
}
