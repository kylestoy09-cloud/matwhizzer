import { matchWrestler } from '../../src/lib/matchWrestlers'
import { createSupabaseAdmin } from '../../src/lib/supabase/service'
import { girlsProgramSchoolIds, boysProgramSchoolIds } from '../../src/lib/genderPrograms'
import { girlsRosterGradeCounts, boysRosterGradeCounts } from '../../src/lib/rosterGrades'
const db = createSupabaseAdmin()
for (const [n, s, w] of [['Aaliyah Gordon Burke', 132, 138], ['Perla Huerta Vasquez', 155, 152], ['Hunter Sedita Lott', 109, 185], ['Sabrina Jean-Baptiste', 105, 126]] as const) {
  const m = await matchWrestler(n, s, w, 'F'); console.log(`match "${n}": ${m.confidence} → ${m.displayName} (${m.wrestlerId?.slice(0, 8)})`)
}
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
for (const [g, season] of [['F', 2026], ['M', 2027]] as const) {
  const ids = g === 'F' ? await girlsProgramSchoolIds(db, season) : await boysProgramSchoolIds(db, season)
  const c = g === 'F' ? await girlsRosterGradeCounts(db, ids) : await boysRosterGradeCounts(db, ids)
  console.log(`${g}: ${ids.length} programs; "No wrestlers": ${ids.filter(id => !c.bySchool.has(id)).map(id => names.get(id)).join(', ')}`)
}
