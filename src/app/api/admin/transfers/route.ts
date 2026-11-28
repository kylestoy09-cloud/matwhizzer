// Transfers tool (admin, per side; Kyle 2026-11-16). src/lib/transfers.ts has the rules.
// GET ?gender=M|F[&season=<id>]  the side's seasons with a list, and that season's transfers (default: this season)
// GET ?gender=M|F&q=<name>       active NJ wrestlers matching the name, with grade and current team
// POST { gender, wrestler_id, to_school_id, notes }  logs a transfer for this season (the newest open one)
// DELETE ?gender&id              undoes one, while its season is still open
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth/isAdminUser'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { schoolIdsOfWrestlers } from '@/lib/hubSchools'
import { tableMissing, transferSeasons, transferTable, type Side } from '@/lib/transfers'
import { logTransfer } from '@/lib/logTransfer'

export const dynamic = 'force-dynamic'
const bad = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s })
const side = (g: unknown): Side | null => (g === 'M' || g === 'F' ? g : null)
type Db = ReturnType<typeof createSupabaseAdmin>

async function schoolNames(db: Db, ids: number[]) {
  const out = new Map<number, string>()
  const list = [...new Set(ids)]
  for (let i = 0; i < list.length; i += 300) {
    const { data, error } = await db.from('schools').select('id, display_name').in('id', list.slice(i, i + 300))
    if (error) throw new Error(error.message)
    for (const s of data ?? []) out.set(s.id, s.display_name)
  }
  return out
}

