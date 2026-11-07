// Individual Post Season for one side (2026-11-07, Kyle): the standard header (title, season picker,
// summary), then the tournament buttons (State, Regions, Districts), each shown once its bracket is
// set (the tournament exists for the season with entries), then State Champions, On the Podium and
// Team Point Leaders once they have results. Nothing set yet: "Brackets coming soon".
import { supabase } from '@/lib/supabase/public-cached'
import { getSeasons, getStateTournamentId } from '@/lib/seasons-server'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { PostseasonLeaders } from '@/components/PostseasonLeaders'
import { StateChampions } from '@/components/StateChampions'
import { getSchoolLogos } from '@/lib/school-logos'
import { StdHeader } from '@/components/site/StdPage'
import { ComingSoon } from '@/components/site/ComingSoon'
import { TournamentButtons, PodiumTable, type PodiumSchool } from './IndividualButtons'

type TeamScoreRow = { school: string; school_name: string | null; school_id: number | null; district_points: number; region_points: number; state_points: number; total_points: number }
type Placement = { weight: number; place: number; wrestler_id: string; wrestler_name: string; school_name: string | null; school_id: number | null }
type Champion = { weight: number; wrestler_id: string; wrestler_name: string; school: string | null; school_id: number | null; seed: number | null; logo_url?: string | null; bg_color?: string | null }

export async function IndividualPostseason({ gender }: { gender: 'M' | 'F' }) {
  const side = gender === 'F' ? 'girls' : 'boys'
  const season = await getActiveSeason(gender)
  const [stateTid, seasons] = await Promise.all([getStateTournamentId(season, gender), getSeasons()])
  const seasonEndYear = seasons.find(x => x.id === season)?.end_year ?? 0

  // which brackets are set: this season's postseason tournaments that have entries
  const { data: tRows } = await supabase
    .from('tournaments')
    .select('name, tournament_type, tournament_entries(count)')
    .eq('season_id', season)
    .eq('gender', gender)
    .in('tournament_type', gender === 'F' ? ['districts', 'girls_regions', 'girls_state'] : ['districts', 'regions', 'boys_state'])
  const set = ((tRows ?? []) as { name: string; tournament_type: string; tournament_entries: { count: number }[] }[])
    .filter(t => (t.tournament_entries?.[0]?.count ?? 0) > 0)
  const numberIn = (name: string, re: RegExp) => Number(name.match(re)?.[1] ?? NaN)
  const districts = set.filter(t => t.tournament_type === 'districts').map(t => numberIn(t.name, /District (\d+)/)).filter(Number.isFinite).sort((a, b) => a - b)
  const regions = set.filter(t => t.tournament_type === (gender === 'F' ? 'girls_regions' : 'regions')).map(t => numberIn(t.name, /\br(\d+)$/)).filter(Number.isFinite).sort((a, b) => a - b)
  const state = set.some(t => t.tournament_type === (gender === 'F' ? 'girls_state' : 'boys_state'))

  const [teamScoreRes, placementsRes, championsRes, logos] = await Promise.all([
    supabase.rpc('top_postseason_team_scores', { p_gender: gender, p_season: season, p_limit: 25 }),
    supabase.rpc('state_placements', { p_gender: gender, p_season: season }),
    stateTid !== null ? supabase.rpc('state_champions', { p_tournament_id: stateTid }) : Promise.resolve({ data: [] }),
    getSchoolLogos(),
  ])
  const withLogo = <T extends { school_id: number | null }>(r: T) => ({
    ...r,
    logo_url: r.school_id != null ? (logos.byId.get(r.school_id) ?? null) : null,
    bg_color: r.school_id != null ? (logos.bgById.get(r.school_id) ?? null) : null,
  })
  const topTeamScores = ((teamScoreRes.data ?? []) as TeamScoreRow[]).map(withLogo)
  const stateChampions = ((championsRes.data ?? []) as Champion[]).map(withLogo)

  // On the Podium: schools by wrestlers placing 1st–8th at States, each with its placers
  const bySchool = new Map<number, PodiumSchool>()
  for (const p of (placementsRes.data ?? []) as Placement[]) {
    if (p.school_id == null || !p.school_name) continue
    const s = bySchool.get(p.school_id) ?? { school_id: p.school_id, school_name: p.school_name, logo_url: logos.byId.get(p.school_id) ?? null, bg_color: logos.bgById.get(p.school_id) ?? null, placers: [] }
    s.placers.push({ weight: p.weight, wrestler_id: p.wrestler_id, wrestler_name: p.wrestler_name, place: p.place })
    bySchool.set(p.school_id, s)
  }
  const podium = [...bySchool.values()]
    .map(s => ({ ...s, placers: s.placers.sort((a, b) => a.place - b.place || a.weight - b.weight) }))
    .sort((a, b) => b.placers.length - a.placers.length || a.school_name.localeCompare(b.school_name))
    .slice(0, 20)

  const anySet = state || regions.length > 0 || districts.length > 0
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <StdHeader title={`${side === 'girls' ? 'Girls' : 'Boys'} Individual Post Season`} summaryKey="ps-individual"
        picker={<InlineSeasonPicker gender={gender} activeSeason={season} />} />

      {!anySet ? <ComingSoon what="Brackets" /> : <TournamentButtons side={side} state={state} regions={regions} districts={districts} />}

      <div className="mt-10 space-y-10">
        {stateChampions.length > 0 && <StateChampions rows={stateChampions} seasonYear={seasonEndYear} />}
        {podium.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-1">On the Podium</h2>
            <p className="text-xs text-slate-500 mb-3">Schools ranked by wrestlers finishing 1st–8th at States. Click a school for its placers.</p>
            <PodiumTable side={side} schools={podium} />
          </section>
        )}
        {topTeamScores.length > 0 && (
          gender === 'F'
            ? <PostseasonLeaders rows={topTeamScores} schoolBase="/schools" accentColor="rose" gender="girls" />
            : <PostseasonLeaders rows={topTeamScores} schoolBase="/schools" gender="boys" />
        )}
      </div>
    </div>
  )
}
