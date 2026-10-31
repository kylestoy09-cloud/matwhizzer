import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) return null
  const db = createSupabaseAdmin()
  const { data: appUser } = await db.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

// POST /api/admin/school-review
// body: { action, seasonId, gender, ... }
//
// action: 'deactivate'  — mark school as not competing this season (no merge)
//   { schoolId }
//
// action: 'reactivate'  — remove from inactive (works for plain deactivate only)
//   { schoolId }
//
// action: 'merge'       — School A (sourceId) merges into School B (recordId)
//   { sourceId, recordId, mergedName }
//   - inserts inactive_school_seasons for sourceId with merged_into_school_id=recordId
//   - saves recordId's current display_name in record_school_prev_name
//   - renames recordId's display_name to mergedName
//
// action: 'unmerge'     — split a merged pair back into two active programs
//   { sourceId }        — sourceId is School A (the inactive one)
//   - reads inactive_school_seasons row to get merged_into_school_id + record_school_prev_name
//   - restores School B's display_name
//   - deletes the inactive_school_seasons row (School A becomes active again)

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, seasonId, gender = 'M' } = body
  if (!action || !seasonId) return NextResponse.json({ error: 'Missing action or seasonId' }, { status: 400 })

  const db = createSupabaseAdmin()

  // Program names: girls programs are named in girls_schools; boys use the school record
  const getName = async (id: number) => gender === 'F'
    ? db.from('girls_schools').select('display_name').eq('school_id', id).single()
    : db.from('schools').select('display_name').eq('id', id).single()
  const setName = async (id: number, display_name: string) => gender === 'F'
    ? db.from('girls_schools').update({ display_name }).eq('school_id', id)
    : db.from('schools').update({ display_name }).eq('id', id)

  // ── DEACTIVATE ──────────────────────────────────────────────────────────────
  if (action === 'deactivate') {
    const { schoolId } = body
    if (!schoolId) return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })

    const { error } = await db.from('inactive_school_seasons').upsert(
      { school_id: schoolId, season_id: seasonId, gender, merged_into_school_id: null, record_school_prev_name: null },
      { onConflict: 'school_id,season_id,gender' }
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ── REACTIVATE ──────────────────────────────────────────────────────────────
  if (action === 'reactivate') {
    const { schoolId } = body
    if (!schoolId) return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })

    const { error } = await db.from('inactive_school_seasons')
      .delete()
      .eq('school_id', schoolId)
      .eq('season_id', seasonId)
      .eq('gender', gender)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ── MERGE ───────────────────────────────────────────────────────────────────
  if (action === 'merge') {
    const { sourceId, recordId, mergedName } = body
    if (!sourceId || !recordId || !mergedName) {
      return NextResponse.json({ error: 'Missing sourceId, recordId, or mergedName' }, { status: 400 })
    }

    // Get School B's current name before renaming
    const { data: recordSchool, error: fetchErr } = await getName(recordId)
    if (fetchErr || !recordSchool) return NextResponse.json({ error: 'Record school not found' }, { status: 404 })

    // Rename School B to the merged name
    const { error: renameErr } = await setName(recordId, mergedName)
    if (renameErr) return NextResponse.json({ error: renameErr.message }, { status: 500 })

    // Mark School A as inactive with merge metadata
    const { error: inactiveErr } = await db.from('inactive_school_seasons').upsert(
      {
        school_id: sourceId,
        season_id: seasonId,
        gender,
        merged_into_school_id: recordId,
        record_school_prev_name: recordSchool.display_name,
      },
      { onConflict: 'school_id,season_id,gender' }
    )
    if (inactiveErr) return NextResponse.json({ error: inactiveErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, mergedName })
  }

  // ── UNMERGE ─────────────────────────────────────────────────────────────────
  if (action === 'unmerge') {
    const { sourceId } = body
    if (!sourceId) return NextResponse.json({ error: 'Missing sourceId' }, { status: 400 })

    // Read the inactive row to get merge metadata
    const { data: inactiveRow, error: readErr } = await db
      .from('inactive_school_seasons')
      .select('merged_into_school_id, record_school_prev_name')
      .eq('school_id', sourceId)
      .eq('season_id', seasonId)
      .eq('gender', gender)
      .single()
    if (readErr || !inactiveRow) return NextResponse.json({ error: 'Merge record not found' }, { status: 404 })

    const { merged_into_school_id, record_school_prev_name } = inactiveRow
    if (!merged_into_school_id || !record_school_prev_name) {
      return NextResponse.json({ error: 'Not a merge — use reactivate instead' }, { status: 400 })
    }

    // Restore School B's display_name
    const { error: restoreErr } = await setName(merged_into_school_id, record_school_prev_name)
    if (restoreErr) return NextResponse.json({ error: restoreErr.message }, { status: 500 })

    // Delete the inactive row — School A is active again
    const { error: deleteErr } = await db.from('inactive_school_seasons')
      .delete()
      .eq('school_id', sourceId)
      .eq('season_id', seasonId)
      .eq('gender', gender)
    if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, restoredName: record_school_prev_name })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
