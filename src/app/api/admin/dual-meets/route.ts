import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { cleanStreamingUrl } from '@/lib/streamingLinks'

export const dynamic = 'force-dynamic'

// GET /api/admin/dual-meets?gender=M[&seasonId=2]
// Returns dual meets filtered by gender and optionally by season.
export async function GET(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gender   = req.nextUrl.searchParams.get('gender') as 'M' | 'F' | null
  const seasonId = req.nextUrl.searchParams.get('seasonId')

  const db = createSupabaseAdmin()

  const SELECT = `id, meet_date, team1_score, team2_score,
    team1_school_id, team2_school_id,
    team1:schools!team1_school_id(display_name),
    team2:schools!team2_school_id(display_name)`

  if (gender === 'F') {
    let q = db.from('dual_meets_girls').select(SELECT).order('meet_date', { ascending: true })
    if (seasonId) q = q.eq('season_id', parseInt(seasonId)) as typeof q
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const meets = (data ?? []).map((m: any) => ({
      id:               m.id,
      meet_date:        m.meet_date,
      gender:           'F',
      team1_name:       m.team1?.display_name ?? null,
      team2_name:       m.team2?.display_name ?? null,
      team1_school_id:  m.team1_school_id,
      team2_school_id:  m.team2_school_id,
      team1_score:      m.team1_score ?? null,
      team2_score:      m.team2_score ?? null,
    }))
    return NextResponse.json({ meets })
  }

  let q = db.from('dual_meets').select(SELECT).eq('gender', 'M').order('meet_date', { ascending: true })
  if (seasonId) q = q.eq('season_id', parseInt(seasonId)) as typeof q
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const meets = (data ?? []).map((m: any) => ({
    id:               m.id,
    meet_date:        m.meet_date,
    gender:           'M',
    team1_name:       m.team1?.display_name ?? null,
    team2_name:       m.team2?.display_name ?? null,
    team1_school_id:  m.team1_school_id,
    team2_school_id:  m.team2_school_id,
    team1_score:      m.team1_score ?? null,
    team2_score:      m.team2_score ?? null,
  }))

  return NextResponse.json({ meets })
}

// PATCH /api/admin/dual-meets — the "Edit meet" panel (Kyle 2026-11-18) and Dual Hub's score edit
// Body: { id, gender, team1_score?, team2_score?, meet_date?, meet_time?, stream_url?, premier_label?,
//         counts_toward_record? (girls duals have the switch), swap_home? }
// stream_url: the meet's own stream ("Stream"; empty = fall back to the home program's links, "Check for streaming at …").
// premier_label: text shown in the header of a premier dual; empty = not one. swap_home: team 2 is home — swaps the
// two teams, only while no bouts or adjustments are entered (bouts store their sides as team 1 / team 2).
export async function PATCH(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: appUser } = await auth.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, gender } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const girls = gender === 'F'

  const db    = createSupabaseAdmin()
  const table = girls ? 'dual_meets_girls' : 'dual_meets'
  const text  = (v: unknown) => { const t = String(v ?? '').trim(); return t || null }

  const patch: Record<string, unknown> = {}
  if (body.team1_score !== undefined) patch.team1_score = body.team1_score === '' || body.team1_score == null ? null : Number(body.team1_score)
  if (body.team2_score !== undefined) patch.team2_score = body.team2_score === '' || body.team2_score == null ? null : Number(body.team2_score)
  if (body.meet_date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.meet_date))) return NextResponse.json({ error: 'Pick a date' }, { status: 400 })
    patch.meet_date = body.meet_date
  }
  if (body.meet_time !== undefined) {
    const t = text(body.meet_time)
    if (t && !/^\d{1,2}:\d{2}(:\d{2})?$/.test(t)) return NextResponse.json({ error: 'Time as 7:00 PM or 19:00' }, { status: 400 })
    patch.meet_time = t
  }
  if (body.stream_url !== undefined) {
    const raw = text(body.stream_url)
    const clean = raw ? cleanStreamingUrl(raw) : null
    if (raw && !clean) return NextResponse.json({ error: 'The stream link is not a web address' }, { status: 400 })
    patch.stream_url = clean
  }
  if (body.premier_label !== undefined) patch.premier_label = text(body.premier_label)
  if (body.counts_toward_record !== undefined) {
    if (!girls) return NextResponse.json({ error: 'Boys duals have no counts-toward-record switch' }, { status: 400 })
    patch.counts_toward_record = !!body.counts_toward_record
  }
  if (body.swap_home) {
    const [m, d] = await Promise.all([
      db.from(girls ? 'dual_meet_matches_girls' : 'dual_meet_matches').select('id', { count: 'exact', head: true }).eq('dual_meet_id', id),
      db.from(girls ? 'dual_meet_deductions_girls' : 'dual_meet_deductions').select('id', { count: 'exact', head: true }).eq('dual_meet_id', id),
    ])
    if ((m.count ?? 0) + (d.count ?? 0) > 0) return NextResponse.json({ error: 'This meet has bouts entered — home and away can only be swapped before any bouts' }, { status: 400 })
    const { data: cur, error: cErr } = await db.from(table).select('team1_school_id, team2_school_id, team1_school_name_raw, team2_school_name_raw, team1_score, team2_score').eq('id', id).single()
    if (cErr || !cur) return NextResponse.json({ error: cErr?.message ?? 'Meet not found' }, { status: 404 })
    Object.assign(patch, {
      team1_school_id: cur.team2_school_id, team2_school_id: cur.team1_school_id,
      team1_school_name_raw: cur.team2_school_name_raw, team2_school_name_raw: cur.team1_school_name_raw,
      team1_score: cur.team2_score, team2_score: cur.team1_score,   // (a swap ignores scores sent with it)
    })
  }
  if (!Object.keys(patch).length) return NextResponse.json({ ok: true })

  const { error } = await db.from(table).update(patch).eq('id', id)
  if (error) {
    const missing = /stream_url|premier_label/.test(error.message)
    return NextResponse.json({ error: missing ? 'Run docs/migrations/20261118_meet_stream_and_details.sql in the Supabase SQL editor first.' : error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
