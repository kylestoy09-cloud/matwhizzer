import { NextRequest, NextResponse } from 'next/server'
import { getNewestSeason } from '@/lib/season-context'
import { createSupabaseServer }  from '@/lib/supabase/server'
import { createSupabaseAdmin }   from '@/lib/supabase/service'
import { nextMicrocheckTask }    from '../_next'

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
async function followingTask(db: ReturnType<typeof createSupabaseAdmin>, gender: 'M' | 'F') {
  try { return await nextMicrocheckTask(db, gender) } catch { return null }
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

    // Hand back the next task (same rules as /next)
    return NextResponse.json({ ok: true, task: await followingTask(db, gender) })
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
  const coachTable = gender === 'F' ? 'girls_coaches' : 'boys_coaches'
  if (status === 'completed' && value?.trim()) {
    if (SCHOOL_COLS.has(field)) {
      const { error: updateErr } = await db.from('schools')
        .update({ [field]: value.trim() })
        .eq('id', school_id)
      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    } else if (field === 'coach_name') {
      // Insert new head coach row for the newest season, in this gender's coach table
      const { error: coachErr } = await db.from(coachTable).insert({
        name:      value.trim(),
        title:     'Head Coach',
        school_id,
        season_id: (await getNewestSeason()).id,
        is_active: true,
      })
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

  // 3. Hand back the next task (same rules as /next)
  return NextResponse.json({ ok: true, task: await followingTask(db, gender) })
}
