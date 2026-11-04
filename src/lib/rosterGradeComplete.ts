// A school's roster grade review, marked complete by the admin (roster_grade_school_complete).
// Track rosters list wrestlers with no profile here; their rows stay open as the grade pool
// (src/lib/rosterPool.ts), so "nothing left to match" can't tell when a school is done.
// Boys and girls each have their own route (/api/admin/roster-grade-import{,-girls}/complete).

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { getRosterImportSeason } from '@/lib/season-context'

/** School ids marked complete for this gender's roster season */
export async function completeSchoolIds(gender: 'M' | 'F'): Promise<Set<number>> {
  const db = createSupabaseAdmin()
  const season = await getRosterImportSeason(db, gender)
  const { data } = await db.from('roster_grade_school_complete').select('school_id').eq('season_id', season.id).eq('gender', gender)
  return new Set((data ?? []).map(r => r.school_id as number))
}

// POST { school_id } marks complete; DELETE { school_id } reopens. The route checks for an admin.
export async function setComplete(req: NextRequest, gender: 'M' | 'F', complete: boolean, adminEmail: string | null) {
  const { school_id } = await req.json() as { school_id?: number }
  if (!school_id) return NextResponse.json({ error: 'school_id required' }, { status: 400 })
  const db = createSupabaseAdmin()
  const season = await getRosterImportSeason(db, gender)
  const { error } = complete
    ? await db.from('roster_grade_school_complete').upsert({ school_id, season_id: season.id, gender, completed_at: new Date().toISOString(), completed_by: adminEmail })
    : await db.from('roster_grade_school_complete').delete().eq('school_id', school_id).eq('season_id', season.id).eq('gender', gender)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, complete })
}
