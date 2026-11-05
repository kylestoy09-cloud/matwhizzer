import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const r = await db.from('dual_meets_girls').select(`id, team1_school_id, team2_school_id, meet_date, team1_score, team2_score, status, meet_kind, counts_toward_record, team1:schools!team1_school_id(display_name, is_nj), team2:schools!team2_school_id(display_name, is_nj)`).or('team1_school_id.eq.111,team2_school_id.eq.111').eq('season_id', 2026).order('meet_date')
console.log(r.error?.message ?? JSON.stringify(r.data?.map((m: any) => `${m.meet_date} ${m.team1.display_name} ${m.team1_score}-${m.team2_score} ${m.team2.display_name} ${m.meet_kind} counts=${m.counts_toward_record}`)))
