import { supabase } from '@/lib/supabase'

type SchoolRow = {
  id?: number
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
  if (schools.length === 0) return []

  // Prefer school_id join, fall back to school_name
  const schoolIds = schools.map(s => s.id).filter((id): id is number => id != null && id > 0)
  const useIds = schoolIds.length === schools.length

  let scoresData: { school_id?: number; school_name?: string; tournament_type: string; total_points: number }[] | null

  if (useIds) {
    const { data } = await supabase
      .from('precomputed_team_scores')
      .select('school_id, tournament_type, total_points')
      .in('school_id', schoolIds)
      .eq('season_id', season)
    scoresData = data
  } else {
    const schoolNames = schools.map(s => s.display_name)
    const { data } = await supabase
      .from('precomputed_team_scores')
      .select('school_name, tournament_type, total_points')
      .in('school_name', schoolNames)
      .eq('season_id', season)
    scoresData = data
  }

  const districtKey = gender === 'girls' ? 'girls_districts' : 'boys_districts'
  const regionKey = gender === 'girls' ? 'girls_regions' : 'regions'
  const stateKey = gender === 'girls' ? 'girls_state' : 'boys_state'
  const relevantTypes = [districtKey, regionKey, stateKey]

  // Build score map keyed by id or name
  const scoreMap = new Map<string | number, { district: number; region: number; state: number }>()
  for (const r of (scoresData ?? []) as { school_id?: number; school_name?: string; tournament_type: string; total_points: number }[]) {
    if (!relevantTypes.includes(r.tournament_type)) continue
    const key = useIds ? r.school_id! : r.school_name!
    const entry = scoreMap.get(key) ?? { district: 0, region: 0, state: 0 }
    if (r.tournament_type === districtKey) entry.district += r.total_points
    else if (r.tournament_type === regionKey) entry.region += r.total_points
    else if (r.tournament_type === stateKey) entry.state += r.total_points
    scoreMap.set(key, entry)
  }

  const standings: StandingsRow[] = schools.map(s => {
    const key = useIds ? s.id! : s.display_name
    const scores = scoreMap.get(key)
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
