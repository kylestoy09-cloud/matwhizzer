// The next microcheck task for a gender. Used by /next and by /complete (which
// hands back the following task), so both apply the same rules: this gender's
// NJ programs, minus schools inactive in the gender's working season, school
// profile tasks and queued tasks in microcheck_task_priority order.

import { getNewestSeason, getWorkingSeason } from '@/lib/season-context'
import type { createSupabaseAdmin } from '@/lib/supabase/service'
import { findNextTask } from './_engine'

type Db = ReturnType<typeof createSupabaseAdmin>

export async function nextMicrocheckTask(db: Db, gender: 'M' | 'F') {
  const programTable = gender === 'F' ? 'girls_schools' : 'boys_schools'
  const coachTable   = gender === 'F' ? 'girls_coaches' : 'boys_coaches'
  // A school marked inactive in a past season may be back; only this gender's working season counts
  const working      = await getWorkingSeason(gender)

  const [gsRes, schoolsRes, logRes, flagRes, inactiveRes] = await Promise.all([
    db.from(programTable).select('school_id, display_name'),
    db.from('schools')
      .select('id, display_name, address, website_url, twitter_handle, facebook_url, ad_name, ad_email')
      .eq('is_nj', true)
      .order('display_name'),
    db.from('microcheck_task_log')
      .select('school_id, field')
      .eq('gender', gender),
    db.from('microcheck_roster_flags')
      .select('school_id')
      .eq('gender', gender)
      .eq('resolved', false),
    db.from('inactive_school_seasons')
      .select('school_id')
      .eq('gender', gender)
      .eq('season_id', working.id),
  ])

  if (gsRes.error)       throw new Error(`${programTable}: ${gsRes.error.message}`)
  if (schoolsRes.error)  throw new Error(`schools: ${schoolsRes.error.message}`)
  if (logRes.error)      throw new Error(`task_log: ${logRes.error.message}`)
  if (flagRes.error)     throw new Error(`roster_flags: ${flagRes.error.message}`)
  if (inactiveRes.error) throw new Error(`inactive_seasons: ${inactiveRes.error.message}`)

  const programSchools  = gsRes.data ?? []
  const programIdSet    = new Set(programSchools.map(ps => ps.school_id))
  const programNameMap  = new Map(programSchools.map(ps => [ps.school_id, ps.display_name]))
  const inactiveIds     = new Set((inactiveRes.data ?? []).map(r => r.school_id))

  // Filter to this gender's active programs, merge in program display names, re-sort
  const schools = (schoolsRes.data ?? [])
    .filter(s => programIdSet.has(s.id) && !inactiveIds.has(s.id))
    .map(s => ({ ...s, display_name: programNameMap.get(s.id) ?? s.display_name }))
    .sort((a, b) => a.display_name.localeCompare(b.display_name))

  const programSchoolIds = schools.map(s => s.id)

  // Coaches
  let coachRows: { school_id: number; email: string | null }[] = []
  const coachRes = await db.from(coachTable)
    .select('school_id, email')
    .eq('season_id', (await getNewestSeason()).id)
    .eq('is_active', true)
    .in('school_id', programSchoolIds)
  if (!coachRes.error) coachRows = coachRes.data ?? []

  const loggedSet  = new Set((logRes.data ?? []).map(r => `${r.school_id}_${r.field}`))
  const coachMap   = new Map(coachRows.map(c => [c.school_id, { email: c.email }]))
  const rosterSet  = programIdSet  // every program school needs a roster/grade review
  const flaggedSet = new Set((flagRes.data ?? []).map(r => r.school_id))

  // ── Read priority order, fall back to default if table missing ───────────────
  const { data: prioRows } = await db
    .from('microcheck_task_priority')
    .select('task_type, sort_order, enabled')
    .eq('enabled', true)
    .order('sort_order')
  const orderedTypes = (prioRows ?? []).map(p => p.task_type)
  if (orderedTypes.length === 0) orderedTypes.push('school_profile', 'tie_resolution')

  const profileTask = findNextTask(schools, loggedSet, coachMap, rosterSet, flaggedSet, gender)

  for (const taskType of orderedTypes) {
    if (taskType === 'school_profile') {
      if (profileTask) return profileTask
    } else {
      const { data: queueTask } = await db
        .from('microcheck_tasks')
        .select('id, task_type, entity_id, gender, metadata')
        .eq('status', 'pending')
        .eq('task_type', taskType)
        .eq('gender', gender)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (queueTask) {
        const m = queueTask.metadata as Record<string, unknown>
        return {
          task_type:       queueTask.task_type,
          task_id:         queueTask.id,
          entity_id:       queueTask.entity_id,
          gender,
          team1_school_id: m.team1_school_id as number,
          team2_school_id: m.team2_school_id as number,
          team1_name:      m.team1_name as string,
          team2_name:      m.team2_name as string,
          score:           m.score as number,
          meet_date:       m.meet_date as string,
          season_id:       m.season_id as number,
          dual_table:      (m.table as string) ?? 'dual_meets',
        }
      }
    }
  }

  return null
}
