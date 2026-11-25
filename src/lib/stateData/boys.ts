// Boys state section: 14 weights; leaders from the state pool (lb_p_*), including each
// wrestler's team points. Team totals are the official TrackWrestling standings.
import { supabase } from '@/lib/supabase/public-cached'
import { seasonWeights } from '@/lib/postseasonSeason'
import { loadStateCommon, stateQuickest, withLogo, type StateData } from './shared'
import { getBoysOfficialTeamScores } from '@/lib/boysOfficialTeamScores'
import { SHOW_WRESTLER_TEAM_POINTS } from '@/lib/wrestlerTeamPoints'

const WEIGHTS = [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285]

export async function loadBoysState(season: number): Promise<StateData> {
  // pool-based RPCs so leaders show cumulative data through all tournaments
  const pool = { p_gender: 'M', p_pool: 'state', p_season: season }
  const [common, matTime, teamScore, teamPts] = await Promise.all([
    loadStateCommon('M', season, 'boys_state'),
    supabase.rpc('lb_p_mat_time', pool),
    getBoysOfficialTeamScores('Boy_s States', season),
    SHOW_WRESTLER_TEAM_POINTS ? supabase.rpc('lb_p_wrestler_points', pool) : Promise.resolve({ data: [] }),
  ])
  const { logos } = common
  const pts = (teamPts.data ?? []) as { wrestler_id: string; wrestler_name: string; school: string | null; school_name: string | null; school_id: number | null; total_points: number }[]
  return {
    ...common,
    weights: await seasonWeights('M', season, WEIGHTS),   // a Playoff History season's own classes
    matTime: withLogo(matTime.data ?? [], logos),
    // the quickest falls and techs at State itself; the Terminators stay the whole postseason
    ...await stateQuickest('M', season, 'boys_state', logos),
    teamScore: withLogo(teamScore, logos),
    teamPts: withLogo(pts.map(r => ({ wrestler_id: r.wrestler_id, wrestler_name: r.wrestler_name, school: r.school, school_name: r.school_name, school_id: r.school_id, weight: 0, team_points: Number(r.total_points) })), logos),
  }
}
