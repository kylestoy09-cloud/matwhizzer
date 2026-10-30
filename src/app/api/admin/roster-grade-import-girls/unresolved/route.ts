// Girls roster grade import — the girls copy of /api/admin/roster-grade-import
// (girls_schools, girls alignment, dual_meets_girls, gender F rows and wrestlers).

// Grades Unresolved — roster import matches that need a decision:
//   two_schools   — rows from two schools' rosters matched one record: almost always
//                   two different wrestlers with the same name (split one off)
//   two_rows      — two rows with different grades matched one wrestler
//   grade_differs — the wrestler's current grade differs from the import

import { NextRequest, NextResponse } from 'next/server'
import { getRosterImportSeason } from '@/lib/season-context'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { splitWrestlerAtSchool } from '@/lib/splitWrestler'

export const dynamic = 'force-dynamic'

const VALID_GRADES = new Set(['Fr', 'So', 'Jr', 'Sr'])

async function requireAdmin() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) return null
  const { data: appUser } = await userSb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

type ImportRow = { id: string; status: string; wrestler_id: string | null; grade: string; first_name_raw: string; last_name_raw: string; weight_class: number | null; school_id: number | null }

// GET — wrestlers still holding wrestler_matched rows, plus any wrestler whose
// rows (matched or confirmed) come from two schools' rosters
export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseAdmin()
  const season = await getRosterImportSeason(db, 'F')

  const { data: allRows, error } = await fetchAllRows<ImportRow>((from, to) =>
    db.from('roster_grade_import')
      .select('id, status, wrestler_id, grade, first_name_raw, last_name_raw, weight_class, school_id')
      .eq('season_id', season.id)
      .eq('gender', 'F')
      .in('status', ['wrestler_matched', 'confirmed'])
      .not('wrestler_id', 'is', null)
      .order('id')
      .range(from, to))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const schoolsByWrestler = new Map<string, Set<number | null>>()
  for (const r of allRows) schoolsByWrestler.set(r.wrestler_id!, (schoolsByWrestler.get(r.wrestler_id!) ?? new Set()).add(r.school_id))
  const multiSchool = (id: string) => (schoolsByWrestler.get(id)?.size ?? 0) > 1
  // A wrestler is unresolved while any row is still wrestler_matched, or while
  // their rows span two schools (even if each row was confirmed)
  const openIds = new Set(allRows.filter(r => r.status === 'wrestler_matched').map(r => r.wrestler_id!))
  const rows = allRows.filter(r => openIds.has(r.wrestler_id!) || multiSchool(r.wrestler_id!))

  const wrestlerIds = [...new Set(rows.map(r => r.wrestler_id!))]
  const wrestlers: { id: string; first_name: string; last_name: string; grade: string | null; grade_confirmed_source: string | null }[] = []
  for (let i = 0; i < wrestlerIds.length; i += 200) {
    const { data, error: wErr } = await db.from('wrestlers')
      .select('id, first_name, last_name, grade, grade_confirmed_source')
      .in('id', wrestlerIds.slice(i, i + 200))
    if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 })
    wrestlers.push(...(data ?? []))
  }

  const schoolIds = [...new Set(rows.map(r => r.school_id).filter((s): s is number => s != null))]
  const { data: schoolRows } = schoolIds.length
    ? await db.from('girls_schools').select('school_id, display_name').in('school_id', schoolIds)
    : { data: [] as { school_id: number; display_name: string }[] }
  const schoolName = new Map((schoolRows ?? []).map(s => [s.school_id, s.display_name]))

  const rowsByWrestler = new Map<string, ImportRow[]>()
  for (const r of rows) rowsByWrestler.set(r.wrestler_id!, [...(rowsByWrestler.get(r.wrestler_id!) ?? []), r])

  const items = wrestlers.map(w => {
    const wRows = rowsByWrestler.get(w.id) ?? []
    const twoRows = new Set(wRows.map(r => r.grade)).size > 1
    const reason = multiSchool(w.id) ? 'two_schools'
      : twoRows ? 'two_rows'
      : (w.grade && w.grade !== wRows[0]?.grade ? 'grade_differs' : 'pending')
    const sid = wRows[0]?.school_id ?? null
    return {
      wrestler: w,
      school_id: sid,
      school_name: sid != null ? (schoolName.get(sid) ?? `School ${sid}`) : '—',
      reason,
      suggestion: null,
      rows: wRows.map(r => ({
        id: r.id, first_name_raw: r.first_name_raw, last_name_raw: r.last_name_raw,
        weight_class: r.weight_class, grade: r.grade, school_id: r.school_id,
        school_name: r.school_id != null ? (schoolName.get(r.school_id) ?? `School ${r.school_id}`) : '—',
      })),
    }
  }).sort((a, b) => a.school_name.localeCompare(b.school_name) || a.wrestler.last_name.localeCompare(b.wrestler.last_name))

  return NextResponse.json({ items })
}

