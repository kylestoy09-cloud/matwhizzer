import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const [g, id] of [['F', 61], ['M', 61], ['F', 4], ['F', 18], ['M', 18]] as const) {
  const meetT = g === 'F' ? 'dual_meets_girls' : 'dual_meets', boutT = g === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches'
  const tbT = g === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts', istT = g === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'
  let mq = db.from(meetT).select('id').eq('season_id', 2026).or(`team1_school_id.eq.${id},team2_school_id.eq.${id}`); if (g === 'M') mq = mq.eq('gender', 'M')
  const meets = (await mq).data!.map((m: any) => m.id)
  const ist = new Set((await db.from(istT).select('id').eq('season', '2025-26')).data!.map((x: any) => x.id))
  const d = meets.length ? (await db.from(boutT).select('result_type, winner_id, wrestler_a_id, wrestler_b_id, school_a_id, school_b_id').in('dual_meet_id', meets)).data! : []
  const t = (await db.from(tbT).select('in_season_tournament_id, result_type, winner, wrestler1_id, wrestler2_id, wrestler1_school_id, wrestler2_school_id').or(`wrestler1_school_id.eq.${id},wrestler2_school_id.eq.${id}`)).data!.filter((b: any) => ist.has(b.in_season_tournament_id))
  let pins = 0, techs = 0
  for (const b of d as any[]) { const mine = (b.school_a_id === id && b.winner_id && b.winner_id === b.wrestler_a_id) || (b.school_b_id === id && b.winner_id && b.winner_id === b.wrestler_b_id); if (mine && /fall/i.test(b.result_type)) pins++; if (mine && /^tf/i.test(b.result_type)) techs++ }
  for (const b of t as any[]) { const mine = (b.winner === 1 && b.wrestler1_school_id === id) || (b.winner === 2 && b.wrestler2_school_id === id); if (mine && /fall/i.test(b.result_type)) pins++; if (mine && /^tf|tech/i.test(b.result_type)) techs++ }
  const lb = (await db.from('lb_rs_team').select('pins, techs').eq('school_id', id).eq('gender', g).eq('season_id', 2026)).data
  console.log(g, id, `all school bouts: pins ${pins}, techs ${techs} | leaderboard: ${JSON.stringify(lb)}`)
}
