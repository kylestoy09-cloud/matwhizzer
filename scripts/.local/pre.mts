// what the dashboard's Grade Reviews % is now, per gender
import { createSupabaseAdmin } from '../../src/lib/supabase/service'
import { boysProgramSchoolIds, girlsProgramSchoolIds } from '../../src/lib/genderPrograms'
import { getRosterImportSeason } from '../../src/lib/season-context'
const db = createSupabaseAdmin()
const { data: sgs } = await db.from('season_gender_state').select('gender, season_id, stage').eq('stage', 'preseason')
console.log('season_gender_status', JSON.stringify(sgs))
for (const g of ['M', 'F'] as const) {
  const pre = (sgs ?? []).find((r: any) => r.gender === g)?.season_id ?? (await import('../../src/lib/season-context')).getWorkingSeason(g).then(x => x.id)
  const preId = await pre
  const ids = g === 'F' ? await girlsProgramSchoolIds(db, preId) : await boysProgramSchoolIds(db, preId)
  const log = new Set(((await db.from('microcheck_task_log').select('school_id').eq('gender', g).eq('field', 'roster_match').in('school_id', ids)).data ?? []).map((r: any) => r.school_id))
  const rs = await getRosterImportSeason(db, g)
  const comp = new Set(((await db.from('roster_grade_school_complete').select('school_id').eq('gender', g).eq('season_id', rs.id)).data ?? []).map((r: any) => r.school_id))
  const done = ids.filter(id => log.has(id) || comp.has(id))
  console.log(g, `preseason ${pre} programs ${ids.length} | microcheck only ${ids.filter(i => log.has(i)).length} (${Math.round(100 * ids.filter(i => log.has(i)).length / ids.length)}%) | now ${done.length} (${Math.round(100 * done.length / ids.length)}%) | not done: ${ids.filter(i => !done.includes(i)).length}`)
  if (g === 'F') console.log('  girls not done:', JSON.stringify(ids.filter(i => !done.includes(i))))
}
