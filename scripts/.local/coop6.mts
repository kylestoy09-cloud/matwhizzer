import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ids = [248,13,34,104,54,26,35,93,97,102,112,119,156,191,201,217,226,229,253,268,269,278,294,295,297,384]
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((x: any) => [x.id, x.display_name]))
const pp = (await db.from('power_points').select('school_id, season_id, power_points, overall_wins, overall_losses, overall_ties, meets_counted, pp_group').eq('gender', 'F').in('school_id', ids)).data!
const nonzero = pp.filter((r: any) => r.power_points || r.overall_wins || r.overall_losses || r.meets_counted)
console.log('PP rows', pp.length, 'seasons', [...new Set(pp.map((r: any) => r.season_id))], 'non-zero:', JSON.stringify(nonzero))
console.log('all girls PP rows by season:', JSON.stringify(Object.entries((await db.from('power_points').select('season_id, pp_group').eq('gender', 'F')).data!.reduce((m: any, r: any) => { const k = `${r.season_id} ${r.pp_group}`; m[k] = (m[k] ?? 0) + 1; return m }, {}))))
const er = (await db.from('tournament_entries').select('school_id, wrestler_id, tournaments!inner(name, season_id, gender)').in('school_id', ids).eq('tournaments.gender', 'F'))
if (er.error) console.log(er.error.message)
const e = er.data ?? []
for (const r of e as any[]) console.log('ENTRY', r.school_id, names.get(r.school_id), r.tournaments.season_id, r.tournaments.name)
const d = (await db.from('dual_meets_girls').select('id, season_id, meet_date, team1_school_id, team2_school_id').or('team1_school_id.eq.191,team2_school_id.eq.191')).data
console.log('Keansburg dual', JSON.stringify(d))
