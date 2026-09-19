import { createClient } from '@supabase/supabase-js'
import { getLiveSeason } from '@/lib/seasons-server'
import { TeamBracketClient } from './TeamBracketClient'

export const revalidate = 300

const GENDER = 'M'
const SECTIONS = ['North I', 'North II', 'Central', 'South'] as const
const GROUPS = ['1', '2', '3', '4', '5'] as const

export type SeedEntry = {
  seed: number
  schoolId: number | null
  name: string | null
  logo: string | null
  color: string | null
}

export type SectionBracket = {
  section: string
  seeds: SeedEntry[]
}

export type GroupBracket = {
  classification: string
  label: string
  sections: SectionBracket[]
  isNPA: boolean
  isNPB: boolean
}

export type LeaderEntry = { name: string; value: number }
export type LeaderStats = {
  pointsPerMatch: LeaderEntry[]
  pinsPerMatch: LeaderEntry[]
  techsPerMatch: LeaderEntry[]
  bonusPerMatch: LeaderEntry[]
}

export type MeetResult = {
  meetId: string
  meetDate: string
  team1SchoolId: number
  team2SchoolId: number
  team1Score: number | null
  team2Score: number | null
  tiebreakerWinnerId?: number
}

export default async function PostseasonTeamPage() {
  const SEASON_ID = (await getLiveSeason('M')).id
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Fetch all confirmed playoff seeds
  const { data: seedRows } = await db
    .from('playoff_seeds')
    .select('section, classification, seed, school_id, schools(id, display_name, logo_url, primary_color)')
    .eq('season_id', SEASON_ID)
    .eq('gender', GENDER)
    .eq('confirmed', true)
    .order('seed')

  // Organize seeds into a map: "section|classification" → SeedEntry[]
  const seedMap = new Map<string, SeedEntry[]>()
  for (const r of seedRows ?? []) {
    const key = `${r.section}|${r.classification}`
    if (!seedMap.has(key)) seedMap.set(key, [])
    const sc = r.schools as any
    seedMap.get(key)!.push({
      seed: r.seed,
      schoolId: r.school_id,
      name: sc?.display_name ?? null,
      logo: sc?.logo_url ?? null,
      color: sc?.primary_color ?? null,
    })
  }

  // Build group/section structure for Groups 1-5
  const regularGroups: GroupBracket[] = GROUPS.map(g => ({
    classification: g,
    label: `Group ${g}`,
    isNPA: false,
    isNPB: false,
    sections: SECTIONS.map(sec => ({
      section: sec,
      seeds: seedMap.get(`${sec}|${g}`) ?? [],
    })),
  }))

  // Non-Public A and B
  const npGroups: GroupBracket[] = [
    {
      classification: 'A',
      label: 'NP-A',
      isNPA: true,
      isNPB: false,
      sections: [{ section: 'Non-Public', seeds: seedMap.get('Non-Public|A') ?? [] }],
    },
    {
      classification: 'B',
      label: 'NP-B',
      isNPA: false,
      isNPB: true,
      sections: [{ section: 'Non-Public', seeds: seedMap.get('Non-Public|B') ?? [] }],
    },
  ]

  // Fetch all playoff meet results (for bracket display)
  const { data: playoffMeetRows } = await db
    .from('dual_meets')
    .select('id, meet_date, team1_school_id, team2_school_id, team1_score, team2_score')
    .eq('season_id', SEASON_ID)
    .eq('gender', GENDER)
    .eq('is_playoff', true)

  const meetResults: MeetResult[] = (playoffMeetRows ?? []).map(r => ({
    meetId:        r.id as string,
    meetDate:      r.meet_date as string,
    team1SchoolId: r.team1_school_id as number,
    team2SchoolId: r.team2_school_id as number,
    team1Score:    r.team1_score as number | null,
    team2Score:    r.team2_score as number | null,
  }))

  // Tiebreaker: for tied meets, fewer received forfeits wins.
  // The team that got more of its points from opponent forfeits loses the tiebreaker.
  const tiedMeetIds = meetResults
    .filter(m => m.team1Score !== null && m.team1Score === m.team2Score)
    .map(m => m.meetId)

  if (tiedMeetIds.length > 0) {
    const { data: forfeitBouts } = await db
      .from('dual_meet_matches')
      .select('dual_meet_id, school_a_id, school_b_id, team1_points, team2_points')
      .in('dual_meet_id', tiedMeetIds)
      .eq('is_forfeit_win', true)

    // Count forfeits GIVEN per school per meet — the team that gave fewer forfeits wins.
    // The loser of a forfeit bout is the school that conceded it.
    const given = new Map<string, Map<number, number>>()
    for (const b of forfeitBouts ?? []) {
      const mid = b.dual_meet_id as string
      if (!given.has(mid)) given.set(mid, new Map())
      const bySchool = given.get(mid)!
      // team1_points=6 → school_a won → school_b gave the forfeit; and vice versa
      const loser = (b.team1_points as number ?? 0) >= 6
        ? (b.school_b_id as number)
        : (b.school_a_id as number)
      bySchool.set(loser, (bySchool.get(loser) ?? 0) + 1)
    }

    for (const m of meetResults) {
      if (m.team1Score === null || m.team1Score !== m.team2Score) continue
      const bySchool = given.get(m.meetId)
      const t1 = bySchool?.get(m.team1SchoolId) ?? 0
      const t2 = bySchool?.get(m.team2SchoolId) ?? 0
      if (t1 !== t2) m.tiebreakerWinnerId = t1 < t2 ? m.team1SchoolId : m.team2SchoolId
    }
  }

  // Fetch playoff stats
  let leaderStats: LeaderStats = { pointsPerMatch: [], pinsPerMatch: [], techsPerMatch: [], bonusPerMatch: [] }
  try {
    const { data: meets, error: meetsErr } = await db
      .from('dual_meets')
      .select('id, team1_school_id, team2_school_id, team1_score, team2_score, team1_school:schools!team1_school_id(display_name), team2_school:schools!team2_school_id(display_name)')
      .eq('season_id', SEASON_ID)
      .eq('gender', GENDER)
      .eq('is_playoff', true)

    if (!meetsErr && meets && meets.length > 0) {
      const meetIds = meets.map(m => m.id)

      const { data: bouts } = await db
        .from('dual_meet_matches')
        .select('dual_meet_id, school_a_id, school_b_id, result_type, team1_points, team2_points')
        .in('dual_meet_id', meetIds)

      type Stats = { name: string; matches: number; points: number; pins: number; techs: number; bonus: number }
      const stats = new Map<number, Stats>()

      for (const m of meets) {
        for (const [sid, score, schoolData] of [
          [m.team1_school_id, m.team1_score, (m as any).team1_school],
          [m.team2_school_id, m.team2_score, (m as any).team2_school],
        ] as [number, number, any][]) {
          if (!stats.has(sid)) stats.set(sid, { name: schoolData?.display_name ?? String(sid), matches: 0, points: 0, pins: 0, techs: 0, bonus: 0 })
          const s = stats.get(sid)!
          s.matches++
          s.points += score
        }
      }

      for (const b of bouts ?? []) {
        for (const [sid, pts] of [[b.school_a_id, b.team1_points], [b.school_b_id, b.team2_points]] as [number, number][]) {
          const s = stats.get(sid)
          if (!s || pts <= 0) continue
          if (b.result_type === 'Fall') s.pins++
          if (b.result_type === 'TF') s.techs++
          s.bonus += Math.max(0, pts - 3)
        }
      }

      type StatRow = { name: string; matches: number; points: number; pins: number; techs: number; bonus: number }
      const ranked = [...stats.values()].filter(s => s.matches > 0)
      function top3(arr: StatRow[], key: (x: StatRow) => number): LeaderEntry[] {
        return [...arr].sort((a, b) => key(b) - key(a)).slice(0, 3).map(x => ({ name: x.name, value: key(x) }))
      }

      leaderStats = {
        pointsPerMatch: top3(ranked, s => s.points / s.matches),
        pinsPerMatch: top3(ranked, s => s.pins / s.matches),
        techsPerMatch: top3(ranked, s => s.techs / s.matches),
        bonusPerMatch: top3(ranked, s => s.bonus / s.matches),
      }
    }
  } catch {
    // is_playoff column not yet migrated — stats remain empty
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Postseason — Team Brackets</h1>
        <p className="text-sm text-slate-500 mt-1">2024–25 NJSIAA Boys Wrestling Team Playoffs</p>
      </div>
      <TeamBracketClient
        regularGroups={regularGroups}
        npGroups={npGroups}
        leaderStats={leaderStats}
        meetResults={meetResults}
      />
    </div>
  )
}
