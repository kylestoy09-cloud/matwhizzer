// State section data both sides read the same way: placements, seeds, ghost champions, the
// district and weight tables, and logos. Each side's own rules (weights, leaders, team totals)
// live in boys.ts / girls.ts.
import { supabase } from '@/lib/supabase/public-cached'
import { getSchoolLogos } from '@/lib/school-logos'
import { historySeasonInfo, withoutGrade } from '@/lib/postseasonSeason'
import { getSchoolSeasonNames } from '@/lib/schoolSeasonNames'

type Logos = Awaited<ReturnType<typeof getSchoolLogos>>
export type PlacementRow = {
  weight: number; place: number; wrestler_id: string
  wrestler_name: string; school: string | null; school_name: string | null; school_id?: number | null
}
type Badge = { logo_url: string | null; bg_color: string | null }
export type MatTimeRow = Badge & {
  wrestler_id: string; wrestler_name: string
  school: string | null; school_name: string | null; school_id?: number | null
  total_seconds: number; match_count: number
}
export type FastestPinRow = Badge & {
  wrestler_id: string; wrestler_name: string
  school: string | null; school_name: string | null; school_id?: number | null
  fall_time_seconds: number; weight: number
}
export type FastestTfRow = FastestPinRow
export type TeamScoreRow = Badge & { school: string; school_name: string | null; school_id: number | null; total_points: number }
export type TeamPtsRow = Badge & {
  wrestler_id: string; wrestler_name: string;
  school: string | null; school_name: string | null; school_id?: number | null;
  weight: number; team_points: number
}
export type GhostChamp = {
  seed: number; wrestler_id: string; wrestler_name: string; school: string | null; school_id: number | null
  weight: number; gender: string; tournament_name: string; tournament_type: string
  wins_on_path: { round: string; opponent: string; opponent_seed: number | null; win_type: string; fall_time: number | null }[] | null
}

export type StateData = {
  weights: number[]
  placements: PlacementRow[]
  matTime: MatTimeRow[]; fastPin: FastestPinRow[]; fastTf: FastestTfRow[]
  teamScore: TeamScoreRow[]; teamPts: TeamPtsRow[]
  distStrength: { district_name: string; wrestlers_advancing: number; state_qualifiers: number }[]
  podiumDist: { district_id: number; district_name: string; podium_count: number }[]
  margins: { weight: number; avg_margin: number; match_count: number }[]
  ghostChamps: GhostChamp[]
  seedMap: Map<string, number>
  logos: Logos
}

export function withLogo<T extends { school_id?: number | null }>(rows: T[], logos: Logos): (T & Badge)[] {
  return rows.map(r => ({ ...r, logo_url: r.school_id != null ? (logos.byId.get(r.school_id) ?? null) : null, bg_color: r.school_id != null ? (logos.bgById.get(r.school_id) ?? null) : null }))
}

// Quickest Deck and Quickest Tech from the State tournament's own matches only (Kyle 2026-11-16: "the leader boards
// should stick to that tournament"); the eight fastest, a tech of 0:15 or under isn't honored
export async function stateQuickest(gender: 'M' | 'F', season: number, stateType: 'boys_state' | 'girls_state', logos: Logos) {
  const { data: t } = await supabase.from('tournaments').select('id').eq('gender', gender).eq('season_id', season).eq('tournament_type', stateType)
  const ids = (t ?? []).map(x => x.id as number)
  if (!ids.length) return { fastPin: [] as FastestPinRow[], fastTf: [] as FastestTfRow[] }
  type M = { win_type: string; fall_time_seconds: number; weight_classes: { weight: number } | null
    entry: { school_id: number | null; wrestler_id: string; school: { display_name: string } | null; wrestler: { first_name: string | null; last_name: string | null } | null } | null }
  const [{ data, error }, names] = await Promise.all([
    supabase.from('matches')
      .select('win_type, fall_time_seconds, weight_classes(weight), entry:tournament_entries!winner_entry_id(school_id, wrestler_id, school:schools(display_name), wrestler:wrestlers(first_name, last_name))')
      .in('tournament_id', ids).eq('validated', true).in('win_type', ['FALL', 'TF', 'TF-1', 'TF-1.5']).gt('fall_time_seconds', 0).order('fall_time_seconds').limit(1000),
    getSchoolSeasonNames(supabase as never, season, gender),
  ])
  if (error) throw new Error(error.message)
  const rows = ((data ?? []) as unknown as M[]).filter(m => m.entry?.wrestler_id).map(m => {
    const sid = m.entry!.school_id
    const school = sid != null ? names.get(sid) ?? m.entry!.school?.display_name ?? null : null
    return { tech: m.win_type !== 'FALL', wrestler_id: m.entry!.wrestler_id, wrestler_name: `${m.entry!.wrestler?.first_name ?? ''} ${m.entry!.wrestler?.last_name ?? ''}`.trim(),
      school, school_name: school, school_id: sid, fall_time_seconds: m.fall_time_seconds, weight: m.weight_classes?.weight ?? 0 }
  })
  const pick = (tech: boolean) => withLogo(rows.filter(r => r.tech === tech && (!tech || r.fall_time_seconds > 15)).slice(0, 8).map(({ tech: _t, ...r }) => r), logos)
  return { fastPin: pick(false), fastTf: pick(true) }
}

export async function loadStateCommon(gender: 'M' | 'F', season: number, stateType: 'boys_state' | 'girls_state') {
  const [placementsRes, distStrengthRes, marginsRes, podiumDistRes, ghostRes, stateEntriesRes, logos] = await Promise.all([
    supabase.rpc('state_placements',           { p_gender: gender, p_season: season }),
    supabase.rpc('lb_district_strength',       { p_gender: gender, p_season: season }),
    supabase.rpc('lb_weight_competitiveness',  { p_gender: gender, p_season: season }),
    supabase.rpc('lb_district_podium_placers', { p_gender: gender, p_season: season }),
    supabase.rpc('ghost_champions',            { p_season: season }),
    supabase
      .from('tournament_entries')
      .select('wrestler_id, seed, tournaments!inner(tournament_type, season_id)')
      .eq('tournaments.season_id', season)
      .eq('tournaments.tournament_type', stateType),
    getSchoolLogos(),
  ])
  const seedMap = new Map<string, number>()
  for (const e of ((stateEntriesRes.data ?? []) as { wrestler_id: string; seed: number | null }[])) {
    if (e.wrestler_id && e.seed) seedMap.set(e.wrestler_id, e.seed)
  }
  const history = !!(await historySeasonInfo(gender, season))   // a Playoff History year: names without today's grade
  return {
    placements: ((placementsRes.data ?? []) as PlacementRow[]).map(p => history ? { ...p, wrestler_name: withoutGrade(p.wrestler_name) } : p),
    distStrength: ((distStrengthRes.data ?? []) as StateData['distStrength']).sort((a, b) => b.state_qualifiers - a.state_qualifiers),
    podiumDist: (podiumDistRes.data ?? []) as StateData['podiumDist'],
    margins: ((marginsRes.data ?? []) as StateData['margins']).sort((a, b) => Number(a.avg_margin) - Number(b.avg_margin)),
    // only state-level ghost champions on the state page
    ghostChamps: ((ghostRes.data ?? []) as GhostChamp[]).filter(gc => gc.tournament_type === stateType),
    seedMap,
    logos,
  }
}
