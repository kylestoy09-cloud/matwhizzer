'use client'

import { TournamentStreamEdit } from '@/components/admin/TournamentStreamEdit'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { NjIcon } from '@/components/site/NjIcon'
import { SchoolTagView, badgeOfSchool } from '@/components/SchoolTagView'
import { Stardos_Stencil } from 'next/font/google'
import { TournamentBoutList } from './TournamentBoutList'

const stardos = Stardos_Stencil({ weight: '700', subsets: ['latin'] })

// ── Types ─────────────────────────────────────────────────────────────────────

type School = { id: number; display_name: string; is_nj: boolean; logo_url?: string | null; header_background?: string | null }

type Bout = {
  id: string
  weight_class: number
  round: string
  winner: 1 | 2 | null
  result_type: string | null
  result_detail: string | null
  fall_time_seconds: number | null
  result_time_estimated: boolean
  winner_score: number | null
  loser_score: number | null
  wrestler1_id: string | null
  wrestler1_name: string
  wrestler1_school: School | null
  wrestler2_id: string | null
  wrestler2_name: string
  wrestler2_school: School | null
}

type Placement = {
  weight_class: number
  place: number
  wrestler_name: string
  school_id: number | null
  wrestler_id: string | null
  school: { id: number; display_name: string; is_nj: boolean; logo_url?: string | null; header_background?: string | null } | null
}

type Tournament = {
  id: string
  name: string
  start_date: string
  end_date: string | null
  location: string | null
  source_format: 'full_bracket' | 'school_tracking' | null
  tournament_type: 'outside' | 'inside_outside' | 'inside' | null
  venue_name: string | null
  venue_address: string | null
  is_oos: boolean
  podium_depth: number | null
  gender: string | null
}

type TeamScore = {
  place: number
  school_id: number | null
  score: number
  school: { id: number; is_nj: boolean; display_name: string; logo_url?: string | null; header_background?: string | null } | null
}

