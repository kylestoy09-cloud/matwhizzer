// Girls state section: 12 weights; leaders from the girls state pool (lb_gp_*). Team totals are
// TrackWrestling's official state standings (the formula doesn't match theirs), so there are no
// per-wrestler team points.
import { supabase } from '@/lib/supabase/public-cached'
import { seasonWeights } from '@/lib/postseasonSeason'
import { getGirlsOfficialTeamScores } from '@/lib/girlsOfficialTeamScores'
import { loadStateCommon, stateQuickest, withLogo, type StateData } from './shared'

const WEIGHTS = [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235]

export async function loadGirlsState(season: number): Promise<StateData> {
  const pool = { p_pool: 'state', p_season: season }
  const [common, matTime, teamScore] = await Promise.all([
    loadStateCommon('F', season, 'girls_state'),
    supabase.rpc('lb_gp_mat_time', pool),
    getGirlsOfficialTeamScores('Girl_s States', season),
  ])
  const { logos } = common
  return {
    ...common,
    weights: await seasonWeights('F', season, WEIGHTS),   // a Playoff History season's own classes
    matTime: withLogo(matTime.data ?? [], logos),
    // the quickest falls and techs at State itself; the Terminators stay the whole postseason
    ...await stateQuickest('F', season, 'girls_state', logos),
    teamScore: withLogo(teamScore ?? [], logos),
    teamPts: [],
  }
}
