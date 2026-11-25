// Article Hub (admin, per side; Kyle 2026-11-17). src/lib/articleHub.ts has the rules.
// GET ?gender                    this season's article events (newest season not archived), each with its sections
// POST { gender, action, ... }
//   seed            create the automatic events not made yet: the preseason week, the ranking weeks
//   create_event    { title, publish_at, covers_date? }  an article added by hand (kind 'feature')
//   save_section    { event_id, section, title?, body, finalize }  save one section (finalize = done)
//   ready           { event_id }   save the whole article: every section done → publishes at its time
//   unready         { event_id }   back to open
//   extend          { event_id, publish_at }   Emergency Extension: a new publish time
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth/isAdminUser'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { ARTICLE_SECTIONS, articleTable, ensurePreseasonEvents, ensureRankingEvents, eventTable, extendEvent, markReady, type Side } from '@/lib/articleHub'
import { transferSeasons } from '@/lib/transfers'

export const dynamic = 'force-dynamic'
const bad = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s })
const side = (g: unknown): Side | null => (g === 'M' || g === 'F' ? g : null)
const TYPE: Record<string, string> = { preseason: 'preseason', match_day: 'season', rankings: 'rankings', feature: 'feature' }

async function openSeason(db: ReturnType<typeof createSupabaseAdmin>, g: Side) {
  const s = (await transferSeasons(db, g)).find(x => x.open)
  if (!s) throw new Error('No open season')
  return s
}

export async function GET(req: NextRequest) {
  if (!(await getAdminUser())) return bad('Forbidden', 403)
  const g = side(req.nextUrl.searchParams.get('gender'))
  if (!g) return bad('gender must be M or F')
  const db = createSupabaseAdmin()
  try {
    const season = await openSeason(db, g)
    const { data: events, error } = await db.from(eventTable(g)).select('*').eq('season_id', season.id).order('publish_at')
    if (error) return bad(error.message, 500)
    const ids = (events ?? []).map(e => e.id)
    const { data: rows } = ids.length ? await db.from(articleTable(g)).select('id, event_id, section, title, body, status, updated_at').in('event_id', ids) : { data: [] }
    return NextResponse.json({
      season, sections: ARTICLE_SECTIONS[g],
      events: (events ?? []).map(e => ({ ...e, sections: (rows ?? []).filter(r => r.event_id === e.id) })),
    })
  } catch (e) {
    return bad(e instanceof Error ? e.message : String(e), 500)
  }
}

export async function POST(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return bad('Forbidden', 403)
  const b = await req.json().catch(() => ({}))
  const g = side(b.gender)
  if (!g) return bad('gender must be M or F')
  const db = createSupabaseAdmin()
  const by = user.email ?? ''
  try {
    const season = await openSeason(db, g)
    switch (b.action) {
      case 'seed': {
        const { data: s } = await db.from('seasons').select('start_date').eq('id', season.id).maybeSingle()
        if (!s?.start_date) return bad(`${season.label} has no start date`)
        const preseason = await ensurePreseasonEvents(db, g, season.id, s.start_date)
        const rankings = await ensureRankingEvents(db, g, season.id)
        return NextResponse.json({ ok: true, preseason, rankings })
      }
      case 'create_event': {
        const at = new Date(b.publish_at)
        if (!b.title?.trim() || Number.isNaN(at.getTime())) return bad('title and publish_at required')
        const { data, error } = await db.from(eventTable(g)).insert({ season_id: season.id, kind: 'feature', title: b.title.trim(), covers_date: b.covers_date ?? null, publish_at: at.toISOString(), created_by: by }).select('id').single()
        if (error) return bad(error.message, 500)
        return NextResponse.json({ ok: true, id: data.id })
      }
      case 'save_section': {
        const sec = ARTICLE_SECTIONS[g].find(s => s.key === b.section)
        if (!b.event_id || !sec) return bad('event_id and a section required')
        const { data: ev } = await db.from(eventTable(g)).select('id, kind, status, covers_date, title').eq('id', b.event_id).maybeSingle()
        if (!ev) return bad('Event not found', 404)
        if (ev.status === 'published') return bad('Already published')
        const patch = { title: String(b.title ?? ev.title ?? ''), body: String(b.body ?? ''), status: b.finalize ? 'finalized' : 'draft', updated_at: new Date().toISOString(), author: by }
        const { data: have } = await db.from(articleTable(g)).select('id').eq('event_id', ev.id).eq('section', sec.key).maybeSingle()
        const { error } = have
          ? await db.from(articleTable(g)).update(patch).eq('id', have.id)
          : await db.from(articleTable(g)).insert({ ...patch, event_id: ev.id, section: sec.key, season_id: season.id, article_type: TYPE[ev.kind], article_key: ev.id, match_date: ev.covers_date })
        if (error) return bad(error.message, 500)
        // a changed section takes the whole article back to open until it is saved again
        if (ev.status === 'ready' && !b.finalize) await db.from(eventTable(g)).update({ status: 'open', ready_at: null }).eq('id', ev.id)
        return NextResponse.json({ ok: true })
      }
      case 'ready': {
        const r = await markReady(db, g, b.event_id, by)
        return r.ok ? NextResponse.json(r) : bad(r.error)
      }
      case 'unready': {
        const { error } = await db.from(eventTable(g)).update({ status: 'open', ready_at: null, ready_by: null }).eq('id', b.event_id).eq('status', 'ready')
        return error ? bad(error.message, 500) : NextResponse.json({ ok: true })
      }
      case 'extend': {
        const r = await extendEvent(db, g, b.event_id, b.publish_at, by)
        return r.ok ? NextResponse.json(r) : bad(r.error)
      }
      default:
        return bad('Unknown action')
    }
  } catch (e) {
    return bad(e instanceof Error ? e.message : String(e), 500)
  }
}
