// Girls team postseason brackets (NJSIAA girls state dual championships).
// Girls don't use the boys section × group format or playoff_seeds: each season has a North
// and a South bracket, then a state final between the two champions. Only the first round is
// set here (from the NJSIAA bracket document); later rounds follow the winners, and every
// result comes from dual_meets_girls (is_playoff).
import { supabase } from '@/lib/supabase/public-cached'

/** A first-round slot: two school ids, or one school with a bye */
type Slot = [number, number | null]
type RegionLayout = { key: 'north' | 'south'; title: string; firstRound: Slot[] }

// Season (ending year) → first round, top of the bracket first
const LAYOUTS: Record<number, RegionLayout[]> = {
  // source: Whizzer Upload/2025-26 Girls Data/2025-26 - NJSIAA Team Playoff.rtf
  2026: [
    { key: 'north', title: 'North', firstRound: [[32, 123], [24, 391], [18, 4], [56, 76]] },
    // top bracket, then bottom bracket (Hillsborough had a bye)
    { key: 'south', title: 'South', firstRound: [[370, 163], [158, 162], [259, 247], [188, null]] },
  ],
}

export type BracketTeam = { schoolId: number; score: number | null; won: boolean }
export type BracketMatch = { meetId: string | null; date: string | null; teams: [BracketTeam | null, BracketTeam | null]; bye: boolean }
export type BracketRound = { title: string; matches: BracketMatch[] }
export type RegionBracket = { key: string; title: string; rounds: BracketRound[]; champion: number | null }
export type GirlsTeamBracket = { regions: RegionBracket[]; stateFinal: BracketMatch | null; champion: number | null; schoolIds: number[] }

type Meet = { id: string; meet_date: string; team1_school_id: number; team2_school_id: number; team1_score: number | null; team2_score: number | null; criteria_winner_school_id: number | null }

const ROUND_TITLES = ['Quarterfinals', 'Semifinals', 'Sectional Final']

function play(meets: Meet[], a: number | null, b: number | null): { match: BracketMatch; winner: number | null } {
  if (a != null && b == null) return { match: { meetId: null, date: null, teams: [{ schoolId: a, score: null, won: true }, null], bye: true }, winner: a }
  const m = a != null && b != null
    ? meets.find(x => (x.team1_school_id === a && x.team2_school_id === b) || (x.team1_school_id === b && x.team2_school_id === a))
    : undefined
  if (!m) {
    const team = (id: number | null) => (id == null ? null : { schoolId: id, score: null, won: false })
    return { match: { meetId: null, date: null, teams: [team(a), team(b)], bye: false }, winner: null }
  }
  const score = (id: number) => (m.team1_school_id === id ? m.team1_score : m.team2_score)
  const sa = score(a!), sb = score(b!)
  // ties are decided on criteria
  const winner = sa != null && sb != null && sa !== sb ? (sa > sb ? a! : b!) : m.criteria_winner_school_id
  return {
    match: { meetId: m.id, date: m.meet_date, bye: false, teams: [{ schoolId: a!, score: sa, won: winner === a }, { schoolId: b!, score: sb, won: winner === b }] },
    winner,
  }
}

/** The seasons with a girls team bracket on file, newest first */
export const GIRLS_TEAM_SEASONS = Object.keys(LAYOUTS).map(Number).sort((a, b) => b - a)

export async function getGirlsTeamBracket(season: number): Promise<GirlsTeamBracket | null> {
  const layout = LAYOUTS[season]
  if (!layout) return null
  const { data } = await supabase
    .from('dual_meets_girls')
    .select('id, meet_date, team1_school_id, team2_school_id, team1_score, team2_score, criteria_winner_school_id')
    .eq('season_id', season)
    .eq('is_playoff', true)
  const meets = (data ?? []) as Meet[]

  const regions: RegionBracket[] = layout.map(r => {
    const rounds: BracketRound[] = []
    let current: (number | null)[] = []
    const first = r.firstRound.map(([a, b]) => play(meets, a, b))
    rounds.push({ title: ROUND_TITLES[0], matches: first.map(x => x.match) })
    current = first.map(x => x.winner)
    while (current.length > 1) {
      const next = []
      for (let i = 0; i < current.length; i += 2) next.push(play(meets, current[i], current[i + 1] ?? null))
      rounds.push({ title: ROUND_TITLES[rounds.length] ?? `Round ${rounds.length + 1}`, matches: next.map(x => x.match) })
      current = next.map(x => x.winner)
    }
    return { key: r.key, title: r.title, rounds, champion: current[0] ?? null }
  })

  const [north, south] = regions
  const final = north && south && north.champion != null && south.champion != null ? play(meets, north.champion, south.champion) : null
  const schoolIds = [...new Set(layout.flatMap(r => r.firstRound.flat()).filter((x): x is number => x != null))]
  return { regions, stateFinal: final?.match ?? null, champion: final?.winner ?? null, schoolIds }
}
