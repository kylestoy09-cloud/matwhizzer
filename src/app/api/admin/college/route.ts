// College results (admin, per side; Kyle 2026-11-17). Reading the PDFs happens in the browser (src/lib/ncaa/parse.ts);
// saving + matching here (src/lib/ncaa/save.ts, match.ts).
// GET ?gender&view=events            each championship loaded, with match counts, bouts and whether its year is reviewed
// GET ?gender&view=review[&level]    entrants waiting for Kyle, with their candidates
// GET ?gender&view=matched[&level]   entrants matched to our wrestlers (automatic or confirmed)
// POST  { gender, action: 'import', level, year, weights, bouts, files }   save one championship (re-import keeps decisions)
// PATCH { gender, id, action: 'accept', wrestler_id }   this entrant is our wrestler — and so is the same name at the
//                                                       same college in the other years still waiting
//       { gender, id, action: 'not_ours' } / { gender, id, action: 'undo' } (back to review)
//       { gender, event_id, action: 'event_reviewed', reviewed }   a championship's year is reviewed (Progress grid
//                                                       green) — only with nobody left waiting — or back to not reviewed
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth/isAdminUser'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { collegeTables, saveCollegeYear, type Side } from '@/lib/ncaa/save'
import { collegeTablesOf } from '@/lib/ncaa/stats'
import { decideCollegeEntry, loadReviewRows } from '@/lib/ncaa/review'

export const dynamic = 'force-dynamic'
export const maxDuration = 120
const bad = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s })
const side = (g: unknown): Side | null => (g === 'M' || g === 'F' ? g : null)
type Db = ReturnType<typeof createSupabaseAdmin>

async function all<T>(q: (from: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let f = 0; ; f += 1000) { const { data, error } = await q(f); if (error) throw new Error(error.message); const d = (data ?? []) as T[]; out.push(...d); if (d.length < 1000) break }
  return out
}

async function wrestlerLabels(db: Db, ids: string[]) {
  const out = new Map<string, string>()
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await db.from('wrestlers').select('id, first_name, last_name').in('id', ids.slice(i, i + 300))
    for (const w of data ?? []) out.set(w.id, `${w.first_name} ${w.last_name}`)
  }
  return out
}

