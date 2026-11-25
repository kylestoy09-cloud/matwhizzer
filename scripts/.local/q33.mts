import { createClient } from '@supabase/supabase-js'
import { buildSeasonReport } from '../../src/lib/snapshot/seasonReport'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const g of ['M', 'F'] as const) {
  const t = Date.now(); const r = await buildSeasonReport(db, g, 2026)
  console.log(`== ${g} in ${Math.round((Date.now() - t) / 1000)}s`)
  console.log(JSON.stringify({ totals: { ...r.totals, by_source: undefined }, vs: r.vs_non_njsiaa, post: { ...r.postseason, state_champions: r.postseason.state_champions.map(c => `${c.weight} ${c.wrestler_name} (${c.school_name})`) } }, null, 1))
  const b = r.bests
  console.log('days', b.daily_reports, 'pin', b.fastest_pins[0], 'tech', b.fastest_techs[0]?.fall_time_sec, 'dual', b.fastest_duals[0]?.total_seconds, 'topmatch', b.top_rated_matches[0]?.combined, 'gap', b.upsets_by_gap[0]?.gap)
  console.log('streak win', b.streaks.win.slice(0, 2), 'pin', b.streaks.pin[0]?.streak_len, 'fbw', b.final_bout_wins, 'first wins', b.first_career_wins, b.first_career_matches)
  console.log('single', b.most_points_single[0], 'margin', b.largest_margins[0], 'champs', b.tournament_champs.length, 'lowseed', b.lowest_seed_wins[0], 'top25', b.final_top25.length, b.final_top25_date, 'teamhighs', b.team_highs.pins[0])
}
