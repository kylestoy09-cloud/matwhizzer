import { NextRequest, NextResponse } from 'next/server'
import { getNewestSeason } from '@/lib/season-context'
import { createSupabaseServer }  from '@/lib/supabase/server'
import { createSupabaseAdmin }   from '@/lib/supabase/service'
import { nextMicrocheckTask, releaseTask } from '../_next'
import { decideCollegeEntry } from '@/lib/ncaa/review'
import { setStreamChoice, type StreamChoice } from '@/lib/streamingLinks'
import { decideSpot, type SpotAction } from '@/lib/ncaa/spotCheck'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) return null
  const { data: appUser } = await userSb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

// The save already succeeded, so a failed lookup of the next task just ends the run
async function followingTask(db: ReturnType<typeof createSupabaseAdmin>, userId: string) {
  try { return await nextMicrocheckTask(db, userId) } catch { return null }
}

// Fields that map directly to a column on the schools table
const SCHOOL_COLS = new Set(['address', 'website_url', 'twitter_handle', 'facebook_url', 'ad_name', 'ad_email'])

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const db = createSupabaseAdmin()

  // ── college_review ────────────────────────────────────────────────────────────
  // The decision itself is the College page's (it covers the same name at the same college in every year); a
  // completed microcheck_tasks row credits it on the scoreboard.
  if (body.task_type === 'college_review') {
    const { entry_id, gender, action, wrestler_id } = body as { entry_id: number; gender: 'M' | 'F'; action: string; wrestler_id?: string }
    if ((gender !== 'M' && gender !== 'F') || !Number.isInteger(entry_id) || (action !== 'accept' && action !== 'not_ours')) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    try {
      await decideCollegeEntry(db, gender, entry_id, action, wrestler_id ?? null, user.email ?? '')
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
    }
    const { error: logErr } = await db.from('microcheck_tasks').upsert({
      task_type: 'college_review', entity_id: String(entry_id), gender, status: 'completed',
      metadata: { action, wrestler_id: wrestler_id ?? null }, completed_at: new Date().toISOString(), completed_by: user.id,
    }, { onConflict: 'task_type,entity_id,gender' })
    if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 })
    await releaseTask(db, `college:${gender}:${entry_id}`)
    return NextResponse.json({ ok: true, task: await followingTask(db, user.id) })
  }

  // ── college_spot (Kyle 2026-11-19) ──────────────────────────────────────────────
  if (body.task_type === 'college_spot') {
    const { key, gender, action } = body as { key: string; gender: 'M' | 'F'; action: SpotAction }
    if ((gender !== 'M' && gender !== 'F') || !/^[0-9a-f-]{36}\|\d+$/.test(key ?? '') || !['confirmed', 'not_him', 'cant_tell'].includes(action)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    try { await decideSpot(db, gender, key, action, user.email ?? user.id) } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
    }
    const { error: logErr } = await db.from('microcheck_tasks').upsert({
      task_type: 'college_spot', entity_id: key, gender, status: 'completed',
      metadata: { action }, completed_at: new Date().toISOString(), completed_by: user.id,
    }, { onConflict: 'task_type,entity_id,gender' })
    if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 })
    await releaseTask(db, `spot:${gender}:${key}`)
    return NextResponse.json({ ok: true, task: await followingTask(db, user.id) })
  }

  // ── tie_resolution ────────────────────────────────────────────────────────────
  if (body.task_type === 'tie_resolution') {
    const { task_id, entity_id, winner, dual_table } = body as {
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

    await releaseTask(db, `queue:${task_id}`)
    // Hand back the next task (same rules as /next)
    return NextResponse.json({ ok: true, task: await followingTask(db, user.id) })
  }

  // ── school_profile (existing flow) ───────────────────────────────────────────
  const { school_id, gender, field, status, value, task_key } = body as {
    school_id: number
    gender: 'M' | 'F'
    field: string
    task_key?: string
    status: 'completed' | 'cant_find'
    value: string | null
  }

  if (!school_id || !field || !status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  // the home streaming account (Kyle 2026-11-19): NFHS, Hudl, Both or Neither — the links stay on file, the pick decides
  // which the site shows
  if (field === 'stream_choice' && status === 'completed') {
    if (!['nfhs', 'hudl', 'both', 'neither'].includes(value ?? '')) return NextResponse.json({ error: 'Pick NFHS, Hudl, Both or Neither' }, { status: 400 })
    const err = await setStreamChoice(db, gender, school_id, (await getNewestSeason()).id, value as StreamChoice, user.email ?? user.id)
    if (err) return NextResponse.json({ error: err }, { status: 500 })
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
  const coachTable = gender === 'F' ? 'girls_coaches' : 'boys_coaches'
  // body.unchanged: a reset check confirmed what's on file ("Still right") — nothing to write
  if (status === 'completed' && value?.trim() && !body.unchanged && field !== 'stream_choice') {
    if (SCHOOL_COLS.has(field)) {
      const { error: updateErr } = await db.from('schools')
        .update({ [field]: value.trim() })
        .eq('id', school_id)
      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    } else if (field === 'coach_name') {
      // The newest season's head coach: renamed when there is one (a reset check correcting it), else added
      const seasonId = (await getNewestSeason()).id
      const { data: existing } = await db.from(coachTable).select('id').eq('school_id', school_id).eq('season_id', seasonId).eq('is_active', true).maybeSingle()
      const { error: coachErr } = existing
        ? await db.from(coachTable).update({ name: value.trim() }).eq('id', existing.id)
        : await db.from(coachTable).insert({ name: value.trim(), title: 'Head Coach', school_id, season_id: seasonId, is_active: true })
      if (coachErr) return NextResponse.json({ error: coachErr.message }, { status: 500 })

    } else if (field === 'coach_email') {
      // Update the active coach row for the newest season
      const { error: coachErr } = await db.from(coachTable)
        .update({ email: value.trim() })
        .eq('school_id', school_id)
        .eq('season_id', (await getNewestSeason()).id)
        .eq('is_active', true)
      if (coachErr) return NextResponse.json({ error: coachErr.message }, { status: 500 })
    }
    // roster_match: no DB write here — the actual matching is done in the roster import tool
  }

  if (task_key) await releaseTask(db, `${task_key}:${school_id}`, task_key, school_id)

  // 3. Hand back the next task (same rules as /next)
  return NextResponse.json({ ok: true, task: await followingTask(db, user.id) })
}
