// Girls postseason team totals as TrackWrestling scored them. precomputed_team_scores holds the
// official totals for girls tournaments (all 401 girls 2025-26 schools in
// source_of_truth_team_scores.csv match). The site's own formula (district_team_score,
// girls_region_team_score) matches only 23 of them, so girls pages read these totals and show
// no per-wrestler team points (Kyle, 2026-11-02). Boys keep the formula, which matches theirs.
import { supabase } from '@/lib/supabase/public-cached'
import { getSchoolSeasonNames } from '@/lib/schoolSeasonNames'

export type OfficialTeamScore = { school: string; school_name: string | null; school_id: number | null; total_points: number }

export async function getGirlsOfficialTeamScores(tournamentName: string, season: number): Promise<OfficialTeamScore[]> {
  const { data: t } = await supabase.from('tournaments').select('id')
    .eq('name', tournamentName).eq('gender', 'F').eq('season_id', season).maybeSingle()
  if (!t) return []
  const { data } = await supabase.from('precomputed_team_scores')
    .select('school_id, total_points, schools(display_name)').eq('tournament_id', t.id).not('school_id', 'is', null)
  const rows = (data ?? []) as unknown as { school_id: number; total_points: number; schools: { display_name: string } | null }[]
  const seasonNames = await getSchoolSeasonNames(supabase as never, season, 'F', rows.map(r => r.school_id))
  return rows
    .map(r => {
      const name = seasonNames.get(r.school_id) ?? r.schools?.display_name ?? null
      return { school: name ?? String(r.school_id), school_name: name, school_id: r.school_id, total_points: Number(r.total_points) }
    })
    .filter(r => r.total_points > 0)
    .sort((a, b) => b.total_points - a.total_points)
}