export async function GET(req: NextRequest) {
  if (!(await getAdminUser())) return bad('Forbidden', 403)
  const p = req.nextUrl.searchParams
  const g = side(p.get('gender'))
  if (!g) return bad('gender must be M or F')
  const db = createSupabaseAdmin(), T = collegeTables(g)
  try {
    const { data: events, error } = await db.from(T.events).select('*').order('level').order('year', { ascending: false })
    if (error) return bad(error.message, 500)
    const evById = new Map((events ?? []).map(e => [e.id as number, e]))
    const view = p.get('view') ?? 'events'
    const level = p.get('level')
    const evIds = (events ?? []).filter(e => !level || e.level === level).map(e => e.id)
    if (view === 'events') {
      const rows = await all<{ event_id: number; match_status: string; place: number | null }>(f => db.from(T.entries).select('event_id, match_status, place').order('id').range(f, f + 999))
      // bouts saved per championship (a count each, 20 at a time)
      const bouts = new Map<number, number>()
      const ids = (events ?? []).map(e => e.id as number)
      for (let i = 0; i < ids.length; i += 20) await Promise.all(ids.slice(i, i + 20).map(async id => {
        const { count, error: bErr } = await db.from(collegeTablesOf(g).bouts).select('id', { count: 'exact', head: true }).eq('event_id', id)
        if (bErr) throw new Error(bErr.message)
        bouts.set(id, count ?? 0)
      }))
      return NextResponse.json({ events: (events ?? []).map(e => {
        const mine = rows.filter(r => r.event_id === e.id)
        const n = (s: string) => mine.filter(r => r.match_status === s).length
        return { id: e.id, level: e.level, year: e.year, source_files: e.source_files, imported_at: e.imported_at, reviewed_at: e.reviewed_at ?? null, reviewed_by: e.reviewed_by ?? null,
          entrants: mine.length, places: mine.filter(r => r.place).length, bouts: bouts.get(e.id) ?? 0, auto: n('auto'), confirmed: n('confirmed'), review: n('review'), not_ours: n('not_ours') }
      }) })
    }
    // the review list: the same rows (and card) Microcheck deals (src/lib/ncaa/review.ts)
    if (view === 'review') return NextResponse.json({ rows: await loadReviewRows(db, g) })
    const statuses = ['auto', 'confirmed']
    const rows = evIds.length ? await all<Record<string, unknown>>(f => db.from(T.entries).select('id, event_id, weight, name, college_raw, college_id, seed, record, place, wrestler_id, match_status, match_note, reviewed_by')
      .in('event_id', evIds).in('match_status', statuses).order('id').range(f, f + 999)) : []
    const { data: colleges } = await db.from('colleges').select('id, name, primary_color, secondary_color')
    const col = new Map((colleges ?? []).map(c => [c.id as number, c]))
    const names = await wrestlerLabels(db, [...new Set(rows.map(r => r.wrestler_id as string).filter(Boolean))])
    return NextResponse.json({ rows: rows.map(r => {
      const ev = evById.get(r.event_id as number)
      let parsed: { note?: string; candidates?: unknown[] } = {}
      try { parsed = r.match_note ? JSON.parse(String(r.match_note)) : {} } catch { parsed = { note: String(r.match_note) } }
      return { ...r, weight: r.weight as number, level: ev?.level, year: ev?.year as number, college: col.get(r.college_id as number) ?? null, wrestler: r.wrestler_id ? names.get(r.wrestler_id as string) ?? null : null, note: parsed.note ?? null, candidates: parsed.candidates ?? [] }
    }).sort((a, b) => b.year - a.year || a.weight - b.weight) })
  } catch (e) {
    return bad(e instanceof Error ? e.message : String(e), 500)
  }
}

export async function POST(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return bad('Forbidden', 403)
  const b = await req.json().catch(() => ({}))
  const g = side(b.gender)
  if (!g || b.action !== 'import' || !b.level || !Number.isInteger(b.year) || !Array.isArray(b.weights)) return bad('gender, level, year and weights required')
  try {
    return NextResponse.json(await saveCollegeYear(createSupabaseAdmin(), g, String(b.level), b.year, b.weights, Array.isArray(b.files) ? b.files : [], user.email ?? '', undefined, Array.isArray(b.bouts) ? b.bouts : []))
  } catch (e) {
    return bad(e instanceof Error ? e.message : String(e), 500)
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return bad('Forbidden', 403)
  const b = await req.json().catch(() => ({}))
  const g = side(b.gender)
  if (g && b.action === 'event_reviewed') {
    const eid = Number(b.event_id)
    if (!Number.isInteger(eid)) return bad('event_id required')
    const db = createSupabaseAdmin(), T = collegeTables(g)
    if (b.reviewed) {
      const { count } = await db.from(T.entries).select('id', { count: 'exact', head: true }).eq('event_id', eid).eq('match_status', 'review')
      if (count) return bad(`${count} entrant${count > 1 ? 's are' : ' is'} still waiting for review`)
    }
    const { error } = await db.from(T.events).update(b.reviewed ? { reviewed_at: new Date().toISOString(), reviewed_by: user.email ?? '' } : { reviewed_at: null, reviewed_by: null }).eq('id', eid)
    if (error) return bad(/reviewed_at/.test(error.message) ? 'Run docs/migrations/20261118_college_event_reviewed.sql in the Supabase SQL editor first.' : error.message, 500)
    return NextResponse.json({ ok: true })
  }
  const id = Number(b.id)
  if (!g || !Number.isInteger(id)) return bad('gender and id required')
  try {
    return NextResponse.json({ ok: true, ...(await decideCollegeEntry(createSupabaseAdmin(), g, id, String(b.action), typeof b.wrestler_id === 'string' ? b.wrestler_id : null, user.email ?? '')) })
  } catch (e) {
    return bad(e instanceof Error ? e.message : String(e))
  }
}
