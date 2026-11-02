// What microcheck still needs, for every task type and school, in one place. The
// task dealer (/next), the Task Order counts and the Missing Data page all read it,
// so they always agree.
//
// Task types come from microcheck_task_types (order, on/off, "do next" pin, school
// limit). A type with a gender covers that gender's active programs; a shared type
// (gender NULL) covers school data both programs use and is asked once per school.

import { getNewestSeason, getWorkingSeason } from '@/lib/season-context'
import type { createSupabaseAdmin } from '@/lib/supabase/service'
import { FIELD_DEFS } from './_engine'

type Db = ReturnType<typeof createSupabaseAdmin>
type Gender = 'M' | 'F'

export type TaskType = {
  key:        string
  label:      string
  gender:     Gender | null
  source:     'school_field' | 'queue'
  field:      string | null
  queue_type: string | null
  sort_order: number
  enabled:    boolean
  pinned_at:  string | null
  school_ids: number[] | null
}

// done       the data is on file
// completed  entered through microcheck
// cant_find  someone looked and could not find it
// flagged    roster held for manual review
// missing    still to do
// waiting    roster grades: the gender's import is loaded but this school's rows are not
//            matched to it yet (Roster Grade Import step 1), so there is nothing to check
// na         does not apply (no program, or no coach yet for a coach email)
export type CellStatus = 'done' | 'completed' | 'cant_find' | 'flagged' | 'missing' | 'waiting' | 'na'

export type QueueItem = { id: string; entity_id: string; metadata: Record<string, unknown> }

export type WorkSchool = { id: number; name: string; boys: boolean; girls: boolean }

export type Workload = {
  types:   TaskType[]                         // dealing order: pinned first, then sort_order
  schools: WorkSchool[]                       // both genders' active programs, A→Z
  status:  (typeKey: string, schoolId: number) => CellStatus
  nameFor: (type: TaskType, schoolId: number) => string
  queue:   Map<string, QueueItem[]>             // queue type key → pending tasks
  focus:   { id: string; task_key: string; school_id: number }[]
}

export const typeGenderLabel = (g: Gender | null) => (g === 'F' ? 'Girls' : g === 'M' ? 'Boys' : 'Both programs')

/** Dealing order: "do next" pins first (oldest pin first), then the saved order. */
export function orderTypes(types: TaskType[]): TaskType[] {
  return [...types].sort((a, b) => {
    if (a.pinned_at && b.pinned_at) return a.pinned_at.localeCompare(b.pinned_at)
    if (a.pinned_at) return -1
    if (b.pinned_at) return 1
    return a.sort_order - b.sort_order
  })
}

