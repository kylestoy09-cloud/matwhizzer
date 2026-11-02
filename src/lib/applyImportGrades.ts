// Grades for wrestlers created by a match upload, as settled in the import review.
// Per new wrestler (keyed "<raw name>|<school id>"): the grade chosen in the review; when
// none was chosen, the single exact stored Track roster match the review showed filled in;
// a cleared grade means none. A wrestler who already has a grade keeps it. A roster player
// whose grade is used is tied to the wrestler and no longer suggested.

import type { createSupabaseAdmin } from '@/lib/supabase/service'
import { suggestRosterGrades, suggestionKey, type GradeChoice } from '@/lib/rosterGradeSuggest'

type Db = ReturnType<typeof createSupabaseAdmin>

export async function applyImportGrades(db: Db, opts: {
  gender:       'M' | 'F'
  newWrestlers: { rawName: string; schoolId: number | null; wrestlerId: string }[]
  choices:      Record<string, GradeChoice>
  adminEmail:   string | null
}): Promise<{ graded: number; fromRoster: number; errors: string[] }> {
  const errors: string[] = []
  const byKey = new Map<string, { rawName: string; schoolId: number | null; wrestlerId: string }>()
  for (const w of opts.newWrestlers) byKey.set(suggestionKey(w.rawName, w.schoolId), w)
  if (!byKey.size) return { graded: 0, fromRoster: 0, errors }

  const needSuggestion = [...byKey.entries()].filter(([k]) => opts.choices[k] === undefined).map(([, w]) => w)
  const suggestions = needSuggestion.length
    ? await suggestRosterGrades(db, opts.gender, needSuggestion.map(w => ({ name: w.rawName, schoolId: w.schoolId })))
    : {}

  let graded = 0, fromRoster = 0
  const now = new Date().toISOString()
  const usedRoster = new Set<string>()
  for (const [key, w] of byKey) {
    const chosen = opts.choices[key]
    const exact  = suggestions[key]?.exact ?? null
    const pick: GradeChoice | null = chosen !== undefined ? chosen : exact ? { grade: exact.grade, rosterId: exact.rosterId } : null
    if (!pick?.grade) continue
    if (pick.rosterId && usedRoster.has(pick.rosterId)) continue   // one roster player, one wrestler

    const { data: updated, error } = await db.from('wrestlers')
      .update({ grade: pick.grade, grade_confirmed_at: now, grade_confirmed_source: pick.rosterId ? 'roster_upload' : 'import_review' })
      .eq('id', w.wrestlerId).is('grade', null).select('id')
    if (error) { errors.push(`grade for ${w.rawName}: ${error.message}`); continue }
    if (!updated?.length) continue
    graded++

    if (pick.rosterId) {
      usedRoster.add(pick.rosterId)
      const { data: tied, error: rErr } = await db.from('roster_grade_import')
        .update({ status: 'confirmed', wrestler_id: w.wrestlerId, confirmed_by: opts.adminEmail, confirmed_at: now })
        .eq('id', pick.rosterId).in('status', ['school_matched', 'no_match']).select('id')
      if (rErr) errors.push(`roster player for ${w.rawName}: ${rErr.message}`)
      else if (tied?.length) fromRoster++   // 0 rows: that roster player was already used
    }
  }
  return { graded, fromRoster, errors }
}
