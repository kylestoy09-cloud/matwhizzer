import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log((await db.from('girls_schools').select('*').in('school_id', [6, 314, 13])).data)
console.log('coops', (await db.from('school_coops').select('*').or('coop_school_id.eq.314,member_school_id.in.(6,314)')).data)
const { data: pp } = await db.from('power_points').select('*').in('school_id', [6, 314]).eq('gender', 'F'); console.log('girls power_points', pp?.map((r: any) => ({ school_id: r.school_id, season: r.season_id ?? r.season, w: r.overall_wins, l: r.overall_losses, group: r.pp_group })))
const { data: cache } = await db.from('precomputed_team_scores').select('tournament_id, school_id, total_points, tournaments(name, season_id)').in('school_id', [6, 314]); console.log('stored', cache?.map((c: any) => `${c.tournaments?.name} s${c.tournaments?.season_id} ${c.school_id} ${c.total_points}`))
const { count: d6 } = await db.from('dual_meet_matches_girls').select('id', { count: 'exact', head: true }).or('school_a_id.eq.6,school_b_id.eq.6')
const { count: d314 } = await db.from('dual_meet_matches_girls').select('id', { count: 'exact', head: true }).or('school_a_id.eq.314,school_b_id.eq.314')
console.log('girls dual bouts: school 6', d6, '| school 314', d314)
