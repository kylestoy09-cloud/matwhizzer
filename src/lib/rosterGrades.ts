// Roster grade coverage per school, one function per gender. "Roster" matches
// the roster grade import review: active, NJ (not OOS) wrestlers of that gender
// linked to the school through wrestler_name_aliases (wrestlers has no
// school_id column).

import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchAllRows } from '@/lib/fetchAllRows'

export type RosterGradeCounts = {
  bySchool: Map<number, { roster: number; graded: number }>
  roster:   number   // distinct wrestlers across all schools
  graded:   number
}

export function boysRosterGradeCounts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: SupabaseClient<any, any, any>,
  schoolIds: number[],
): Promise<RosterGradeCounts> {
  return rosterGradeCounts(db, schoolIds, 'M')
}

export function girlsRosterGradeCounts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: SupabaseClient<any, any, any>,
  schoolIds: number[],
): Promise<RosterGradeCounts> {
  return rosterGradeCounts(db, schoolIds, 'F')
}

async function rosterGradeCounts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: SupabaseClient<any, any, any>,
  schoolIds: number[],
  gender: 'M' | 'F',
): Promise<RosterGradeCounts> {
  const { data, error } = await fetchAllRows<{ school_id: number; wrestler_id: string; wrestlers: unknown }>(
    (from, to) => db.from('wrestler_name_aliases')
      .select('school_id, wrestler_id, wrestlers!inner(grade)')
      .in('school_id', schoolIds)
      .eq('wrestlers.gender', gender)
      .eq('wrestlers.is_active', true)
      .eq('wrestlers.is_oos', false)
      .neq('wrestlers.first_name', 'Unknown')
      .order('id')
      .range(from, to),
  )
  if (error) throw new Error(`roster grades: ${error.message}`)

  // A wrestler can have several aliases at one school — count each once
  const perSchool = new Map<number, Map<string, boolean>>()
  const all = new Map<string, boolean>()
  for (const r of data) {
    // many-to-one embed: PostgREST returns an object (typed as an array by supabase-js)
    const hasGrade = !!(r.wrestlers as { grade: string | null } | null)?.grade
    if (!perSchool.has(r.school_id)) perSchool.set(r.school_id, new Map())
    perSchool.get(r.school_id)!.set(r.wrestler_id, hasGrade)
    all.set(r.wrestler_id, hasGrade)
  }

  const bySchool = new Map<number, { roster: number; graded: number }>()
  for (const [sid, ws] of perSchool) {
    bySchool.set(sid, { roster: ws.size, graded: [...ws.values()].filter(Boolean).length })
  }
  return { bySchool, roster: all.size, graded: [...all.values()].filter(Boolean).length }
}