export async function loadWorkload(db: Db): Promise<Workload> {
  const [workingM, workingF, newest] = await Promise.all([getWorkingSeason('M'), getWorkingSeason('F'), getNewestSeason()])

  const [typesRes, boysRes, girlsRes, schoolsRes, logRes, flagRes, inactiveRes, coachM, coachF, queueRes, focusRes, importRes] = await Promise.all([
    db.from('microcheck_task_types').select('*'),
    db.from('boys_schools').select('school_id, display_name'),
    db.from('girls_schools').select('school_id, display_name'),
    db.from('schools').select('id, display_name, address, website_url, twitter_handle, facebook_url, ad_name, ad_email').eq('is_nj', true),
    db.from('microcheck_task_log').select('school_id, gender, field, status').limit(100000),
    db.from('microcheck_roster_flags').select('school_id, gender').eq('resolved', false),
    db.from('inactive_school_seasons').select('school_id, gender, season_id').in('season_id', [workingM.id, workingF.id]),
    db.from('boys_coaches').select('school_id, email').eq('season_id', newest.id).eq('is_active', true),
    db.from('girls_coaches').select('school_id, email').eq('season_id', newest.id).eq('is_active', true),
    db.from('microcheck_tasks').select('id, task_type, entity_id, gender, metadata, priority, created_at').eq('status', 'pending')
      .order('priority', { ascending: false }).order('created_at', { ascending: true }),
    db.from('microcheck_focus').select('id, task_key, school_id, created_at').order('created_at'),
    db.from('roster_grade_import').select('gender, school_id, status').limit(100000),
  ])
  for (const [name, r] of Object.entries({ typesRes, boysRes, girlsRes, schoolsRes, logRes, flagRes, inactiveRes, coachM, coachF, queueRes, focusRes, importRes })) {
    if (r.error) throw new Error(`${name}: ${r.error.message}`)
  }

  const types = orderTypes((typesRes.data ?? []) as TaskType[])

  // Active programs: a school inactive in the gender's working season is out
  const inactive = new Set((inactiveRes.data ?? [])
    .filter(r => (r.gender === 'M' && r.season_id === workingM.id) || (r.gender === 'F' && r.season_id === workingF.id))
    .map(r => `${r.gender}${r.school_id}`))
  const njById = new Map((schoolsRes.data ?? []).map(s => [s.id as number, s as Record<string, unknown>]))
  const boysName  = new Map((boysRes.data ?? []).filter(p => njById.has(p.school_id) && !inactive.has(`M${p.school_id}`)).map(p => [p.school_id as number, p.display_name as string]))
  const girlsName = new Map((girlsRes.data ?? []).filter(p => njById.has(p.school_id) && !inactive.has(`F${p.school_id}`)).map(p => [p.school_id as number, p.display_name as string]))

  const schools: WorkSchool[] = [...new Set([...boysName.keys(), ...girlsName.keys()])]
    .map(id => ({ id, name: String(njById.get(id)!.display_name), boys: boysName.has(id), girls: girlsName.has(id) }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const schoolById = new Map(schools.map(s => [s.id, s]))

  const log = new Map<string, string>()                     // `${gender}|${school}|${field}` → status
  for (const r of logRes.data ?? []) log.set(`${r.gender}|${r.school_id}|${r.field}`, r.status)
  const flagged = new Set((flagRes.data ?? []).map(r => `${String(r.gender).trim()}|${r.school_id}`))
  const coaches = {
    M: new Map((coachM.data ?? []).map(c => [c.school_id as number, (c.email as string | null) ?? null])),
    F: new Map((coachF.data ?? []).map(c => [c.school_id as number, (c.email as string | null) ?? null])),
  }

  // Roster import per gender: which schools have rows matched to them, and whether any
  // rows are still unmatched (step 1 not finished: those rows carry only a school name)
  const importUnmatched = new Set<string>()
  const importMatched = new Set<string>()
  for (const r of importRes.data ?? []) {
    if (r.status === 'pending') importUnmatched.add(r.gender as string)
    else if (r.school_id) importMatched.add(`${r.gender}|${r.school_id}`)
  }

  const typeByKey = new Map(types.map(t => [t.key, t]))
  const cache = new Map<string, CellStatus>()

  function compute(t: TaskType, schoolId: number): CellStatus {
    const s = schoolById.get(schoolId)
    if (!s || t.source !== 'school_field' || !t.field || !FIELD_DEFS[t.field]) return 'na'
    if (t.gender === 'M' && !s.boys) return 'na'
    if (t.gender === 'F' && !s.girls) return 'na'
    const logged = (g: Gender) => log.get(`${g}|${schoolId}|${t.field}`)
    // Shared data counts as handled when either program's microcheck handled it
    const loggedAny = t.gender ? logged(t.gender) : (logged('M') ?? logged('F'))
    const fromLog = (st: string | undefined): CellStatus | null => st === 'completed' ? 'completed' : st === 'cant_find' ? 'cant_find' : null

    if (t.field === 'roster_match') {
      if (flagged.has(`${t.gender}|${schoolId}`)) return 'flagged'
      const logged = fromLog(loggedAny)
      if (logged) return logged
      // Until step 1 links this gender's rows to schools, a school without linked rows
      // would wrongly show as "not in the import": hold it. Once step 1 is done, a school
      // with no rows really has none and gets the task (to mark it no roster).
      const g = t.gender ?? 'M'
      if (importUnmatched.has(g) && !importMatched.has(`${g}|${schoolId}`)) return 'waiting'
      return 'missing'
    }
    if (t.field === 'coach_name' || t.field === 'coach_email') {
      const g = t.gender ?? 'M'
      const hasCoach = coaches[g].has(schoolId)
      if (t.field === 'coach_name') return hasCoach ? 'done' : (fromLog(loggedAny) ?? 'missing')
      if (!hasCoach) return 'na'
      return coaches[g].get(schoolId)?.trim() ? 'done' : (fromLog(loggedAny) ?? 'missing')
    }
    const value = njById.get(schoolId)?.[t.field]
    if (typeof value === 'string' && value.trim()) return 'done'
    return fromLog(loggedAny) ?? 'missing'
  }

  function status(typeKey: string, schoolId: number): CellStatus {
    const k = `${typeKey}|${schoolId}`
    let v = cache.get(k)
    if (v === undefined) {
      const t = typeByKey.get(typeKey)
      v = t ? compute(t, schoolId) : 'na'
      cache.set(k, v)
    }
    return v
  }

  // A school's name for a type: the program's name for a gender type, the school record's for shared data
  function nameFor(t: TaskType, schoolId: number): string {
    if (t.gender === 'M') return boysName.get(schoolId) ?? schoolById.get(schoolId)?.name ?? `School ${schoolId}`
    if (t.gender === 'F') return girlsName.get(schoolId) ?? schoolById.get(schoolId)?.name ?? `School ${schoolId}`
    return schoolById.get(schoolId)?.name ?? `School ${schoolId}`
  }

  const queue = new Map<string, QueueItem[]>()
  for (const t of types) {
    if (t.source !== 'queue') continue
    queue.set(t.key, (queueRes.data ?? [])
      .filter(q => q.task_type === t.queue_type && q.gender === t.gender)
      .map(q => ({ id: q.id as string, entity_id: String(q.entity_id), metadata: (q.metadata ?? {}) as Record<string, unknown> })))
  }

  return {
    types, schools, status, nameFor, queue,
    focus: (focusRes.data ?? []).map(f => ({ id: f.id as string, task_key: f.task_key as string, school_id: f.school_id as number })),
  }
}

/** Open work per type: missing cells (school fields) or pending tasks (queues). */
export function openCounts(w: Workload): Map<string, { open: number; total: number; waiting: number }> {
  const out = new Map<string, { open: number; total: number; waiting: number }>()
  for (const t of w.types) {
    if (t.source === 'queue') { out.set(t.key, { open: w.queue.get(t.key)?.length ?? 0, total: w.queue.get(t.key)?.length ?? 0, waiting: 0 }); continue }
    let open = 0, total = 0, waiting = 0
    for (const s of w.schools) {
      const st = w.status(t.key, s.id)
      if (st === 'na') continue
      total++
      if (st === 'missing') open++
      if (st === 'waiting') waiting++
    }
    out.set(t.key, { open, total, waiting })
  }
  return out
}
