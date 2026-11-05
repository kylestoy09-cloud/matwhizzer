import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('girls_schools').select('school_id, display_name')).data!.map((r: any) => [r.school_id, r.display_name]))
const pp = new Map((await db.from('power_points').select('school_id, pp_group').eq('gender', 'F').eq('season_id', 2026)).data!.map((r: any) => [r.school_id, r.pp_group]))
const p = (await db.from('dual_meets_girls').select('meet_date, team1_school_id, team2_school_id, team1_score, team2_score, meet_kind, status, criteria_winner_school_id').eq('is_playoff', true).order('meet_date')).data!
for (const r of p) console.log(r.meet_date, `${names.get(r.team1_school_id)} [${pp.get(r.team1_school_id)}] ${r.team1_score}-${r.team2_score} ${names.get(r.team2_school_id)} [${pp.get(r.team2_school_id)}]`, r.meet_kind, r.status)
const cal = (await db.from('season_calendar').select('*').eq('gender', 'F').eq('season_id', 2026)).data
console.log(JSON.stringify(cal?.filter((c: any) => /team/.test(c.event_type ?? ''))))
