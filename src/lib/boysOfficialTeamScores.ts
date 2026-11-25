// Boys postseason team totals as TrackWrestling scored them (Kyle, 2026-11-05: the copied
// standings are the truth). precomputed_team_scores holds the official totals; the site's own
// formula (district_team_score) matched only 128 of 300 official 2025-26 district totals, so it
// stays behind the scenes and boys pages read these. 2025-26 districts were loaded from the
// TrackWrestling team standings by scripts/build_boys_official_district_team_scores.mts.
import { supabase } from '@/lib/supabase/public-cached'
import { getSchoolSeasonNames } from '@/lib/schoolSeasonNames'

// calculated = a Playoff History season's total, worked out from its bouts (no team deductions on file)
export type OfficialTeamScore = { school: string; school_name: string | null; school_id: number | null; total_points: number; calculated: boolean }

export async function getBoysOfficialTeamScores(tournamentName: string, season: number): Promise<OfficialTeamScore[]> {
  const { data: t } = await supabase.from('tournaments').select('id')
    .eq('name', tournamentName).eq('gender', 'M').eq('season_id', season).maybeSingle()
  if (!t) return []
  const { data } = await supabase.from('precomputed_team_scores')
    .select('school_id, total_points, source, schools(display_name)').eq('tournament_id', t.id).not('school_id', 'is', null)
  const rows = (data ?? []) as unknown as { school_id: number; total_points: number; source: string; schools: { display_name: string } | null }[]
  const seasonNames = await getSchoolSeasonNames(supabase as never, season, 'M', rows.map(r => r.school_id))
  return rows
    .map(r => {
      const name = seasonNames.get(r.school_id) ?? r.schools?.display_name ?? null
      return { school: name ?? String(r.school_id), school_name: name, school_id: r.school_id, total_points: Number(r.total_points), calculated: r.source === 'calculated' }
    })
    .filter(r => r.total_points > 0)
    .sort((a, b) => b.total_points - a.total_points)
}
