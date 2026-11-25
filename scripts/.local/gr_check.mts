import { createClient } from '@supabase/supabase-js'
import { girlsProgramSchoolIds, boysProgramSchoolIds } from '../../src/lib/genderPrograms'
import { getRosterImportSeason } from '../../src/lib/season-context'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const g of ['F', 'M'] as const) {
  const ids = g === 'F' ? await girlsProgramSchoolIds(db as any, 2027) : await boysProgramSchoolIds(db as any, 2027)
  const imp = await getRosterImportSeason(db as any, g)
  const { data: comp } = await db.from('roster_grade_school_complete').select('school_id, season_id').eq('gender', g)
  const bySeason: Record<string, number> = {}; for (const c of comp ?? []) bySeason[c.season_id] = (bySeason[c.season_id] ?? 0) + 1
  const { data: mc } = await db.from('microcheck_task_log').select('school_id').eq('gender', g).eq('field', 'roster_match')
  const progs = new Set(ids)
  const inSeason = (s: number) => new Set((comp ?? []).filter(c => c.season_id === s).map(c => c.school_id).filter(x => progs.has(x)))
  const mcSet = new Set((mc ?? []).map(r => r.school_id).filter(x => progs.has(x)))
  console.log(g, 'programs', ids.length, '| roster import season', imp.id, '| completes by season', JSON.stringify(bySeason), '| microcheck roster_match schools', mcSet.size)
  for (const s of Object.keys(bySeason).map(Number)) { const u = new Set([...inSeason(s), ...mcSet]); console.log('   if season', s, '→', u.size, `${Math.round(u.size / ids.length * 100)}%`) }
}
