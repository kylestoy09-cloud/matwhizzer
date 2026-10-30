import { NextRequest, NextResponse } from 'next/server'
import { getRosterImportSeason } from '@/lib/season-context'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { fetchAllRows } from '@/lib/fetchAllRows'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) return null
  const { data: appUser } = await userSb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

// Wrestlers whose matched rows need a decision (Grades Unresolved tab): current
// grade differs from the import, or rows with different grades match one wrestler.
// The bulk confirm (no ids) leaves these alone.
async function conflictWrestlerIds(db: ReturnType<typeof createSupabaseAdmin>, rows: { wrestler_id: string | null; grade: string }[]) {
  const byW = new Map<string, Set<string>>()
  for (const r of rows) if (r.wrestler_id) byW.set(r.wrestler_id, (byW.get(r.wrestler_id) ?? new Set()).add(r.grade))
  const ids = [...byW.keys()]
  const conflicts = new Set<string>()
  for (const [id, grades] of byW) if (grades.size > 1) conflicts.add(id)
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db.from('wrestlers').select('id, grade').in('id', ids.slice(i, i + 200))
    for (const w of data ?? []) {
      if (w.grade && !byW.get(w.id)!.has(w.grade)) conflicts.add(w.id)
    }
  }
  return conflicts
}

// GET — summary stats for confirmation dialog
export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseAdmin()

  const season = await getRosterImportSeason(db, 'M')
  const { data, error } = await fetchAllRows<{ wrestler_id: string | null; grade: string }>((from, to) => db
    .from('roster_grade_import')
    .select('wrestler_id, grade')
    .eq('season_id', season.id)
    .eq('gender', 'M')
    .eq('status', 'wrestler_matched')
    .order('id')
    .range(from, to))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const conflicts = await conflictWrestlerIds(db, data ?? [])
  const ready = (data ?? []).filter(r => !r.wrestler_id || !conflicts.has(r.wrestler_id))
  const byGrade: Record<string, number> = {}
  for (const row of ready) {
    byGrade[row.grade] = (byGrade[row.grade] ?? 0) + 1
  }

  return NextResponse.json({ total: ready.length, byGrade, unresolved: conflicts.size })
}

// POST — write confirmed grades to wrestlers table
// Body: { school_id?: number; ids?: string[] } — optionally limit to one school and/or specific
// import row ids; omit both for all wrestler_matched rows
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { school_id?: number; ids?: string[] }
  const db = createSupabaseAdmin()

  const season = await getRosterImportSeason(db, 'M')
  const { data: fetched, error: fetchErr } = await fetchAllRows<{ id: string; wrestler_id: string | null; grade: string }>((from, to) => {
    let query = db
      .from('roster_grade_import')
      .select('id, wrestler_id, grade')
      .eq('season_id', season.id)
      .eq('gender', 'M')
      .eq('status', 'wrestler_matched')
    if (body.school_id) query = query.eq('school_id', body.school_id)
    if (body.ids && body.ids.length > 0) query = query.in('id', body.ids)
    return query.order('id').range(from, to)
  })
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  // Explicit ids = the admin picked these matches; bulk confirm skips unresolved conflicts
  const conflicts = body.ids?.length ? new Set<string>() : await conflictWrestlerIds(db, fetched ?? [])
  const rows = (fetched ?? []).filter(r => !r.wrestler_id || !conflicts.has(r.wrestler_id))
  if (rows.length === 0) return NextResponse.json({ ok: true, updated: 0 })

  const now = new Date().toISOString()
  const confirmedBy = user.email ?? 'admin'
  let updated = 0
  const errors: string[] = []

  for (const row of rows) {
    if (!row.wrestler_id) continue

    // Write grade to live wrestlers table
    const { error: wErr } = await db
      .from('wrestlers')
      .update({
        grade: row.grade,
        grade_confirmed_at: now,
        grade_confirmed_source: 'roster_upload',
      })
      .eq('id', row.wrestler_id)
      .eq('gender', 'M')

    if (wErr) {
      errors.push(`wrestler ${row.wrestler_id}: ${wErr.message}`)
      continue
    }

    // Mark import row as confirmed
    const { error: rgiErr } = await db
      .from('roster_grade_import')
      .update({
        status: 'confirmed',
        confirmed_by: confirmedBy,
        confirmed_at: now,
      })
      .eq('id', row.id)

    if (rgiErr) errors.push(`rgi ${row.id}: ${rgiErr.message}`)
    else updated++
  }

  if (errors.length > 0 && updated === 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 500 })
  }

  return NextResponse.json({ ok: true, updated, errors: errors.length > 0 ? errors : undefined })
}