type TeamStat = {
  schoolId: number
  displayName: string
  isNj: boolean
  wins: number
  losses: number
  pins: number
  pinTimeSecs: number
  techs: number
  techTimeSecs: number
  majors: number
  bonusPct: number
  totalBonusTimeSecs: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

function formatDateRange(start: string, end: string | null): string {
  const s = new Date(start + 'T12:00:00')
  const sLong = s.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  if (!end || end === start) return sLong
  const e = new Date(end + 'T12:00:00')
  if (s.getFullYear() === e.getFullYear()) {
    if (s.getMonth() === e.getMonth())
      return `${s.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}–${e.getDate()}, ${s.getFullYear()}`
    return `${s.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
  }
  return `${sLong} – ${e.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
}

function isForfeit(rt: string | null): boolean {
  const up = (rt ?? '').toUpperCase()
  return up === 'FORFEIT' || up === 'FOR' || up === 'FORF'
}

function isDff(rt: string | null): boolean {
  return (rt ?? '').toUpperCase() === 'DFF'
}

// ── Stats computation ─────────────────────────────────────────────────────────

function computeTeamStats(bouts: Bout[]): Map<number, TeamStat> {
  const stats = new Map<number, TeamStat>()

  function get(school: School): TeamStat {
    if (!stats.has(school.id)) {
      stats.set(school.id, {
        schoolId: school.id, displayName: school.display_name, isNj: school.is_nj,
        wins: 0, losses: 0, pins: 0, pinTimeSecs: 0,
        techs: 0, techTimeSecs: 0, majors: 0, bonusPct: 0, totalBonusTimeSecs: 0,
      })
    }
    return stats.get(school.id)!
  }

  for (const b of bouts) {
    if (isDff(b.result_type) || isForfeit(b.result_type) || b.winner === null) continue

    const winnerSchool = b.winner === 1 ? b.wrestler1_school : b.wrestler2_school
    const loserSchool  = b.winner === 1 ? b.wrestler2_school : b.wrestler1_school
    const rt = (b.result_type ?? '').toUpperCase()
    const isFall = rt === 'FALL'
    const isTF   = rt === 'TF'
    const isMD   = rt === 'MD'
    const timeSecs = (!b.result_time_estimated && b.fall_time_seconds) ? b.fall_time_seconds : null

    if (winnerSchool) {
      const st = get(winnerSchool)
      st.wins++
      if (isFall) { st.pins++; if (timeSecs) { st.pinTimeSecs += timeSecs; st.totalBonusTimeSecs += timeSecs } }
      if (isTF)   { st.techs++; if (timeSecs) { st.techTimeSecs += timeSecs; st.totalBonusTimeSecs += timeSecs } }
      if (isMD)   { st.majors++ }
    }
    if (loserSchool) get(loserSchool).losses++
  }

  for (const st of stats.values()) {
    st.bonusPct = (st.wins + st.losses) > 0 ? ((st.pins + st.techs + st.majors) / (st.wins + st.losses)) * 100 : 0
  }

  return stats
}

type Leaders = {
  mostWins:     TeamStat | null
  mostPins:     TeamStat | null
  mostTechs:    TeamStat | null
  highestBonus: TeamStat | null
  fastestPin:   { bout: Bout; winnerName: string; winnerSchool: string } | null
  fastestTech:  { bout: Bout; winnerName: string; winnerSchool: string } | null
}

// NJSIAA teams and wrestlers only (Kyle 2026-11-21: the leaders were "littered with non-njsiaa teams" once out-of-state
// events carried their full brackets)
function computeLeaders(teamStats: Map<number, TeamStat>, allBouts: Bout[]): Leaders {
  const teams = [...teamStats.values()].filter(t => t.isNj)
  const bouts = allBouts.filter(b => (b.winner === 1 ? b.wrestler1_school : b.wrestler2_school)?.is_nj === true)

  const mostWins = teams.length
    ? [...teams].sort((a, b) => b.wins - a.wins || a.totalBonusTimeSecs - b.totalBonusTimeSecs)[0]
    : null

  const mostPins = teams.length
    ? [...teams].sort((a, b) => b.pins - a.pins || a.pinTimeSecs - b.pinTimeSecs)[0]
    : null

  const mostTechs = teams.length
    ? [...teams].sort((a, b) => b.techs - a.techs || a.techTimeSecs - b.techTimeSecs)[0]
    : null

  const highestBonus = teams.filter(t => t.isNj && t.wins > 0).length
    ? [...teams].filter(t => t.isNj && t.wins > 0).sort((a, b) =>
        b.bonusPct - a.bonusPct ||
        b.pins - a.pins ||
        (b.pins + b.techs) - (a.pins + a.techs) ||
        a.totalBonusTimeSecs - b.totalBonusTimeSecs,
      )[0]
    : null

  const pinCandidates = bouts
    .filter(b => (b.result_type ?? '').toUpperCase() === 'FALL' && !b.result_time_estimated && b.fall_time_seconds)
    .sort((a, b) => (a.fall_time_seconds ?? 9999) - (b.fall_time_seconds ?? 9999))
  const fastestPinBout = pinCandidates[0] ?? null
  const fastestPin = fastestPinBout ? {
    bout: fastestPinBout,
    winnerName:   fastestPinBout.winner === 1 ? fastestPinBout.wrestler1_name : fastestPinBout.wrestler2_name,
    winnerSchool: fastestPinBout.winner === 1
      ? (fastestPinBout.wrestler1_school?.display_name ?? 'TBD')
      : (fastestPinBout.wrestler2_school?.display_name ?? 'TBD'),
  } : null

  const techCandidates = bouts
    .filter(b => (b.result_type ?? '').toUpperCase() === 'TF' && !b.result_time_estimated && b.fall_time_seconds)
    .sort((a, b) => (a.fall_time_seconds ?? 9999) - (b.fall_time_seconds ?? 9999))
  const fastestTechBout = techCandidates[0] ?? null
  const fastestTech = fastestTechBout ? {
    bout: fastestTechBout,
    winnerName:   fastestTechBout.winner === 1 ? fastestTechBout.wrestler1_name : fastestTechBout.wrestler2_name,
    winnerSchool: fastestTechBout.winner === 1
      ? (fastestTechBout.wrestler1_school?.display_name ?? 'TBD')
      : (fastestTechBout.wrestler2_school?.display_name ?? 'TBD'),
  } : null

  return { mostWins, mostPins, mostTechs, highestBonus, fastestPin, fastestTech }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LeaderCard({
  label,
  name,
  subtext,
  value,
}: {
  label: string
  name: string
  subtext?: string
  value: string
}) {
  return (
    <div className="border border-slate-200 bg-white px-2.5 py-2">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="font-semibold text-slate-900 text-xs leading-tight">{name}</p>
      {subtext && <p className="text-[10px] text-slate-400 mt-0.5">{subtext}</p>}
      <p className="text-base font-bold text-slate-800 mt-0.5">{value}</p>
    </div>
  )
}

function SchoolButton({
  school,
  selectedSchool,
  allBouts,
  weights,
  setSelectedSchool,
  setSelectedWeight,
}: {
  school: School
  selectedSchool: number | null
  allBouts: Bout[]
  weights: number[]
  setSelectedSchool: (id: number) => void
  setSelectedWeight: (wt: number | null) => void
}) {
  return (
    <button
      onClick={() => {
        setSelectedSchool(school.id)
        const firstWeight = weights.find(wt =>
          allBouts.some(
            b => b.weight_class === wt &&
                 (b.wrestler1_school?.id === school.id || b.wrestler2_school?.id === school.id),
          ),
        ) ?? weights[0] ?? null
        setSelectedWeight(firstWeight)
      }}
      className={`px-2.5 py-0.5 text-xs font-medium border transition-colors ${
        selectedSchool === school.id
          ? 'bg-black text-white border-black'
          : school.is_nj
          ? 'bg-white text-slate-700 border-slate-300 hover:border-black'
          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
      }`}
    >
      {school.display_name}
    </button>
  )
}

const PLACE_LABEL: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th', 7: '7th', 8: '8th' }

// ── Main component ────────────────────────────────────────────────────────────

export function TournamentPageClient({
  tournament,
  allBouts,
  placements,
  teamScores,
  bannerBg,
  bannerFg,
  isAdmin,
  hasBracket = false,
  streamUrl = null,
  tournamentGender = 'M',
}: {
  tournament: Tournament
  allBouts: Bout[]
  placements: Placement[]
  teamScores: TeamScore[]
  bannerBg: string
  bannerFg: string
  isAdmin: boolean
  hasBracket?: boolean
  streamUrl?: string | null           // shown only once an admin has set one (Kyle 2026-11-18)
  tournamentGender?: 'M' | 'F'
}) {
  // ── State ────────────────────────────────────────────────────────────────

  const weights = useMemo(() => {
    const s = new Set(allBouts.map(b => b.weight_class))
    return [...s].sort((a, b) => a - b)
  }, [allBouts])

  const [selectedSchool, setSelectedSchool] = useState<number | null>(null)
  const [selectedWeight, setSelectedWeight] = useState<number | null>(weights[0] ?? null)
  const [showAllScores, setShowAllScores]   = useState(false)
  // non-NJSIAA teams minimized until asked for (Kyle 2026-11-20: Sam Cali's CT winner sat atop the NJ leaderboard)
  const [showOosTeams, setShowOosTeams]     = useState(false)
  const [podiumNjOnly, setPodiumNjOnly]     = useState(true)

  // ── Derived data ─────────────────────────────────────────────────────────

  const schools: School[] = useMemo(() => {
    const map = new Map<number, School>()
    for (const b of allBouts) {
      if (b.wrestler1_school?.id) map.set(b.wrestler1_school.id, b.wrestler1_school)
      if (b.wrestler2_school?.id) map.set(b.wrestler2_school.id, b.wrestler2_school)
    }
    return [...map.values()].sort((a, b) => {
      if (a.is_nj !== b.is_nj) return a.is_nj ? -1 : 1
      return a.display_name.localeCompare(b.display_name)
    })
  }, [allBouts])

  const teamStats  = useMemo(() => computeTeamStats(allBouts), [allBouts])
  const leaders    = useMemo(() => computeLeaders(teamStats, allBouts), [teamStats, allBouts])
  const njSchools  = useMemo(() => schools.filter(s => s.is_nj),  [schools])
  const oosSchools = useMemo(() => schools.filter(s => !s.is_nj), [schools])
  const hasOosSchools = oosSchools.length > 0

  // Weights where NJ has at least one wrestler (for graying Outside tabs)
  const njWeights = useMemo(() => {
    const s = new Set<number>()
    for (const b of allBouts) {
      if (b.wrestler1_school?.is_nj || b.wrestler2_school?.is_nj) s.add(b.weight_class)
    }
    return s
  }, [allBouts])

  // Weights where selected school has bouts
  const schoolWeights = useMemo(() => {
    if (selectedSchool === null) return null
    const s = new Set<number>()
    for (const b of allBouts) {
      if (b.wrestler1_school?.id === selectedSchool || b.wrestler2_school?.id === selectedSchool)
        s.add(b.weight_class)
    }
    return s
  }, [allBouts, selectedSchool])

  const displayBouts = useMemo(() => {
    const byWeight = allBouts.filter(b => b.weight_class === selectedWeight)
    if (selectedSchool === null) return byWeight
    return byWeight.filter(
      b => b.wrestler1_school?.id === selectedSchool || b.wrestler2_school?.id === selectedSchool,
    )
  }, [allBouts, selectedWeight, selectedSchool])

  const selectedSchoolStat = selectedSchool !== null ? teamStats.get(selectedSchool) : null
  const selectedSchoolData = schools.find(s => s.id === selectedSchool) ?? null

  const isFullBracket  = tournament.source_format === 'full_bracket' || tournament.source_format === null
  const isOutside      = tournament.tournament_type === 'outside'
  const hasOosTeams    = isOutside || tournament.tournament_type === 'inside_outside'

  const podiumDepth = tournament.podium_depth ?? 3

  // the podium: NJSIAA placers first (the default), every placer on "All"
  const podiumAll = useMemo(() => placements.filter(p => p.place <= podiumDepth), [placements, podiumDepth])
  const podiumHasOthers = podiumAll.some(p => p.school?.is_nj !== true)
  const shownPodium = podiumNjOnly && podiumHasOthers ? podiumAll.filter(p => p.school?.is_nj === true) : podiumAll
  const podiumWeights = [...new Set(shownPodium.map(p => p.weight_class))].sort((a, b) => a - b)

  const hasPlacementData = placements.length > 0

  // ── Helpers for tab graying ───────────────────────────────────────────────

  function isWeightGrayed(wt: number): boolean {
    if (selectedSchool !== null && schoolWeights !== null) return !schoolWeights.has(wt)
    if (hasOosTeams) return !njWeights.has(wt)
    return false
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const dateStr = formatDateRange(tournament.start_date, tournament.end_date)
  const hasScores = teamScores.length > 0
  const SCORE_CUTOFF = 20
  // the official standings, NJSIAA teams only until "show non-NJSIAA" — places stay the official ones
  const oosTeamCount = teamScores.filter(s => s.school?.is_nj === false).length
  const visibleScores = showOosTeams ? teamScores : teamScores.filter(s => s.school?.is_nj !== false)
  const displayedScores = hasScores && !showAllScores && visibleScores.length > SCORE_CUTOFF
    ? visibleScores.slice(0, 8)
    : visibleScores

  function selectFromScores(schoolId: number) {
    setSelectedSchool(schoolId)
    const firstWeight = weights.find(wt =>
      allBouts.some(b => b.weight_class === wt && (b.wrestler1_school?.id === schoolId || b.wrestler2_school?.id === schoolId))
    ) ?? weights[0] ?? null
    setSelectedWeight(firstWeight)
  }

  return (
    <>
      {/* Banner */}
      <div
        className="mb-6 px-5 py-5"
        style={{ backgroundColor: bannerBg, color: bannerFg }}
      >
        <h1 className={`${stardos.className} text-2xl uppercase tracking-tight leading-none`}>{tournament.name}</h1>
        {tournament.venue_name && (
          <p className="text-sm mt-1 opacity-80">{tournament.venue_name}</p>
        )}
        {tournament.venue_address && (
          <p className="text-xs mt-0.5 opacity-60">{tournament.venue_address}</p>
        )}
        <p className="text-xs mt-1 opacity-70">{dateStr}</p>
        {streamUrl && (
          <a href={streamUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 mr-2 text-xs font-semibold underline opacity-90 hover:opacity-100">Stream ↗</a>
        )}
        {isAdmin && <div className="mt-2"><TournamentStreamEdit id={tournament.id} gender={tournamentGender} current={streamUrl} /></div>}
        {isOutside && (
          <span className="inline-block mt-2 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-900 text-white">Out of State</span>
        )}
      </div>

      {/* Team scores (scored tournaments) */}
      {(hasScores || isAdmin) && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Team Scores</p>
            {isAdmin && (
              <Link
                href={`/admin/${tournament.gender === 'F' ? 'girls' : 'boys'}/team-scores?tournament=${encodeURIComponent(tournament.name)}`}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 border border-slate-300 px-2.5 py-1 hover:border-slate-500 transition-colors"
              >
                {hasScores ? 'Edit scores' : '+ Import scores'}
              </Link>
            )}
          </div>
          {hasScores && <div className="border border-black overflow-x-auto">
            <table className="min-w-max w-full text-[13px]">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="text-left px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap w-10">#</th>
                  <th className="text-left px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap">School</th>
                  <th className="text-right px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Score</th>
                </tr>
              </thead>
              <tbody>
                {displayedScores.map((s, i) => {
                  const isNjAtOos = isOutside && s.school?.is_nj === true
                  const isOosAtNj = !isOutside && s.school?.is_nj === false
                  const highlight = isNjAtOos || isOosAtNj
                  return (
                    <tr
                      key={i}
                      className={`border-t border-slate-100 ${
                        s.school_id !== null && selectedSchool === s.school_id
                          ? 'bg-black text-white'
                          : highlight
                          ? 'bg-amber-50'
                          : i % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                      }`}
                    >
                      <td className={`px-3 py-1 text-xs tabular-nums ${selectedSchool === s.school_id ? 'text-slate-300' : 'text-slate-400'}`}>{s.place}</td>
                      <td className="px-3 py-1 font-medium">
                        {s.school_id !== null && (!isOutside || isNjAtOos) ? (
                          <button
                            onClick={() => selectedSchool === s.school_id ? setSelectedSchool(null) : selectFromScores(s.school_id!)}
                            className={`text-left hover:underline ${selectedSchool === s.school_id ? 'text-white' : 'text-slate-800'}`}
                          >
                            <SchoolTagView id={s.school?.id} name={s.school?.display_name} badge={badgeOfSchool(s.school)} className="" />
                          </button>
                        ) : (
                          <span className="text-slate-800"><SchoolTagView id={s.school?.id} name={s.school?.display_name} badge={badgeOfSchool(s.school)} className="" /></span>
                        )}
                        {isNjAtOos && selectedSchool !== s.school_id && (
                          <span className="ml-2 text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">NJSIAA</span>
                        )}
                        {isOosAtNj && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-900 text-white">Non-NJSIAA</span>
                        )}
                      </td>
                      <td className={`px-3 py-1 text-right tabular-nums ${selectedSchool === s.school_id ? 'text-slate-300' : 'text-slate-700'}`}>{s.score % 1 === 0 ? s.score.toFixed(0) : s.score.toFixed(1)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>}
          <div className="mt-2 flex flex-wrap gap-4">
            {visibleScores.length > SCORE_CUTOFF && (
              <button
                onClick={() => setShowAllScores(v => !v)}
                className="text-xs text-slate-500 hover:text-slate-800 hover:underline"
              >
                {showAllScores ? 'Show less' : `Show all ${visibleScores.length} teams ▾`}
              </button>
            )}
            {oosTeamCount > 0 && (
              <button onClick={() => setShowOosTeams(v => !v)} className="text-xs text-slate-500 hover:text-slate-800 hover:underline">
                {showOosTeams ? 'Hide non-NJSIAA teams' : `Show ${oosTeamCount} non-NJSIAA team${oosTeamCount === 1 ? '' : 's'} ▾`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* School selector */}
      {schools.length > 0 && (
        <div className="mb-6">
          {!hasScores && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button
                onClick={() => setSelectedSchool(null)}
                className={`px-2.5 py-0.5 text-xs font-medium border transition-colors ${
                  selectedSchool === null
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-black'
                }`}
              >
                All Teams
              </button>
            </div>
          )}

          {hasOosSchools ? (
            <>
              {njSchools.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">NJSIAA Schools</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {njSchools.map(s => (
                      <SchoolButton key={s.id} school={s} selectedSchool={selectedSchool} allBouts={allBouts} weights={weights} setSelectedSchool={setSelectedSchool} setSelectedWeight={setSelectedWeight} />
                    ))}
                  </div>
                </>
              )}
              {oosSchools.length > 0 && (
                <>
                  <button onClick={() => setShowOosTeams(v => !v)} className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 hover:text-slate-700">
                    Non-NJSIAA Schools ({oosSchools.length}) {showOosTeams ? '▴' : '▾'}
                  </button>
                  {showOosTeams && <div className="flex flex-wrap gap-1.5">
                    {oosSchools.map(s => isOutside ? (
                      <span key={s.id} className="px-2.5 py-0.5 text-xs font-medium border border-slate-200 bg-slate-50 text-slate-400">{s.display_name}</span>
                    ) : (
                      <SchoolButton key={s.id} school={s} selectedSchool={selectedSchool} allBouts={allBouts} weights={weights} setSelectedSchool={setSelectedSchool} setSelectedWeight={setSelectedWeight} />
                    ))}
                  </div>}
                </>
              )}
            </>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {schools.map(s => (
                <SchoolButton key={s.id} school={s} selectedSchool={selectedSchool} allBouts={allBouts} weights={weights} setSelectedSchool={setSelectedSchool} setSelectedWeight={setSelectedWeight} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── All Teams view ── */}
      {selectedSchool === null && (
        <>
          {/* Podium (Kyle 2026-11-21): the history page's table — weights down the side, places across — starting on
              NJSIAA placers, with "All" for everyone; an NJSIAA wrestler carries the NJ outline where others are listed */}
          {hasPlacementData && podiumWeights.length > 0 && (
            <div className="mb-8">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Podium (Top {podiumDepth})</p>
                {podiumHasOthers && (
                  <div className="ml-auto flex border border-slate-300 text-xs">
                    {([[true, 'NJSIAA'], [false, 'All']] as const).map(([v, label]) => (
                      <button key={label} onClick={() => setPodiumNjOnly(v)} className={`px-2.5 py-0.5 ${podiumNjOnly === v ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>{label}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="border border-black overflow-x-auto">
                <table className="min-w-max w-full text-[13px]">
                  <thead><tr className="bg-slate-900 text-white">
                    <th className="text-left px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Weight</th>
                    {Array.from({ length: podiumDepth }, (_, i) => <th key={i} className="text-left px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap">{PLACE_LABEL[i + 1] ?? `${i + 1}th`}</th>)}
                  </tr></thead>
                  <tbody>
                    {podiumWeights.map((wt, i) => (
                      <tr key={wt} className={`border-t border-slate-100 ${i % 2 ? 'bg-slate-50' : 'bg-white'}`}>
                        <td className="px-3 py-1 font-semibold tabular-nums">{wt}</td>
                        {Array.from({ length: podiumDepth }, (_, k) => {
                          const p = shownPodium.find(x => x.weight_class === wt && x.place === k + 1)
                          return (
                            <td key={k} className="px-3 py-1 align-top">
                              {p ? <>
                                <span className="flex items-center gap-1 whitespace-nowrap">
                                  {p.school?.is_nj && podiumHasOthers && <NjIcon />}
                                  {p.wrestler_id ? <Link href={`/wrestler/${p.wrestler_id}`} className={`text-slate-800 hover:underline ${k === 0 ? 'font-semibold' : ''}`}>{p.wrestler_name}</Link> : <span className="text-slate-800">{p.wrestler_name}</span>}
                                </span>
                                <span className="block text-[11px] text-slate-400 whitespace-nowrap">{p.school?.display_name ?? ''}</span>
                              </> : <span className="text-slate-300">—</span>}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Leaders */}
          {teamStats.size > 1 && (
            <div className="mb-8">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                {hasOosSchools ? 'NJSIAA Leaders' : 'Leaders'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {leaders.mostWins && leaders.mostWins.wins > 0 && (
                  <LeaderCard
                    label="Most Wins"
                    name={leaders.mostWins.displayName}
                    value={String(leaders.mostWins.wins)}
                  />
                )}
                {leaders.mostPins && leaders.mostPins.pins > 0 && (
                  <LeaderCard
                    label="Most Pins"
                    name={leaders.mostPins.displayName}
                    value={String(leaders.mostPins.pins)}
                    subtext={leaders.mostPins.pinTimeSecs > 0 ? `${formatTime(leaders.mostPins.pinTimeSecs)} total pin time` : undefined}
                  />
                )}
                {leaders.mostTechs && leaders.mostTechs.techs > 0 && (
                  <LeaderCard
                    label="Most Techs"
                    name={leaders.mostTechs.displayName}
                    value={String(leaders.mostTechs.techs)}
                    subtext={leaders.mostTechs.techTimeSecs > 0 ? `${formatTime(leaders.mostTechs.techTimeSecs)} total tech time` : undefined}
                  />
                )}
                {leaders.highestBonus && leaders.highestBonus.bonusPct > 0 && (
                  <LeaderCard
                    label="Highest Bonus %"
                    name={leaders.highestBonus.displayName}
                    value={`${leaders.highestBonus.bonusPct.toFixed(1)}%`}
                    subtext={`${leaders.highestBonus.pins}F · ${leaders.highestBonus.techs}TF · ${leaders.highestBonus.majors}MD`}
                  />
                )}
                {leaders.fastestPin && (
                  <LeaderCard
                    label="Fastest Pin"
                    name={leaders.fastestPin.winnerName}
                    subtext={leaders.fastestPin.winnerSchool}
                    value={formatTime(leaders.fastestPin.bout.fall_time_seconds!)}
                  />
                )}
                {leaders.fastestTech && (
                  <LeaderCard
                    label="Fastest Tech"
                    name={leaders.fastestTech.winnerName}
                    subtext={leaders.fastestTech.winnerSchool}
                    value={formatTime(leaders.fastestTech.bout.fall_time_seconds!)}
                  />
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── School view ── */}
      {selectedSchool !== null && selectedSchoolStat && (
        <div className="mb-8">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedSchool(null)}
                className="text-xs text-slate-400 hover:text-slate-700"
              >
                ← All teams
              </button>
              <h2 className="text-lg font-semibold text-slate-900">{selectedSchoolData?.display_name}</h2>
            </div>
            {selectedSchoolData?.is_nj && (
              <Link
                href={`/${tournament.gender === 'F' ? 'girls' : 'boys'}/schools/${selectedSchool}`}
                className="text-xs text-slate-400 hover:text-slate-700 hover:underline shrink-0 ml-4"
              >
                View school page →
              </Link>
            )}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { label: 'W', value: selectedSchoolStat.wins },
              { label: 'L', value: selectedSchoolStat.losses },
              { label: 'Pins', value: selectedSchoolStat.pins },
              { label: 'Techs', value: selectedSchoolStat.techs },
              { label: 'Majors', value: selectedSchoolStat.majors },
              {
                label: 'Bonus %',
                value: `${selectedSchoolStat.bonusPct.toFixed(1)}%`,
              },
            ].map(({ label, value }) => (
              <div key={label} className="border border-slate-200 bg-white p-3 text-center">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Teams reset — shown when a school is selected */}
      {selectedSchool !== null && (
        <div className="mb-4">
          <button
            onClick={() => setSelectedSchool(null)}
            className="px-3 py-1 text-xs font-medium border border-slate-300 bg-white text-slate-600 hover:border-black hover:text-slate-900 transition-colors"
          >
            ← All Teams
          </button>
        </div>
      )}

      {/* Bracket link */}
      {hasBracket && (
        <div className="mb-5">
          <Link
            href={`/tournaments/${tournament.id}/bracket`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-black text-white hover:bg-slate-800 transition-colors"
          >
            View Bracket →
          </Link>
        </div>
      )}

      {/* Weight tabs + bout list */}
      {weights.length === 0 ? (
        <div className="border border-black bg-white p-8 text-center">
          <p className="text-sm text-slate-500">No bouts recorded for this tournament.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 mb-5" role="group" aria-label="Weight class">
            {weights.map(wt => {
              const grayed = isWeightGrayed(wt)
              const active = wt === selectedWeight
              return (
                <button
                  key={wt}
                  onClick={() => !grayed && setSelectedWeight(wt)}
                  disabled={grayed}
                  className={`px-3 py-1 text-sm font-medium border transition-colors ${
                    grayed
                      ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-default'
                      : active
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-slate-700 border-black hover:bg-slate-50'
                  }`}
                >
                  {wt}
                </button>
              )
            })}
          </div>

          {selectedWeight !== null && (
            <TournamentBoutList
              bouts={displayBouts}
              tournamentId={tournament.id}
              selectedWeight={selectedWeight}
              isAdmin={isAdmin}
              isOutside={isOutside}
              adminSide={tournament.gender === 'F' ? 'girls' : 'boys'}
            />
          )}
        </>
      )}
    </>
  )
}
