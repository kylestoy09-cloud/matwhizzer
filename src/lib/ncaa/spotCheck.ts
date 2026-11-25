// College spot check (Kyle 2026-11-19: "a micro check tool to confirm college matches randomly … for the wrestlers you
// automatically linked to a college career, we should be spot checking these as well"). One task per career — one of
// our wrestlers at one college, every year the importer matched by itself ('auto') — dealt in a shuffled order that's
// the same for everyone. The checker searches the web ("name college wrestling", "name college high school
// wrestling") and answers:
//   confirmed  every 'auto' year of that career → 'confirmed'
//   not him    every 'auto' year of that career → 'not_ours' (unlinked)
//   can't tell nothing changes; the career leaves the queue until the check is reset
// A decision is logged as a completed microcheck_tasks row (task_type 'college_spot', entity "<wrestler>|<college>").
import type { SupabaseClient } from '@supabase/supabase-js'
import { collegeTablesOf, highSchools, type Side } from '@/lib/ncaa/stats'

export type SpotCareer = {
  key: string                       // "<wrestler_id>|<college_id>"
  wrestler_id: string; name: string; hs: string | null
  college_id: number; college: string
  years: { year: number; level: string; weight: number; place: number | null }[]
}
export type SpotAction = 'confirmed' | 'not_him' | 'cant_tell'

// the same shuffle for everyone: a hash of the career's key
const order = (k: string) => { let h = 2166136261; for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

/** The careers still to spot check, shuffled: 'auto' matches not answered since the check's reset */
export async function loadSpotCareers(db: SupabaseClient, g: Side, resetAt: string | null): Promise<SpotCareer[]> {
  const T = collegeTablesOf(g)
  const rows: { wrestler_id: string; college_id: number; weight: number; place: number | null; college: { name: string } | null; event: { year: number; level: string } }[] = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from(T.entries).select(`wrestler_id, college_id, weight, place, college:colleges(name), event:${T.events}!inner(year, level)`)
      .eq('match_status', 'auto').not('wrestler_id', 'is', null).not('college_id', 'is', null).order('id').range(f, f + 999)
    if (error) throw new Error(`${T.entries}: ${error.message}`)
    rows.push(...((data ?? []) as unknown as typeof rows)); if ((data ?? []).length < 1000) break
  }
  const { data: done, error } = await db.from('microcheck_tasks').select('entity_id, completed_at').eq('task_type', 'college_spot').eq('gender', g).eq('status', 'completed')
  if (error) throw new Error(`microcheck_tasks: ${error.message}`)
  const answered = new Set((done ?? []).filter(d => !resetAt || (d.completed_at && d.completed_at > resetAt)).map(d => d.entity_id as string))
  const by = new Map<string, SpotCareer>()
  for (const r of rows) {
    const key = `${r.wrestler_id}|${r.college_id}`
    if (answered.has(key)) continue
    const c = by.get(key) ?? by.set(key, { key, wrestler_id: r.wrestler_id, name: '', hs: null, college_id: r.college_id, college: r.college?.name ?? '', years: [] }).get(key)!
    c.years.push({ year: r.event.year, level: r.event.level, weight: r.weight, place: r.place })
  }
  const list = [...by.values()]
  for (const c of list) c.years.sort((a, b) => a.year - b.year)
  // name and high school are looked up only for the career dealt (enrichSpot) — the queue itself stays cheap
  return list.sort((a, b) => order(a.key) - order(b.key))
}

/** The dealt career's name and high school */
export async function enrichSpot(db: SupabaseClient, c: SpotCareer): Promise<SpotCareer> {
  const { data: w } = await db.from('wrestlers').select('first_name, last_name, suffix').eq('id', c.wrestler_id).maybeSingle()
  const hs = await highSchools(db, [c.wrestler_id])
  return { ...c, name: w ? [w.first_name, w.last_name, w.suffix].filter(Boolean).join(' ') : '', hs: hs.get(c.wrestler_id)?.name ?? null }
}

/** Save a spot check answer */
export async function decideSpot(db: SupabaseClient, g: Side, key: string, action: SpotAction, by: string): Promise<void> {
  const [wrestlerId, collegeId] = key.split('|')
  const T = collegeTablesOf(g)
  if (action !== 'cant_tell') {
    const upd = action === 'confirmed'
      ? { match_status: 'confirmed', reviewed_at: new Date().toISOString(), reviewed_by: `${by} (spot check)` }
      : { match_status: 'not_ours', wrestler_id: null, reviewed_at: new Date().toISOString(), reviewed_by: `${by} (spot check)` }
    const { error } = await db.from(T.entries).update(upd).eq('wrestler_id', wrestlerId).eq('college_id', Number(collegeId)).eq('match_status', 'auto')
    if (error) throw new Error(error.message)
  }
}
