// The next microcheck task, from one queue covering boys and girls. Used by /next and
// by /complete (which hands back the following task), so both apply the same rules:
//   1. school + check pairs pushed to the front from the Missing Data page, oldest first
//   2. then each enabled task type in the Task Order page's order ("do next" pins first);
//      within a type, schools A→Z (only the type's chosen schools, when it has a list)
// A task handed out is held for that person for 10 minutes, so the next person who
// asks gets the next task.

import type { createSupabaseAdmin } from '@/lib/supabase/service'
import { FIELD_DEFS, type TaskInfo } from './_engine'
import { loadWorkload, typeGenderLabel, type QueueItem, type TaskType, type Workload } from './_workload'

type Db = ReturnType<typeof createSupabaseAdmin>

const HOLD_MINUTES = 10

export const claimKeyFor = (task: TaskInfo) =>
  task.task_type === 'tie_resolution' ? `queue:${task.task_id}` : `${task.task_key}:${task.school_id}`

function schoolTask(w: Workload, t: TaskType, schoolId: number): TaskInfo {
  const def = FIELD_DEFS[t.field!]
  const school = w.schools.find(s => s.id === schoolId)!
  return {
    task_type:   'school_profile',
    task_key:    t.key,
    group_label: typeGenderLabel(t.gender),
    school_id:   schoolId,
    school_name: w.nameFor(t, schoolId),
    // Shared data is logged under the school's boys program, or girls when it has none
    gender:      t.gender ?? (school.boys ? 'M' : 'F'),
    field:       t.field!,
    label:       def.label,
    input_type:  def.input_type,
    placeholder: def.placeholder,
  }
}

function queueTask(t: TaskType, q: QueueItem): TaskInfo {
  const m = q.metadata
  return {
    task_type:       'tie_resolution',
    task_key:        t.key,
    group_label:     typeGenderLabel(t.gender),
    task_id:         q.id,
    entity_id:       q.entity_id,
    gender:          t.gender ?? 'M',
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

/** Every task still to do, in dealing order. */
function* candidates(w: Workload): Generator<TaskInfo> {
  const typeByKey = new Map(w.types.map(t => [t.key, t]))
  for (const f of w.focus) {
    const t = typeByKey.get(f.task_key)
    if (t?.enabled && t.source === 'school_field' && w.status(t.key, f.school_id) === 'missing') yield schoolTask(w, t, f.school_id)
  }
  for (const t of w.types) {
    if (!t.enabled) continue
    if (t.source === 'queue') {
      for (const q of w.queue.get(t.key) ?? []) yield queueTask(t, q)
      continue
    }
    const only = t.school_ids?.length ? new Set(t.school_ids) : null
    for (const s of w.schools) {
      if (only && !only.has(s.id)) continue
      if (w.status(t.key, s.id) === 'missing') yield schoolTask(w, t, s.id)
    }
  }
}

// skip: tasks this person passed over this session; their holds are released
export async function nextMicrocheckTask(db: Db, userId: string, skip: Set<string> = new Set()): Promise<TaskInfo | null> {
  if (skip.size) await db.from('microcheck_claims').delete().eq('claimed_by', userId).in('claim_key', [...skip])

  // Holds older than the window are released
  const cutoff = new Date(Date.now() - HOLD_MINUTES * 60_000).toISOString()
  const { error: relErr } = await db.from('microcheck_claims').delete().lt('claimed_at', cutoff)
  if (relErr) throw new Error(`microcheck_claims: ${relErr.message}`)

  const [w, { data: claims, error: claimErr }] = await Promise.all([
    loadWorkload(db),
    db.from('microcheck_claims').select('claim_key, claimed_by'),
  ])
  if (claimErr) throw new Error(`microcheck_claims: ${claimErr.message}`)
  const heldBy = new Map((claims ?? []).map(c => [c.claim_key as string, c.claimed_by as string]))

  for (const task of candidates(w)) {
    const key = claimKeyFor(task)
    if (skip.has(key)) continue
    const holder = heldBy.get(key)
    if (holder && holder !== userId) continue
    if (!holder) {
      // Someone may have taken it since the read: the insert decides
      const { error } = await db.from('microcheck_claims').insert({ claim_key: key, claimed_by: userId })
      if (error) {
        if (error.code === '23505') continue
        throw new Error(`microcheck_claims: ${error.message}`)
      }
    } else {
      await db.from('microcheck_claims').update({ claimed_at: new Date().toISOString() }).eq('claim_key', key)
    }
    return task
  }
  return null
}

/** Done with a task: release its hold and drop it from the front-of-queue list. */
export async function releaseTask(db: Db, claimKey: string, taskKey?: string, schoolId?: number) {
  await db.from('microcheck_claims').delete().eq('claim_key', claimKey)
  if (taskKey && schoolId != null) await db.from('microcheck_focus').delete().eq('task_key', taskKey).eq('school_id', schoolId)
}
