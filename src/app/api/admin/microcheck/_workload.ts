// What microcheck still needs, for every task type and school, in one place. The
// task dealer (/next), the Task Order counts and the Missing Data page all read it,
// so they always agree.
//
// Task types come from microcheck_task_types (order, on/off, "do next" pin, school
// limit). A type with a gender covers that gender's active programs; a shared type
// (gender NULL) covers school data both programs use and is asked once per school.

import { getNewestSeason, getRosterImportSeason, getWorkingSeason } from '@/lib/season-context'
import type { createSupabaseAdmin } from '@/lib/supabase/service'
import { FIELD_DEFS } from './_engine'
import { loadReviewRows } from '@/lib/ncaa/review'
import { streamingLinks, type StreamLinks } from '@/lib/streamingLinks'
import { loadSpotCareers, type SpotCareer } from '@/lib/ncaa/spotCheck'
import type { ReviewRow } from '@/lib/ncaa/reviewShared'

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
  reset_at?:  string | null   // a reset: answers before it don't count, so every school is asked again
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

export type QueueItem = { id: string; entity_id: string; metadata: Record<string, unknown>; college?: ReviewRow; spot?: SpotCareer }

export type WorkSchool = { id: number; name: string; boys: boolean; girls: boolean }

export type Workload = {
  types:   TaskType[]                         // dealing order: pinned first, then sort_order
  schools: WorkSchool[]                       // both genders' active programs, A→Z
  status:  (typeKey: string, schoolId: number) => CellStatus
  nameFor: (type: TaskType, schoolId: number) => string
  queue:   Map<string, QueueItem[]>             // queue type key → pending tasks
  focus:   { id: string; task_key: string; school_id: number }[]
  current: (type: TaskType, schoolId: number) => string | null   // the value on file
  streams: (gender: Gender, schoolId: number) => StreamLinks | null
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
  const [workingM, workingF, newest, rosterM, rosterF] = await Promise.all([
    getWorkingSeason('M'), getWorkingSeason('F'), getNewestSeason(), getRosterImportSeason(db, 'M'), getRosterImportSeason(db, 'F'),
  ])

  const [streamM, streamF] = await Promise.all([streamingLinks(db, 'M', newest.id), streamingLinks(db, 'F', newest.id)])
  const [typesRes, boysRes, girlsRes, schoolsRes, logRes, flagRes, inactiveRes, coachM, coachF, queueRes, focusRes, importRes, completeRes] = await Promise.all([
    db.from('microcheck_task_types').select('*'),
    db.from('boys_schools').select('school_id, display_name'),
    db.from('girls_schools').select('school_id, display_name'),
    db.from('schools').select('id, display_name, address, website_url, twitter_handle, facebook_url, ad_name, ad_email').eq('is_nj', true),
    db.from('microcheck_task_log').select('school_id, gender, field, status, completed_at').limit(100000),
    db.from('microcheck_roster_flags').select('school_id, gender').eq('resolved', false),
    db.from('inactive_school_seasons').select('school_id, gender, season_id').in('season_id', [workingM.id, workingF.id]),
    db.from('boys_coaches').select('school_id, email, name').eq('season_id', newest.id).eq('is_active', true),
    db.from('girls_coaches').select('school_id, email, name').eq('season_id', newest.id).eq('is_active', true),
    db.from('microcheck_tasks').select('id, task_type, entity_id, gender, metadata, priority, created_at').eq('status', 'pending')
      .order('priority', { ascending: false }).order('created_at', { ascending: true }),
    db.from('microcheck_focus').select('id, task_key, school_id, created_at').order('created_at'),
    db.from('roster_grade_import').select('gender, school_id, status').limit(100000),
    db.from('roster_grade_school_complete').select('school_id, gender, season_id').in('season_id', [rosterM.id, rosterF.id]),
  ])
  for (const [name, r] of Object.entries({ typesRes, boysRes, girlsRes, schoolsRes, logRes, flagRes, inactiveRes, coachM, coachF, queueRes, focusRes, importRes, completeRes })) {
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

  const log = new Map<string, { status: string; at: string }>()   // `${gender}|${school}|${field}` → status, when
  for (const r of logRes.data ?? []) log.set(`${r.gender}|${r.school_id}|${r.field}`, { status: r.status, at: r.completed_at })
  const flagged = new Set((flagRes.data ?? []).map(r => `${String(r.gender).trim()}|${r.school_id}`))
  const coaches = {
    M: new Map((coachM.data ?? []).map(c => [c.school_id as number, (c.email as string | null) ?? null])),
    F: new Map((coachF.data ?? []).map(c => [c.school_id as number, (c.email as string | null) ?? null])),
  }
  const coachNames = {
    M: new Map((coachM.data ?? []).map(c => [c.school_id as number, (c.name as string | null) ?? null])),
    F: new Map((coachF.data ?? []).map(c => [c.school_id as number, (c.name as string | null) ?? null])),
  }
  const streamsBy = { M: streamM, F: streamF }

  // Roster import per gender: which schools have rows matched to them, and whether any
  // rows are still unmatched (step 1 not finished: those rows carry only a school name)
  const importUnmatched = new Set<string>()
  const importMatched = new Set<string>()
  for (const r of importRes.data ?? []) {
    if (r.status === 'pending') importUnmatched.add(r.gender as string)
    else if (r.school_id) importMatched.add(`${r.gender}|${r.school_id}`)
  }

  // Schools marked complete in the Roster Grade Import tool (that gender's roster season)
  const rosterComplete = new Set((completeRes.data ?? [])
    .filter(r => (r.gender === 'M' && r.season_id === rosterM.id) || (r.gender === 'F' && r.season_id === rosterF.id))
    .map(r => `${r.gender}|${r.school_id}`))

  const typeByKey = new Map(types.map(t => [t.key, t]))
  const cache = new Map<string, CellStatus>()

  function compute(t: TaskType, schoolId: number): CellStatus {
    const s = schoolById.get(schoolId)
    if (!s || t.source !== 'school_field' || !t.field || !FIELD_DEFS[t.field]) return 'na'
    if (t.gender === 'M' && !s.boys) return 'na'
    if (t.gender === 'F' && !s.girls) return 'na'
    // a reset (Kyle 2026-11-19: "all micro checks should be able to be reset and rechecked"): only answers given since
    // count, and data on file no longer counts by itself — every school is asked again, shown what's there
    const fresh = (at: string | null | undefined) => !t.reset_at || (!!at && at > t.reset_at)
    const logged = (g: Gender) => { const e = log.get(`${g}|${schoolId}|${t.field}`); return e && fresh(e.at) ? e.status : undefined }
    // Shared data counts as handled when either program's microcheck handled it
    const loggedAny = t.gender ? logged(t.gender) : (logged('M') ?? logged('F'))
    const onFile = !t.reset_at
    const fromLog = (st: string | undefined): CellStatus | null => st === 'completed' ? 'completed' : st === 'cant_find' ? 'cant_find' : null

    if (t.field === 'roster_match') {
      // finished in the Roster Grade Import tool: nothing left for microcheck
      if (rosterComplete.has(`${t.gender ?? 'M'}|${schoolId}`)) return 'done'
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
      if (t.field === 'coach_name') return hasCoach && onFile ? 'done' : (fromLog(loggedAny) ?? 'missing')
      if (!hasCoach) return 'na'
      return coaches[g].get(schoolId)?.trim() && onFile ? 'done' : (fromLog(loggedAny) ?? 'missing')
    }
    if (t.field === 'stream_choice') {
      // only programs with a link to look at; done once someone picked (since the reset)
      const l = streamsBy[t.gender ?? 'M'].get(schoolId)
      if (!l) return 'na'
      if (l.choice && fresh(l.choice_at)) return 'done'
      return fromLog(loggedAny) ?? 'missing'
    }
    const value = njById.get(schoolId)?.[t.field]
    if (typeof value === 'string' && value.trim() && onFile) return 'done'
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
    // College review: the entrants still waiting in that gender's college results, newest year first
    if (t.queue_type === 'college_review') {
      const rows = t.gender ? await loadReviewRows(db, t.gender) : []
      queue.set(t.key, rows.map(r => ({ id: `${t.gender}:${r.id}`, entity_id: String(r.id), metadata: {}, college: r })))
      continue
    }
    // College spot check: the careers the importer matched by itself, shuffled (src/lib/ncaa/spotCheck.ts)
    if (t.queue_type === 'college_spot') {
      const rows = t.gender ? await loadSpotCareers(db, t.gender, t.reset_at ?? null) : []
      queue.set(t.key, rows.map(c => ({ id: `spot:${t.gender}:${c.key}`, entity_id: c.key, metadata: {}, spot: c })))
      continue
    }
    queue.set(t.key, (queueRes.data ?? [])
      .filter(q => q.task_type === t.queue_type && q.gender === t.gender)
      .map(q => ({ id: q.id as string, entity_id: String(q.entity_id), metadata: (q.metadata ?? {}) as Record<string, unknown> })))
  }

  // the value on file for a school field (shown on a reset check to confirm or change)
  function current(t: TaskType, schoolId: number): string | null {
    const g = t.gender ?? 'M'
    if (t.field === 'coach_name') return coachNames[g].get(schoolId) ?? null
    if (t.field === 'coach_email') return coaches[g].get(schoolId) ?? null
    if (!t.field || t.field === 'roster_match' || t.field === 'stream_choice') return null
    const v = njById.get(schoolId)?.[t.field]
    return typeof v === 'string' && v.trim() ? v : null
  }

  return {
    types, schools, status, nameFor, queue, current, streams: (g, id) => streamsBy[g].get(id) ?? null,
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
