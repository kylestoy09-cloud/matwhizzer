import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const tours = (await db.from('tournaments').select('id, name, season_id, gender').eq('gender', 'F')).data!
const tn = new Map(tours.map((t: any) => [t.id, `${t.name} ${t.season_id}`]))
const e = (await db.from('tournament_entries').select('id, wrestler_id, school_id, school_context_raw, tournament_id, wrestlers(first_name, last_name)').eq('school_id', 122).in('tournament_id', tours.map((t: any) => t.id))).data ?? []
for (const x of e as any[]) console.log('ENTRY @122', tn.get(x.tournament_id), `"${x.school_context_raw}"`, x.wrestlers.first_name, x.wrestlers.last_name, x.id)
const p = (await db.from('precomputed_team_scores').select('*').in('school_id', [72, 122]).in('tournament_id', tours.map((t: any) => t.id))).data ?? []
for (const x of p as any[]) console.log('TEAM', x.school_id, x.school_name, tn.get(x.tournament_id), x.total_points)
const pp = (await db.from('girls_school_districts').select('*').eq('season_id', 2026).in('school_id', [72, 122])).data
console.log('districts', JSON.stringify(pp))
// what does the TrackWrestling D2 standings say?
