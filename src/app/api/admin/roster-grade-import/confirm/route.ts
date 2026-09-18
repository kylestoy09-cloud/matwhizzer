import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) return null
  const { data: appUser } = await userSb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

// GET — summary stats for confirmation dialog
export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseAdmin()

  const { data, error } = await db
    .from('roster_grade_import')
    .select('status, grade')
    .eq('status', 'wrestler_matched')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const byGrade: Record<string, number> = {}
  for (const row of (data ?? [])) {
    byGrade[row.grade] = (byGrade[row.grade] ?? 0) + 1
  }

  return NextResponse.json({ total: data?.length ?? 0, byGrade })
}

// POST — write confirmed grades to wrestlers table
// Body: { school_id?: number } — optionally limit to one school; omit for all wrestler_matched rows
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { school_id?: number }
  const db = createSupabaseAdmin()

  let query = db
    .from('roster_grade_import')
    .select('id, wrestler_id, grade')
    .eq('status', 'wrestler_matched')

  if (body.school_id) query = query.eq('school_id', body.school_id)

  const { data: rows, error: fetchErr } = await query
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!rows || rows.length === 0) return NextResponse.json({ ok: true, updated: 0 })

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
