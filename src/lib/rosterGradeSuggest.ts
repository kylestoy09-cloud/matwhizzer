// Grade suggestions for wrestlers in a match upload, from stored Track roster players
// (roster_grade_import rows not yet tied to one of our wrestlers), same gender and school.
//   exact    one stored player with the same full name: filled in on the review
//   options  close spellings (same last name, or a name a letter or two off), or several
//            same-name players: listed to pick from, never filled in
// Names compare ignoring capitals, punctuation and extra spaces.

import type { createSupabaseAdmin } from '@/lib/supabase/service'

type Db = ReturnType<typeof createSupabaseAdmin>
export type Grade = 'Fr' | 'So' | 'Jr' | 'Sr'
export type RosterOption = { rosterId: string; name: string; grade: Grade; weight: number | null }
export type GradeSuggestion = { exact: RosterOption | null; options: RosterOption[] }
export type GradeChoice = { grade: Grade | null; rosterId: string | null }

// Stored players that can still be suggested
const SUGGESTABLE = ['school_matched', 'no_match']

export const suggestionKey = (name: string, schoolId: number | null) => `${name}|${schoolId ?? 'null'}`
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

export async function suggestRosterGrades(
  db: Db,
  gender: 'M' | 'F',
  wrestlers: { name: string; schoolId: number | null }[],
): Promise<Record<string, GradeSuggestion>> {
  const schoolIds = [...new Set(wrestlers.map(w => w.schoolId).filter((id): id is number => id != null))]
  const out: Record<string, GradeSuggestion> = {}
  if (!schoolIds.length) return out

  const pool: { id: string; school_id: number; first_name_raw: string; last_name_raw: string; grade: Grade; weight_class: number | null }[] = []
  for (let i = 0; i < schoolIds.length; i += 200) {
    const { data, error } = await db.from('roster_grade_import')
      .select('id, school_id, first_name_raw, last_name_raw, grade, weight_class')
      .eq('gender', gender).in('status', SUGGESTABLE).in('school_id', schoolIds.slice(i, i + 200))
      .limit(100000)
    if (error) throw new Error(`roster_grade_import: ${error.message}`)
    pool.push(...((data ?? []) as typeof pool))
  }
  const bySchool = new Map<number, typeof pool>()
  for (const r of pool) bySchool.set(r.school_id, [...(bySchool.get(r.school_id) ?? []), r])

  for (const w of wrestlers) {
    const key = suggestionKey(w.name, w.schoolId)
    if (out[key] || w.schoolId == null) continue
    const target = norm(w.name)
    const targetLast = target.split(' ').slice(-1)[0]
    const rows = bySchool.get(w.schoolId) ?? []
    const opt = (r: (typeof pool)[number]): RosterOption =>
      ({ rosterId: r.id, name: `${r.first_name_raw} ${r.last_name_raw}`.trim(), grade: r.grade, weight: r.weight_class })

    const same = rows.filter(r => norm(`${r.first_name_raw} ${r.last_name_raw}`) === target)
    const close = rows.filter(r => {
      const full = norm(`${r.first_name_raw} ${r.last_name_raw}`)
      if (full === target) return false
      return norm(r.last_name_raw) === targetLast || editDistance(full, target) <= 2
    })
    out[key] = same.length === 1
      ? { exact: opt(same[0]), options: close.slice(0, 5).map(opt) }
      : { exact: null, options: [...same, ...close].slice(0, 6).map(opt) }
  }
  return out
}
