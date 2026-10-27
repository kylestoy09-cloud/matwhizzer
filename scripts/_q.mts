import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = ['Garfield Girls Holiday Tournament', '2025 Ron Mazzola Memorial Girls Wrestling Tournament', 'Lady Viking Jamboree', '2026 Lady Patriots Tournament', '2nd Annual Lady Kards Invitational']
const { data: ts } = await db.from('in_season_tournaments_girls').select('id,name,start_date,source_format').in('name', names)
for (const t of ts!) { const { data: b } = await db.from('tournament_bouts_girls').select('round,weight_class,winner,result_type,result_detail,fall_time_seconds,winner_score,loser_score,result_time_estimated,source_format').eq('in_season_tournament_id', t.id).limit(400)
  const rounds = [...new Set(b!.map(x => x.round))].join(','); const wcs = [...new Set(b!.map(x => x.weight_class))].join(',')
  console.log(t.id, t.name, t.start_date, '| rounds', rounds, '| weights', wcs); console.log('   ', JSON.stringify(b!.find(x => x.result_type === 'Fall')), JSON.stringify(b!.find(x => x.result_type !== 'Fall'))) }
for (const s of [153]) { for (const tb of ['girls_school_districts', 'girls_school_regions', 'girls_school_profiles', 'girls_schools', 'girls_school_conferences']) { const { data } = await db.from(tb).select('*').eq('school_id', s); console.log(tb, JSON.stringify(data)) } }
const { data: gar } = await db.from('dual_meets_girls').select('id,meet_date,team1_school_name_raw,team2_school_name_raw,meet_kind').eq('meet_date', '2026-01-15').or('team1_school_id.eq.53,team2_school_id.eq.53'); console.log('garfield 1/15', gar)
const { data: oos } = await db.from('schools').select('*').eq('display_name', 'William Penn H.S.'); console.log(JSON.stringify(oos))
