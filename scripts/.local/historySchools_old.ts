// History school names (text from njwrestlinghistory.info or TrackWrestling) → one of our schools. A name maps when
// exactly one school matches: its name, a school alias, the name cleaned of HS / Regional / Township / Jr-Sr /
// punctuation (Pt. Boro = Point Pleasant Boro; Saint = St; "Memorial" stays so Brick Twp isn't Brick Memorial), or
// one name starting the other ("Don Bosco" → Don Bosco Prep). Used by the Daily Challenge research tabs (section)
// and the school profile's Trophy Case.
import type { SupabaseClient } from '@supabase/supabase-js'

export const cleanSchool = (x: string) => x.toLowerCase()
  .replace(/\bpt\.?\s*boro\b/g, 'point pleasant boro').replace(/\bpt\.?\s/g, 'point ').replace(/\bsaint\b/g, 'st').replace(/^tr\b/, 'toms river')
  .replace(/\bh\.?\s?s\.?\b|high school|\bregional\b|\breg\b|\btownship\b|\btwp\b|\bjr\.?\s*\/?\s*sr\.?\b/g, '').replace(/[^a-z]/g, '')

// idOfStrict: the same without the starts-with rule ("Passaic Co Tech" must not become Passaic), for imports that write data
export type SchoolMatcher = { idOf: (name: string | null | undefined) => number | null; idOfStrict: (name: string | null | undefined) => number | null; school: Map<number, { display_name: string; section: string | null }> }

export async function schoolMatcher(db: SupabaseClient): Promise<SchoolMatcher> {
  const all = async (t: string, sel: string) => { const out: Record<string, unknown>[] = []; for (let from = 0; ; from += 1000) { const { data } = await db.from(t).select(sel).order('id').range(from, from + 999); out.push(...((data ?? []) as unknown as Record<string, unknown>[])); if ((data ?? []).length < 1000) return out } }
  const [schools, aliases] = await Promise.all([all('schools', 'id, display_name, section'), all('school_aliases', 'id, school_id, alias')])
  const exact = new Map<string, Set<number>>(), loose = new Map<string, Set<number>>()
  const add = (m: Map<string, Set<number>>, k: string, id: number) => { if (k) (m.get(k) ?? m.set(k, new Set()).get(k)!).add(id) }
  for (const x of schools) { add(exact, String(x.display_name).toLowerCase().trim(), x.id as number); add(loose, cleanSchool(String(x.display_name)), x.id as number) }
  for (const x of aliases) { add(exact, String(x.alias).toLowerCase().trim(), x.school_id as number); add(loose, cleanSchool(String(x.alias)), x.school_id as number) }
  const cache = new Map<string, number | null>()
  const idOf = (name: string | null | undefined) => {
    if (!name) return null
    if (cache.has(name)) return cache.get(name)!
    const e = exact.get(name.toLowerCase().trim()), c = cleanSchool(name), l = loose.get(c)
    const pre = c.length >= 5 ? new Set([...loose].filter(([k]) => k.startsWith(c) || (c.startsWith(k) && k.length >= 5)).flatMap(([, v]) => [...v])) : new Set<number>()
    const ids = e?.size === 1 ? e : l?.size === 1 ? l : pre.size === 1 ? pre : null
    const id = ids ? [...ids][0] : null
    cache.set(name, id)
    return id
  }
  const idOfStrict = (name: string | null | undefined) => {
    if (!name) return null
    const e = exact.get(name.toLowerCase().trim()), l = loose.get(cleanSchool(name))
    const ids = e?.size === 1 ? e : l?.size === 1 ? l : null
    return ids ? [...ids][0] : null
  }
  return { idOf, idOfStrict, school: new Map(schools.map(x => [x.id as number, { display_name: String(x.display_name), section: (x.section as string | null) ?? null }])) }
}
