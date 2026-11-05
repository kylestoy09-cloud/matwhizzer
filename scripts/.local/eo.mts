import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
for (const id of [111, 191]) {
  const ms = (await db.from('dual_meets_girls').select('*').eq('season_id', 2026).or(`team1_school_id.eq.${id},team2_school_id.eq.${id}`)).data!
  for (const m of ms) {
    console.log(`\n${names.get(id)} | ${m.meet_date} ${names.get(m.team1_school_id)} ${m.team1_score}-${m.team2_score} ${names.get(m.team2_school_id)} | raw "${m.team1_school_name_raw}" vs "${m.team2_school_name_raw}" | status ${m.status} kind ${m.meet_kind} counts ${m.counts_toward_record} src ${m.schedule_source} created ${m.created_at.slice(0, 10)}`)
    const bouts = (await db.from('dual_meet_matches_girls').select('weight_class, wrestler_a_id, wrestler_a_name_raw, school_a_id, wrestler_b_id, wrestler_b_name_raw, school_b_id, result_type, winner_id').eq('dual_meet_id', m.id).order('weight_class')).data!
    for (const b of bouts) {
      const side = b.school_a_id === id ? 'a' : b.school_b_id === id ? 'b' : '?'
      const mine = side === 'a' ? [b.wrestler_a_name_raw, b.wrestler_a_id] : side === 'b' ? [b.wrestler_b_name_raw, b.wrestler_b_id] : ['?', null]
      const opp = side === 'a' ? b.wrestler_b_name_raw : b.wrestler_a_name_raw
      console.log(`   ${b.weight_class} ${names.get(id)}: ${mine[0] ?? '-'}${mine[1] ? '' : ' (no profile)'} vs ${opp ?? '-'} | ${b.result_type}`)
    }
  }
}
