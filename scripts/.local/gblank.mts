import { createSupabaseAdmin } from '../../src/lib/supabase/service'
import { girlsProgramSchoolIds, boysProgramSchoolIds } from '../../src/lib/genderPrograms'
import { girlsRosterGradeCounts, boysRosterGradeCounts } from '../../src/lib/rosterGrades'
const db = createSupabaseAdmin()
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
for (const [g, season] of [['F', 2026], ['M', 2027]] as const) {
  const ids = g === 'F' ? await girlsProgramSchoolIds(db, season) : await boysProgramSchoolIds(db, season)
  const c = g === 'F' ? await girlsRosterGradeCounts(db, ids) : await boysRosterGradeCounts(db, ids)
  const blank = ids.filter(id => !c.bySchool.has(id))
  console.log(`${g}: ${ids.length} active programs, ${blank.length} blank: ${blank.map(id => `${id} ${names.get(id)}`).join('; ')}`)
}
