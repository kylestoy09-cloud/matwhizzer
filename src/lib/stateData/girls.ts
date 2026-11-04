// Girls state section: 12 weights; leaders from the girls state pool (lb_gp_*). Team totals are
// TrackWrestling's official state standings (the formula doesn't match theirs), so there are no
// per-wrestler team points.
import { supabase } from '@/lib/supabase/public-cached'
import { getGirlsOfficialTeamScores } from '@/lib/girlsOfficialTeamScores'
import { loadStateCommon, withLogo, type StateData } from './shared'

const WEIGHTS = [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235]

export async function loadGirlsState(season: number): Promise<StateData> {
  const pool = { p_pool: 'state', p_season: season }
  const [common, matTime, fastPin, fastTf, teamScore] = await Promise.all([
    loadStateCommon('F', season, 'girls_state'),
    supabase.rpc('lb_gp_mat_time', pool),
    supabase.rpc('lb_gp_fastest_pin', pool),
    supabase.rpc('lb_gp_fastest_tf', pool),
    getGirlsOfficialTeamScores('Girl_s States', season),
  ])
  const { logos } = common
  return {
    ...common,
    weights: WEIGHTS,
    matTime: withLogo(matTime.data ?? [], logos),
    fastPin: withLogo(fastPin.data ?? [], logos),
    fastTf: withLogo(fastTf.data ?? [], logos),
    teamScore: withLogo(teamScore ?? [], logos),
    teamPts: [],
  }
}
