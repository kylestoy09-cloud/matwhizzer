// An existing wrestler counts as the same person as a "new" name in an import only when
// they share the name AND are on record at the same school: a name alias there, or (for
// out-of-state wrestlers, who get no aliases) a dual bout for that school. A name match
// alone joined different people at different schools into one profile.

import type { createSupabaseAdmin } from '@/lib/supabase/service'

type Db = ReturnType<typeof createSupabaseAdmin>
export type Person = { first_name: string; last_name: string; school_id: number | null }

export const personKey = (p: Person) =>
  `${p.first_name.trim().toLowerCase()}|${p.last_name.trim().toLowerCase()}|${p.school_id ?? 'null'}`

/** personKey → existing wrestler id, for people who already have a record at that school. */
export async function findSameSchoolWrestlers(db: Db, gender: string, people: Person[], matchTable?: 'dual_meet_matches' | 'dual_meet_matches_girls'): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const withSchool = people.filter(p => p.school_id != null)
  if (!withSchool.length) return out

  const lastNames = [...new Set(withSchool.map(p => p.last_name).filter(Boolean))]
  const candidates: { id: string; first_name: string; last_name: string }[] = []
  for (let i = 0; i < lastNames.length; i += 200) {
    const { data, error } = await db.from('wrestlers').select('id, first_name, last_name')
      .eq('gender', gender).in('last_name', lastNames.slice(i, i + 200))
    if (error) throw new Error(`wrestlers: ${error.message}`)
    candidates.push(...(data ?? []))
  }
  if (!candidates.length) return out

  const schoolsOf = new Map<string, Set<number>>()
  const ids = candidates.map(c => c.id)
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db.from('wrestler_name_aliases').select('wrestler_id, school_id').in('wrestler_id', ids.slice(i, i + 200))
    if (error) throw new Error(`wrestler_name_aliases: ${error.message}`)
    for (const a of data ?? []) {
      if (a.school_id == null) continue
      schoolsOf.set(a.wrestler_id, (schoolsOf.get(a.wrestler_id) ?? new Set()).add(a.school_id))
    }
  }
  if (matchTable) {
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100)
      for (const [w, sc] of [['wrestler_a_id', 'school_a_id'], ['wrestler_b_id', 'school_b_id']] as const) {
        const { data, error } = await db.from(matchTable).select(`${w}, ${sc}`).in(w, chunk).limit(100000)
        if (error) throw new Error(`${matchTable}: ${error.message}`)
        for (const r of (data ?? []) as Record<string, string | number | null>[]) {
          const id = r[w] as string | null, school = r[sc] as number | null
          if (id && school != null) schoolsOf.set(id, (schoolsOf.get(id) ?? new Set()).add(school))
        }
      }
    }
  }
  for (const p of withSchool) {
    const hit = candidates.find(c =>
      c.first_name.trim().toLowerCase() === p.first_name.trim().toLowerCase() &&
      c.last_name.trim().toLowerCase() === p.last_name.trim().toLowerCase() &&
      schoolsOf.get(c.id)?.has(p.school_id!))
    if (hit) out.set(personKey(p), hit.id)
  }
  return out
}