export async function GET(req: NextRequest) {
  if (!(await getAdminUser())) return bad('Forbidden', 403)
  const p = req.nextUrl.searchParams
  const g = side(p.get('gender'))
  if (!g) return bad('gender must be M or F')
  const db = createSupabaseAdmin()

  const q = p.get('q')?.trim()
  if (q != null) {
    const words = q.replace(/[%,()]/g, ' ').split(/\s+/).filter(Boolean)
    if (!words.length) return NextResponse.json({ wrestlers: [] })
    let query = db.from('wrestlers').select('id, first_name, last_name, suffix, grade')
      .eq('gender', g).eq('is_oos', false).eq('is_active', true)
    for (const w of words) query = query.or(`first_name.ilike.%${w}%,last_name.ilike.%${w}%`)
    const { data, error } = await query.order('last_name').order('first_name').limit(15)
    if (error) return bad(error.message, 500)
    const ws = data ?? []
    const school = await schoolIdsOfWrestlers(db, ws.map(w => w.id))
    const names = await schoolNames(db, [...school.values()])
    return NextResponse.json({
      wrestlers: ws.map(w => ({
        id: w.id, name: [w.first_name, w.last_name, w.suffix].filter(Boolean).join(' '), grade: w.grade,
        school_id: school.get(w.id) ?? null, school: names.get(school.get(w.id) ?? -1) ?? null,
      })),
    })
  }

  const seasons = await transferSeasons(db, g)
  const current = seasons.find(s => s.open) ?? null
  const seasonId = Number(p.get('season')) || current?.id || seasons[0]?.id
  const { data: all, error: cErr } = await db.from(transferTable(g)).select('season_id')
  if (tableMissing(cErr)) return NextResponse.json({ migrationPending: true, seasons, current, season: seasonId, rows: [] })
  if (cErr) return bad(cErr.message, 500)
  // the season tabs: this season, then every past season that has a list
  const withRows = new Set((all ?? []).map(r => r.season_id as number))
  const tabs = seasons.filter(s => s.id === current?.id || withRows.has(s.id))

  const { data, error } = await db.from(transferTable(g))
    .select('id, season_id, notes, created_at, created_by, from_school_id, to_school_id, wrestler:wrestlers(id, first_name, last_name, suffix, grade)')
    .eq('season_id', seasonId).order('created_at', { ascending: false })
  if (error) return bad(error.message, 500)
  const rows = (data ?? []) as unknown as { id: number; season_id: number; notes: string | null; created_at: string; created_by: string | null; from_school_id: number | null; to_school_id: number; wrestler: { id: string; first_name: string; last_name: string; suffix: string | null; grade: string | null } }[]
  const names = await schoolNames(db, rows.flatMap(r => [r.from_school_id, r.to_school_id]).filter((x): x is number => x != null))
  return NextResponse.json({
    migrationPending: false, seasons: tabs, current, season: seasonId,
    rows: rows.map(r => ({
      id: r.id, wrestler_id: r.wrestler.id, name: [r.wrestler.first_name, r.wrestler.last_name, r.wrestler.suffix].filter(Boolean).join(' '),
      grade: r.wrestler.grade, from: r.from_school_id != null ? names.get(r.from_school_id) ?? null : null, to: names.get(r.to_school_id) ?? null,
      notes: r.notes, created_at: r.created_at, created_by: r.created_by,
    })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return bad('Forbidden', 403)
  const b = await req.json().catch(() => ({}))
  const g = side(b.gender)
  if (!g) return bad('gender must be M or F')
  const wrestlerId = typeof b.wrestler_id === 'string' ? b.wrestler_id : null
  const toSchool = Number(b.to_school_id)
  if (!wrestlerId || !Number.isInteger(toSchool)) return bad('Pick a wrestler and the new team')
  const db = createSupabaseAdmin()

  const r = await logTransfer(db, g, wrestlerId, toSchool, typeof b.notes === 'string' ? b.notes : null, user.email ?? null)
  if (!r.ok) return bad(r.error, r.status)
  return NextResponse.json(r)
}

export async function DELETE(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return bad('Forbidden', 403)
  const p = req.nextUrl.searchParams
  const g = side(p.get('gender'))
  const id = Number(p.get('id'))
  if (!g || !Number.isInteger(id)) return bad('gender and id required')
  const db = createSupabaseAdmin()
  const { data: t, error } = await db.from(transferTable(g)).select('*').eq('id', id).maybeSingle()
  if (error) return bad(error.message, 500)
  if (!t) return bad('Transfer not found', 404)
  const season = (await transferSeasons(db, g)).find(s => s.id === t.season_id)
  if (!season?.open) return bad(`The ${season?.label ?? ''} list is complete; it can't be changed`)

  // the name link this transfer added goes too, unless they have bouts for the new school by now
  let linkKept = false
  if (t.link_added) {
    const [duals, bouts] = g === 'F' ? ['dual_meet_matches_girls', 'tournament_bouts_girls'] : ['dual_meet_matches', 'tournament_bouts']
    const counts = await Promise.all([
      db.from(duals).select('id', { count: 'exact', head: true }).eq('wrestler_a_id', t.wrestler_id).eq('school_a_id', t.to_school_id),
      db.from(duals).select('id', { count: 'exact', head: true }).eq('wrestler_b_id', t.wrestler_id).eq('school_b_id', t.to_school_id),
      db.from(bouts).select('id', { count: 'exact', head: true }).eq('wrestler1_id', t.wrestler_id).eq('wrestler1_school_id', t.to_school_id),
      db.from(bouts).select('id', { count: 'exact', head: true }).eq('wrestler2_id', t.wrestler_id).eq('wrestler2_school_id', t.to_school_id),
      db.from('tournament_entries').select('id', { count: 'exact', head: true }).eq('wrestler_id', t.wrestler_id).eq('school_id', t.to_school_id),
    ])
    const bad2 = counts.find(c => c.error)
    if (bad2?.error) return bad(bad2.error.message, 500)
    linkKept = counts.some(c => (c.count ?? 0) > 0)
    if (!linkKept) {
      const { error: dErr } = await db.from('wrestler_name_aliases').delete().eq('wrestler_id', t.wrestler_id).eq('school_id', t.to_school_id)
      if (dErr) return bad(dErr.message, 500)
    }
  }
  const { error: xErr } = await db.from(transferTable(g)).delete().eq('id', id)
  if (xErr) return bad(xErr.message, 500)
  try {
    await db.rpc('log_admin_activity', { p_admin_email: user.email ?? '', p_action: 'undo_transfer', p_entity_type: transferTable(g), p_entity_id: String(id), p_details: { ...t, link_kept: linkKept } })
  } catch { /* non-fatal */ }
  return NextResponse.json({ ok: true, linkKept })
}