// POST — resolve one wrestler
// Body: { wrestler_id, grade: 'Fr'|'So'|'Jr'|'Sr'|null,
//         rows: { id, action: 'same' | 'new' | 'none' }[] }
//   same — the row is this wrestler (grade decided by `grade`)
//   new  — the row is a different wrestler: split them off at the row's school —
//          new record with the row's grade, and everything the old record has at
//          that school (alias, duals, bouts, placements, entries…) moves to them
//   none — the row isn't this wrestler: unlink it (no_match)
function tidyName(s: string): string {
  const t = s.trim()
  return t === t.toLowerCase() ? t.replace(/\b\w/g, c => c.toUpperCase()) : t
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { wrestler_id: string; grade: string | null; rows: { id: string; action: 'same' | 'new' | 'none' }[] }
  if (!body?.wrestler_id || !Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const sameCount = body.rows.filter(r => r.action === 'same').length
  if (body.grade != null && !VALID_GRADES.has(body.grade)) {
    return NextResponse.json({ error: `Invalid grade "${body.grade}"` }, { status: 400 })
  }
  if (sameCount > 0 && !body.grade) {
    return NextResponse.json({ error: 'Pick a grade for this wrestler' }, { status: 400 })
  }

  const db = createSupabaseAdmin()
  const season = await getRosterImportSeason(db, 'F')
  const now = new Date().toISOString()
  const confirmedBy = user.email ?? 'admin'

  const { data: dbRows, error: rErr } = await db.from('roster_grade_import')
    .select('id, wrestler_id, grade, first_name_raw, last_name_raw, school_id, status')
    .eq('season_id', season.id)
    .eq('gender', 'F')
    .in('id', body.rows.map(r => r.id))
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })
  const rowById = new Map((dbRows ?? []).map(r => [r.id, r]))
  for (const r of body.rows) {
    const row = rowById.get(r.id)
    if (!row || row.wrestler_id !== body.wrestler_id || (row.status !== 'wrestler_matched' && row.status !== 'confirmed')) {
      return NextResponse.json({ error: `Import row ${r.id} is no longer matched to this wrestler — reload` }, { status: 409 })
    }
  }

  // Different wrestler → split them off at the row's school
  const keptSchools = new Set(body.rows.filter(x => x.action === 'same').map(x => rowById.get(x.id)!.school_id))
  for (const r of body.rows.filter(x => x.action === 'new')) {
    const row = rowById.get(r.id)!
    if (row.school_id == null) return NextResponse.json({ error: `Import row ${row.id} has no school` }, { status: 400 })
    const first_name = tidyName(row.first_name_raw)
    const last_name  = tidyName(row.last_name_raw)
    let newId: string
    try {
      // If the wrestler we keep is at the same school, their matches can't be told
      // apart — only create the new person with an alias there
      ;({ newId } = await splitWrestlerAtSchool(db, body.wrestler_id, row.school_id,
        { first_name, last_name, grade: row.grade, graded_at: now },
        { moveRecords: !keptSchools.has(row.school_id) }))
    } catch (e) {
      return NextResponse.json({ error: `Split ${first_name} ${last_name}: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 })
    }
    const { error: uErr } = await db.from('roster_grade_import')
      .update({ wrestler_id: newId, status: 'confirmed', confirmed_by: confirmedBy, confirmed_at: now })
      .eq('id', row.id)
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })
  }

  // Not this wrestler → unlink
  const noneIds = body.rows.filter(x => x.action === 'none').map(x => x.id)
  if (noneIds.length > 0) {
    const { error } = await db.from('roster_grade_import').update({ wrestler_id: null, status: 'no_match' }).in('id', noneIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // This wrestler → write the chosen grade, confirm the rows
  const sameRows = body.rows.filter(x => x.action === 'same').map(x => rowById.get(x.id)!)
  if (sameRows.length > 0 && body.grade) {
    const source = sameRows.some(r => r.grade === body.grade) ? 'roster_upload' : 'manual'
    const { error: wErr } = await db.from('wrestlers')
      .update({ grade: body.grade, grade_confirmed_at: now, grade_confirmed_source: source })
      .eq('id', body.wrestler_id)
      .eq('gender', 'F')
    if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 })
    const { error } = await db.from('roster_grade_import')
      .update({ status: 'confirmed', confirmed_by: confirmedBy, confirmed_at: now })
      .in('id', sameRows.map(r => r.id))
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
