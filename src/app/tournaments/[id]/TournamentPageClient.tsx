'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { TournamentBoutList } from './TournamentBoutList'

// ── Types ─────────────────────────────────────────────────────────────────────

type School = { id: number; display_name: string; is_nj: boolean }

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
  wrestler1_name_raw: string
  wrestler1_school_raw: string
  wrestler1_school: School | null
  wrestler2_id: string | null
  wrestler2_name_raw: string
  wrestler2_school_raw: string
  wrestler2_school: School | null
}

type Placement = {
  weight_class: number
  place: number
  wrestler_name_raw: string
  school_name_raw: string
  school_id: number | null
  wrestler_id: string | null
  school: { display_name: string; is_nj: boolean } | null
}

type Tournament = {
  id: string
  name: string
  start_date: string
  end_date: string | null
  location: string | null
  source_format: 'full_bracket' | 'school_tracking' | null
  tournament_type: 'outside' | 'inside_outside' | 'inside' | null
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

function computeLeaders(teamStats: Map<number, TeamStat>, bouts: Bout[]): Leaders {
  const teams = [...teamStats.values()]

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
    winnerName:   fastestPinBout.winner === 1 ? fastestPinBout.wrestler1_name_raw : fastestPinBout.wrestler2_name_raw,
    winnerSchool: fastestPinBout.winner === 1
      ? (fastestPinBout.wrestler1_school?.display_name ?? fastestPinBout.wrestler1_school_raw)
      : (fastestPinBout.wrestler2_school?.display_name ?? fastestPinBout.wrestler2_school_raw),
  } : null

  const techCandidates = bouts
    .filter(b => (b.result_type ?? '').toUpperCase() === 'TF' && !b.result_time_estimated && b.fall_time_seconds)
    .sort((a, b) => (a.fall_time_seconds ?? 9999) - (b.fall_time_seconds ?? 9999))
  const fastestTechBout = techCandidates[0] ?? null
  const fastestTech = fastestTechBout ? {
    bout: fastestTechBout,
    winnerName:   fastestTechBout.winner === 1 ? fastestTechBout.wrestler1_name_raw : fastestTechBout.wrestler2_name_raw,
    winnerSchool: fastestTechBout.winner === 1
      ? (fastestTechBout.wrestler1_school?.display_name ?? fastestTechBout.wrestler1_school_raw)
      : (fastestTechBout.wrestler2_school?.display_name ?? fastestTechBout.wrestler2_school_raw),
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

const PLACE_LABEL: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' }

// ── Main component ────────────────────────────────────────────────────────────

export function TournamentPageClient({
  tournament,
  allBouts,
  placements,
  isAdmin,
}: {
  tournament: Tournament
  allBouts: Bout[]
  placements: Placement[]
  isAdmin: boolean
}) {
  // ── State ────────────────────────────────────────────────────────────────

  const weights = useMemo(() => {
    const s = new Set(allBouts.map(b => b.weight_class))
    return [...s].sort((a, b) => a - b)
  }, [allBouts])

  const [selectedSchool, setSelectedSchool] = useState<number | null>(null)
  const [selectedWeight, setSelectedWeight] = useState<number | null>(weights[0] ?? null)

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

  // NJ wrestler names from bouts — used to guard against placements that have a wrong NJ school_id
  // (e.g. OOS wrestlers whose placement school_id was incorrectly set to the tracked NJ school).
  const njWrestlerNames = useMemo(() => {
    const s = new Set<string>()
    for (const b of allBouts) {
      if (b.wrestler1_school?.is_nj && b.wrestler1_name_raw) s.add(b.wrestler1_name_raw.trim().toLowerCase())
      if (b.wrestler2_school?.is_nj && b.wrestler2_name_raw) s.add(b.wrestler2_name_raw.trim().toLowerCase())
    }
    return s
  }, [allBouts])

  // Placements for display: top 3 NJ wrestlers only.
  // Cross-check wrestler_name_raw against names seen in bouts as NJ wrestlers so that
  // OOS wrestlers whose placement row has a bad NJ school_id are excluded.
  const njPodium = useMemo(() => placements.filter(p =>
    p.place <= 3 &&
    p.school?.is_nj &&
    njWrestlerNames.has((p.wrestler_name_raw ?? '').trim().toLowerCase())
  ), [placements, njWrestlerNames])
  const top3ByWeight = useMemo(() => {
    const map = new Map<number, Placement[]>()
    for (const p of placements) {
      if (p.place > 3) continue
      if (!map.has(p.weight_class)) map.set(p.weight_class, [])
      map.get(p.weight_class)!.push(p)
    }
    return map
  }, [placements])

  const hasPlacementData = placements.length > 0

  // ── Helpers for tab graying ───────────────────────────────────────────────

  function isWeightGrayed(wt: number): boolean {
    if (selectedSchool !== null && schoolWeights !== null) return !schoolWeights.has(wt)
    if (hasOosTeams) return !njWeights.has(wt)
    return false
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const dateStr  = formatDateRange(tournament.start_date, tournament.end_date)
  const subtitle = [dateStr, tournament.location].filter(Boolean).join(' · ')

  return (
    <>
      {/* Header */}
      <h1 className="text-2xl font-bold text-slate-900 mb-1">{tournament.name}</h1>
      {subtitle && <p className="text-sm text-slate-500 mb-6">{subtitle}</p>}

      {/* School selector */}
      {schools.length > 0 && (
        <div className="mb-6">
          {/* All Teams button */}
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

          {hasOosSchools ? (
            /* Grouped layout for tournaments with OOS teams */
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
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Non-NJSIAA Schools</p>
                  <div className="flex flex-wrap gap-1.5">
                    {oosSchools.map(s => (
                      <SchoolButton key={s.id} school={s} selectedSchool={selectedSchool} allBouts={allBouts} weights={weights} setSelectedSchool={setSelectedSchool} setSelectedWeight={setSelectedWeight} />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            /* Flat layout for NJ-only tournaments */
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
          {/* Top 3 / NJ Podium */}
          {hasPlacementData && (
            <div className="mb-8">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                {hasOosTeams ? 'Top 3' : 'NJSIAA on the Podium'}
              </p>

              {isFullBracket && top3ByWeight.size > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-[420px] w-full text-[13px]">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th className="text-left px-2 py-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap w-14">Wt</th>
                        <th className="text-left px-2 py-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap">1st</th>
                        <th className="text-left px-2 py-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap">2nd</th>
                        <th className="text-left px-2 py-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap">3rd</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...top3ByWeight.entries()].sort(([a], [b]) => a - b).map(([wt, places], i) => {
                        const first  = places.find(p => p.place === 1)
                        const second = places.find(p => p.place === 2)
                        const third  = places.find(p => p.place === 3)
                        const cell = (p: Placement | undefined) => p ? (
                          <span>
                            {p.wrestler_id ? (
                              <Link href={`/wrestler/${p.wrestler_id}`} className="font-medium text-slate-800 hover:underline">
                                {p.wrestler_name_raw}
                              </Link>
                            ) : (
                              <span className="font-medium text-slate-800">{p.wrestler_name_raw}</span>
                            )}
                            <span className="ml-1 text-slate-400">{p.school?.display_name ?? p.school_name_raw}</span>
                          </span>
                        ) : <span className="text-slate-300">—</span>
                        return (
                          <tr key={wt} className={`border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                            <td className="px-2 py-1.5 text-xs font-semibold text-slate-400">{wt}</td>
                            <td className="px-2 py-1.5 text-xs">{cell(first)}</td>
                            <td className="px-2 py-1.5 text-xs">{cell(second)}</td>
                            <td className="px-2 py-1.5 text-xs">{cell(third)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {!isFullBracket && njPodium.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-[420px] w-full text-[13px]">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th className="text-left px-2 py-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap w-14">Wt</th>
                        <th className="text-left px-2 py-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Wrestler</th>
                        <th className="text-left px-2 py-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap">School</th>
                        <th className="text-left px-2 py-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap w-14">Place</th>
                      </tr>
                    </thead>
                    <tbody>
                      {njPodium.map((p, i) => (
                        <tr key={i} className={`border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                          <td className="px-2 py-1.5 text-xs font-semibold text-slate-400">{p.weight_class}</td>
                          <td className="px-2 py-1.5 text-xs font-medium">
                            {p.wrestler_id ? (
                              <Link href={`/wrestler/${p.wrestler_id}`} className="text-slate-800 hover:underline">
                                {p.wrestler_name_raw}
                              </Link>
                            ) : (
                              <span className="text-slate-800">{p.wrestler_name_raw}</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-xs text-slate-400">{p.school?.display_name ?? p.school_name_raw}</td>
                          <td className="px-2 py-1.5 text-xs font-medium text-slate-500">{PLACE_LABEL[p.place] ?? `${p.place}th`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Leaders */}
          {teamStats.size > 1 && (
            <div className="mb-8">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                {hasOosTeams ? 'NJ Leaders' : 'Leaders'}
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
            <h2 className="text-lg font-semibold text-slate-900">{selectedSchoolData?.display_name}</h2>
            {selectedSchoolData?.is_nj && (
              <Link
                href={`/schools/${selectedSchool}`}
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
            />
          )}
        </>
      )}
    </>
  )
}
