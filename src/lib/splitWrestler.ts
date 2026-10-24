// Split one wrestler record into two people by school.
//
// Two different wrestlers with the same name can end up on one record (e.g. the
// 2026-07-31 alias build aliased "Luke Miller" at both Lacey and Demarest to the
// same wrestler). This creates the second person and moves everything recorded
// for the old record *at that school* to them. Hammer scores / match score logs
// are rebuilt by the next recalculation.

import type { SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>

export type SplitResult = { newId: string; moved: Record<string, number> }

export async function splitWrestlerAtSchool(
  db: Db,
  oldId: string,
  schoolId: number,
  person: { first_name: string; last_name: string; grade: string | null; graded_at?: string },
  opts: { moveRecords: boolean },
): Promise<SplitResult> {
  const moved: Record<string, number> = {}
  const count = (k: string, r: { data: unknown[] | null; error: { message: string } | null }) => {
    if (r.error) throw new Error(`${k}: ${r.error.message}`)
    moved[k] = (moved[k] ?? 0) + (r.data?.length ?? 0)
  }

  const { data: created, error: cErr } = await db.from('wrestlers').insert({
    first_name: person.first_name, last_name: person.last_name, gender: 'M', is_oos: false,
    grade: person.grade,
    grade_confirmed_at: person.grade ? (person.graded_at ?? new Date().toISOString()) : null,
    grade_confirmed_source: person.grade ? 'roster_upload' : null,
  }).select('id').single()
  if (cErr) throw new Error(`create wrestler: ${cErr.message}`)
  const newId = created.id as string

  if (!opts.moveRecords) {
    // Both people are at the same school — matches can't be told apart, so only
    // give the new person their own alias there
    count('wrestler_name_aliases', await db.from('wrestler_name_aliases')
      .insert({ raw_name: `${person.first_name} ${person.last_name}`, school_id: schoolId, wrestler_id: newId }).select('id'))
    return { newId, moved }
  }

  // Alias at that school → new person (or add one)
  const aliasMove = await db.from('wrestler_name_aliases').update({ wrestler_id: newId })
    .eq('wrestler_id', oldId).eq('school_id', schoolId).select('id')
  count('wrestler_name_aliases', aliasMove)
  if (!aliasMove.data?.length) {
    count('wrestler_name_aliases', await db.from('wrestler_name_aliases')
      .insert({ raw_name: `${person.first_name} ${person.last_name}`, school_id: schoolId, wrestler_id: newId }).select('id'))
  }

  // Dual meets: sides he wrestled for that school (+ winner on those bouts)
  for (const side of ['a', 'b'] as const) {
    const { data: rows, error } = await db.from('dual_meet_matches').select('id, winner_id')
      .eq(`wrestler_${side}_id`, oldId).eq(`school_${side}_id`, schoolId)
    if (error) throw new Error(`dual_meet_matches: ${error.message}`)
    const ids = (rows ?? []).map(r => r.id)
    if (ids.length === 0) continue
    count('dual_meet_matches', await db.from('dual_meet_matches').update({ [`wrestler_${side}_id`]: newId }).in('id', ids).select('id'))
    const won = (rows ?? []).filter(r => r.winner_id === oldId).map(r => r.id)
    if (won.length) await db.from('dual_meet_matches').update({ winner_id: newId }).in('id', won)
  }
  // Dual sides imported with his name at that school but never linked to anyone
  const fullName = `${person.first_name} ${person.last_name}`
  for (const side of ['a', 'b'] as const) {
    count('dual_meet_matches (unlinked)', await db.from('dual_meet_matches').update({ [`wrestler_${side}_id`]: newId })
      .is(`wrestler_${side}_id`, null).eq(`school_${side}_id`, schoolId).ilike(`wrestler_${side}_name_raw`, fullName).select('id'))
  }

  for (const n of [1, 2] as const) {
    count('tournament_bouts', await db.from('tournament_bouts').update({ [`wrestler${n}_id`]: newId })
      .eq(`wrestler${n}_id`, oldId).eq(`wrestler${n}_school_id`, schoolId).select('id'))
  }

  for (const table of ['tournament_placements', 'tournament_entries', 'in_season_tournament_seeds', 'wrestler_school_history', 'individual_rankings', 'roster_grade_import']) {
    count(table, await db.from(table).update({ wrestler_id: newId }).eq('wrestler_id', oldId).eq('school_id', schoolId).select('wrestler_id'))
  }

  for (const pos of ['top', 'bottom'] as const) {
    const { data: slots, error } = await db.from('tournament_bracket_slots').select('id, winner_wrestler_id')
      .eq(`${pos}_wrestler_id`, oldId).eq(`${pos}_school_id`, schoolId)
    if (error) throw new Error(`tournament_bracket_slots: ${error.message}`)
    const ids = (slots ?? []).map(s => s.id)
    if (ids.length === 0) continue
    count('tournament_bracket_slots', await db.from('tournament_bracket_slots').update({ [`${pos}_wrestler_id`]: newId }).in('id', ids).select('id'))
    const won = (slots ?? []).filter(s => s.winner_wrestler_id === oldId).map(s => s.id)
    if (won.length) await db.from('tournament_bracket_slots').update({ winner_wrestler_id: newId }).in('id', won)
  }

  return { newId, moved }
}
