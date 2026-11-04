// Admin phase dates for one side (src/lib/phaseDates.ts): the Calendar tool's Season Dates panel.
//   GET ?gender=M|F                                   that side's dates per season, and the seasons
//   PUT { gender, season_id, preseason_start, season_start, postseason_start, postseason_end }
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth/isAdminUser'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { checkDates } from '@/lib/phaseDates'
import { loadPhaseDates } from '@/lib/phaseDatesServer'

export const dynamic = 'force-dynamic'

const genderOf = (g: unknown) => (g === 'F' ? 'F' : g === 'M' ? 'M' : null)

export async function GET(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const gender = genderOf(req.nextUrl.searchParams.get('gender'))
  if (!gender) return NextResponse.json({ error: 'gender must be M or F' }, { status: 400 })
  const db = createSupabaseAdmin()
  const [rows, { data: seasons }] = await Promise.all([loadPhaseDates(db, gender), db.from('seasons').select('id, label').order('id')])
  return NextResponse.json({ rows, seasons: seasons ?? [] })
}

export async function PUT(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const gender = genderOf(b.gender)
  const season_id = Number(b.season_id)
  if (!gender || !season_id) return NextResponse.json({ error: 'gender and season_id required' }, { status: 400 })
  const dates = { preseason_start: b.preseason_start, season_start: b.season_start, postseason_start: b.postseason_start, postseason_end: b.postseason_end }
  const problem = checkDates(dates)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })
  const db = createSupabaseAdmin()
  // seasons can't overlap: this season's preseason must start after the previous one's postseason ends
  const others = (await loadPhaseDates(db, gender)).filter(r => r.season_id !== season_id)
  const clash = others.find(r => !(dates.postseason_end < r.preseason_start || dates.preseason_start > r.postseason_end))
  if (clash) return NextResponse.json({ error: `Overlaps ${clash.label} (${clash.preseason_start} to ${clash.postseason_end}).` }, { status: 400 })
  const { error } = await db.from('admin_phase_dates').upsert({ season_id, gender, ...dates, updated_at: new Date().toISOString(), updated_by: user.email ?? null })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  try {
    await db.rpc('log_admin_activity', { p_admin_email: user.email ?? '', p_action: 'set_phase_dates', p_entity_type: 'admin_phase_dates', p_entity_id: `${season_id}${gender}`, p_details: dates })
  } catch { /* non-fatal */ }
  return NextResponse.json({ ok: true, rows: await loadPhaseDates(db, gender) })
}
