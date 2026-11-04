// Boys state section: 14 weights; leaders and team totals from the state pool (lb_p_*),
// including each wrestler's team points.
import { supabase } from '@/lib/supabase/public-cached'
import { loadStateCommon, withLogo, type StateData } from './shared'

const WEIGHTS = [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285]

export async function loadBoysState(season: number): Promise<StateData> {
  // pool-based RPCs so leaders show cumulative data through all tournaments
  const pool = { p_gender: 'M', p_pool: 'state', p_season: season }
  const [common, matTime, fastPin, fastTf, teamScore, teamPts] = await Promise.all([
    loadStateCommon('M', season, 'boys_state'),
    supabase.rpc('lb_p_mat_time', pool),
    supabase.rpc('lb_p_fastest_pin', pool),
    supabase.rpc('lb_p_fastest_tf', pool),
    supabase.rpc('lb_p_team_points', pool),
    supabase.rpc('lb_p_wrestler_points', pool),
  ])
  const { logos } = common
  const pts = (teamPts.data ?? []) as { wrestler_id: string; wrestler_name: string; school: string | null; school_name: string | null; school_id: number | null; total_points: number }[]
  return {
    ...common,
    weights: WEIGHTS,
    matTime: withLogo(matTime.data ?? [], logos),
    fastPin: withLogo(fastPin.data ?? [], logos),
    fastTf: withLogo(fastTf.data ?? [], logos),
    teamScore: withLogo(teamScore.data ?? [], logos),
    teamPts: withLogo(pts.map(r => ({ wrestler_id: r.wrestler_id, wrestler_name: r.wrestler_name, school: r.school, school_name: r.school_name, school_id: r.school_id, weight: 0, team_points: Number(r.total_points) })), logos),
  }
}
