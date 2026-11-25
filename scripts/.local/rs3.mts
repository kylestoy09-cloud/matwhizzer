import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const [tid, wc] of [[147, 62], [171, 60]]) {
  console.log(tid, 'matches:', JSON.stringify((await db.from('matches').select('round, win_type, winner_score, loser_score, fall_time_seconds, score_raw, validated, bout_number, bracket_side, winner_context_raw').eq('tournament_id', tid).eq('weight_class_id', wc)).data))
  console.log(tid, 'placements:', JSON.stringify((await db.from('placements').select('place, entry_id, wrestler_name_raw').eq('tournament_id', tid).eq('weight_class_id', wc)).data))
}
console.log('D32 tid:', JSON.stringify((await db.from('tournaments').select('id').eq('gender','M').eq('season_id',2026).eq('name','Boy_s Districts District 32')).data))
const rbc = (await db.from('tournament_entries').select('school_id, school_context_raw').eq('wrestler_id', (await db.from('wrestlers').select('id').eq('first_name','Anthony').eq('last_name','Russo').eq('grade','Jr')).data![0].id)).data
console.log('Russo entries school:', JSON.stringify(rbc))
console.log('entry sample:', JSON.stringify((await db.from('tournament_entries').select('*').eq('id', (await db.from('tournament_entries').select('id').eq('tournament_id', 171).eq('weight_class_id', 60).eq('seed', 2)).data![0].id)).data))
