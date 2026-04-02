import { supabase } from '@/lib/supabase'

type SchoolRow = {
  display_name: string
  mascot: string | null
  primary_color: string | null
  logo_url: string | null
}

export type StandingsRow = SchoolRow & {
  district_points: number
  region_points: number
  state_points: number
  total_points: number
}

export async function buildStandings(
  schools: SchoolRow[],
  gender: string,
  season: number,
): Promise<StandingsRow[]> {
  const schoolNames = schools.map(s => s.display_name)
  if (schoolNames.length === 0) return []

  const { data: scoresData } = await supabase
    .from('precomputed_team_scores')
    .select('school_name, tournament_type, total_points')
    .in('school_name', schoolNames)
    .eq('season_id', season)

  const regionKey = gender === 'girls' ? 'girls_regions' : 'regions'
  const stateKey = gender === 'girls' ? 'girls_state' : 'boys_state'
  const relevantTypes = ['districts', regionKey, stateKey]

  const scoreMap = new Map<string, { district: number; region: number; state: number }>()
  for (const r of (scoresData ?? []) as { school_name: string; tournament_type: string; total_points: number }[]) {
    if (!relevantTypes.includes(r.tournament_type)) continue
    const entry = scoreMap.get(r.school_name) ?? { district: 0, region: 0, state: 0 }
    if (r.tournament_type === 'districts') entry.district += r.total_points
    else if (r.tournament_type === regionKey) entry.region += r.total_points
    else if (r.tournament_type === stateKey) entry.state += r.total_points
    scoreMap.set(r.school_name, entry)
  }

  const standings: StandingsRow[] = schools.map(s => {
    const scores = scoreMap.get(s.display_name)
    return {
      ...s,
      district_points: scores?.district ?? 0,
      region_points: scores?.region ?? 0,
      state_points: scores?.state ?? 0,
      total_points: (scores?.district ?? 0) + (scores?.region ?? 0) + (scores?.state ?? 0),
    }
  })

  standings.sort((a, b) => b.total_points - a.total_points)
  return standings
}
