import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const p = (await db.from('dual_meets_girls').select('id, meet_date, team1_school_id, team2_school_id, team1_score, team2_score, criteria_winner_school_id').eq('is_playoff', true).eq('season_id', 2026).order('meet_date')).data!
for (const r of p) console.log(r.meet_date, r.team1_school_id, names.get(r.team1_school_id), r.team1_score, '-', r.team2_score, r.team2_school_id, names.get(r.team2_school_id), r.criteria_winner_school_id ?? '')
