import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer }  from '@/lib/supabase/server'
import { createSupabaseAdmin }   from '@/lib/supabase/service'
import { findNextTask }          from '../_engine'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) return null
  const { data: appUser } = await userSb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

// Fields that map directly to a column on the schools table
const SCHOOL_COLS = new Set(['address', 'website_url', 'twitter_handle', 'facebook_url', 'ad_name', 'ad_email'])

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const db = createSupabaseAdmin()

  // ── tie_resolution ────────────────────────────────────────────────────────────
  if (body.task_type === 'tie_resolution') {
    const { task_id, entity_id, gender, winner, dual_table } = body as {
      task_type: 'tie_resolution'
      task_id: string
      entity_id: string
      gender: 'M' | 'F'
      winner: 'team1' | 'team2'
      dual_table: string
    }
    if (!task_id || !entity_id || !winner) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const table = dual_table === 'dual_meets_girls' ? 'dual_meets_girls' : 'dual_meets'
    const { data: meet, error: fetchErr } = await db.from(table)
      .select('team1_school_id, team2_school_id, team1_score, team2_score')
      .eq('id', entity_id)
      .single()
    if (fetchErr || !meet) return NextResponse.json({ error: 'Meet not found' }, { status: 404 })

    const winnerSchoolId = winner === 'team1' ? meet.team1_school_id : meet.team2_school_id
    const updates = winner === 'team1'
      ? { team1_score: (meet.team1_score ?? 0) + 1, criteria_winner_school_id: winnerSchoolId, tiebreaker_pending: false }
      : { team2_score: (meet.team2_score ?? 0) + 1, criteria_winner_school_id: winnerSchoolId, tiebreaker_pending: false }
    const { error: meetErr } = await db.from(table).update(updates).eq('id', entity_id)
    if (meetErr) return NextResponse.json({ error: meetErr.message }, { status: 500 })

    const { error: taskErr } = await db.from('microcheck_tasks').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: user.id,
    }).eq('id', task_id)
    if (taskErr) return NextResponse.json({ error: taskErr.message }, { status: 500 })

    // Return next task — school_profile first, then queue
    const genderTableNext = gender === 'M' ? 'boys_schools' : 'girls_schools'
    const [gsNext, schoolsNext, logNext, flagNext, inactiveNext] = await Promise.all([
      db.from(genderTableNext).select('school_id, display_name'),
      db.from('schools').select('id, display_name, address, website_url, twitter_handle, facebook_url, ad_name, ad_email').eq('is_nj', true).order('display_name'),
      db.from('microcheck_task_log').select('school_id, field').eq('gender', gender),
      db.from('microcheck_roster_flags').select('school_id').eq('gender', gender).eq('resolved', false),
      db.from('inactive_school_seasons').select('school_id').eq('gender', gender),
    ])
    const gSchoolIds = new Set((gsNext.data ?? []).map(r => r.school_id))
    const gNameMap   = new Map((gsNext.data ?? []).map(r => [r.school_id, r.display_name]))
    const inactiveSet = new Set((inactiveNext.data ?? []).map(r => r.school_id))
    const nextSchools = (schoolsNext.data ?? [])
      .filter(s => gSchoolIds.has(s.id) && !inactiveSet.has(s.id))
      .map(s => ({ ...s, display_name: gNameMap.get(s.id) ?? s.display_name }))
      .sort((a, b) => a.display_name.localeCompare(b.display_name))
    let nextCoachRows: { school_id: number; email: string | null }[] = []
    const nextCoachRes = await db.from('boys_coaches').select('school_id, email').eq('season_id', 3).eq('is_active', true).in('school_id', [...gSchoolIds])
    if (!nextCoachRes.error) nextCoachRows = nextCoachRes.data ?? []
    const nextLogged  = new Set((logNext.data ?? []).map(r => `${r.school_id}_${r.field}`))
    const nextCoachMap = new Map(nextCoachRows.map(c => [c.school_id, { email: c.email }]))
    const nextFlagged = new Set((flagNext.data ?? []).map(r => r.school_id))
    const profileTask = findNextTask(nextSchools, nextLogged, nextCoachMap, gSchoolIds, nextFlagged, gender)
    if (profileTask) return NextResponse.json({ ok: true, task: profileTask })

    const { data: nextQueue } = await db
      .from('microcheck_tasks')
      .select('id, task_type, entity_id, gender, metadata')
      .eq('status', 'pending')
      .eq('gender', gender)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (nextQueue) {
      const m = nextQueue.metadata as Record<string, unknown>
      return NextResponse.json({ ok: true, task: {
        task_type: nextQueue.task_type, task_id: nextQueue.id, entity_id: nextQueue.entity_id, gender,
        team1_school_id: m.team1_school_id, team2_school_id: m.team2_school_id,
        team1_name: m.team1_name, team2_name: m.team2_name,
        score: m.score, meet_date: m.meet_date, season_id: m.season_id,
        dual_table: (m.table as string) ?? 'dual_meets',
      }})
    }
    return NextResponse.json({ ok: true, task: null })
  }

  // ── school_profile (existing flow) ───────────────────────────────────────────
  const { school_id, gender, field, status, value } = body as {
    school_id: number
    gender: 'M' | 'F'
    field: string
    status: 'completed' | 'cant_find'
    value: string | null
  }

  if (!school_id || !field || !status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // 1. Log the outcome (upsert — if they somehow hit it twice, last write wins)
  const { error: logErr } = await db.from('microcheck_task_log').upsert({
    admin_id:     user.id,
    school_id,
    gender,
    field,
    status,
    value_entered: value ?? null,
    completed_at:  new Date().toISOString(),
  }, { onConflict: 'school_id,gender,field' })

  if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 })

  // 2. Write value to target table (only for completed, not cant_find)
  if (status === 'completed' && value?.trim()) {
    if (SCHOOL_COLS.has(field)) {
      const { error: updateErr } = await db.from('schools')
        .update({ [field]: value.trim() })
        .eq('id', school_id)
      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    } else if (field === 'coach_name') {
      // Insert new coach row for season 3
      const { error: coachErr } = await db.from('coaches').insert({
        name:      value.trim(),
        school_id,
        season_id: 3,
        is_active: true,
      })
      if (coachErr) return NextResponse.json({ error: coachErr.message }, { status: 500 })

    } else if (field === 'coach_email') {
      // Update the active season-3 coach row
      const { error: coachErr } = await db.from('coaches')
        .update({ email: value.trim() })
        .eq('school_id', school_id)
        .eq('season_id', 3)
        .eq('is_active', true)
      if (coachErr) return NextResponse.json({ error: coachErr.message }, { status: 500 })
    }
    // roster_match: no DB write here — the actual matching is done in the roster import tool
  }

  // 3. Find and return the next task (same logic as /next)
  const genderTable = gender === 'M' ? 'boys_schools' : 'girls_schools'
  const [gsRes, schoolsRes, logRes, flagRes] = await Promise.all([
    db.from(genderTable).select('school_id'),
    db.from('schools')
      .select('id, display_name, address, website_url, twitter_handle, facebook_url, ad_name, ad_email')
      .eq('is_nj', true)
      .order('display_name'),
    db.from('microcheck_task_log').select('school_id, field').eq('gender', gender),
    db.from('microcheck_roster_flags').select('school_id').eq('gender', gender).eq('resolved', false),
  ])

  if (gsRes.error || schoolsRes.error || logRes.error) {
    return NextResponse.json({ ok: true, task: null })
  }

  const schoolIds = new Set((gsRes.data ?? []).map(r => r.school_id))
  const schools   = (schoolsRes.data ?? [])
    .filter(s => schoolIds.has(s.id))
    .sort((a, b) => a.display_name.localeCompare(b.display_name))
  // rosterSet = all boys schools; every school needs a roster/grade review

  let coachRows: { school_id: number; email: string | null }[] = []
  const coachRes = await db.from('boys_coaches')
    .select('school_id, email').eq('season_id', 3).eq('is_active', true)
    .in('school_id', [...schoolIds])
  if (!coachRes.error) coachRows = coachRes.data ?? []

  const loggedSet  = new Set((logRes.data ?? []).map(r => `${r.school_id}_${r.field}`))
  const coachMap   = new Map(coachRows.map(c => [c.school_id, { email: c.email }]))
  const rosterSet  = schoolIds  // every boys school needs a roster/grade review
  const flaggedSet = new Set((flagRes.data ?? []).map(r => r.school_id))

  const nextTask = findNextTask(schools, loggedSet, coachMap, rosterSet, flaggedSet, gender)
  return NextResponse.json({ ok: true, task: nextTask })
}
