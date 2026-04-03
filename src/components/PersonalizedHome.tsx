'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase/client'

type SchoolInfo = {
  id: number
  display_name: string
  abbreviation: string | null
  section: string | null
  classification: string | null
  mascot: string | null
  primary_color: string | null
  secondary_color: string | null
  short_name: string | null
  isPrimary: boolean
}

function schoolInitials(s: SchoolInfo) {
  if (s.short_name) return s.short_name.slice(0, 3)
  const words = s.display_name.split(/[\s-]+/).filter(w => !['of', 'at', 'the'].includes(w.toLowerCase()))
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return s.display_name.slice(0, 2).toUpperCase()
}

type BreakdownRow = {
  tournament_type: string
  total_points: number
  win_count: number
}

type WrestlerRow = {
  wrestler_id: string
  wrestler_name: string
  primary_weight: number
  districts_placement: string | null
  regions_placement: string | null
  state_placement: string | null
}

type FollowedWrestlerRow = {
  id: string
  first_name: string
  last_name: string
  gender: string
}

type WrestlerPlacement = {
  wrestler_id: string
  wrestler_name: string
  weight: number
  place: number
  tournament_type: string
}

type MatchRow = {
  id: string
  win_type: string
  winner_score: number | null
  loser_score: number | null
  round: string
  fall_time_seconds: number | null
  winner_entry: {
    wrestler: { first_name: string; last_name: string } | null
    school_context_raw: string | null
    weight_class: { weight: number } | null
  } | null
  loser_entry: {
    wrestler: { first_name: string; last_name: string } | null
    school_context_raw: string | null
    weight_class: { weight: number } | null
  } | null
  tournament: { name: string } | null
}

const TOURNEY_LABEL: Record<string, string> = {
  districts: 'Districts',
  regions: 'Regions',
  boys_state: 'State',
  girls_regions: 'Regions',
  girls_state: 'State',
}

function placeBadge(p: string | null) {
  if (!p) return null
  const cls = p === '1st' ? 'bg-amber-100 text-amber-800'
    : p === '2nd' ? 'bg-slate-200 text-slate-700'
    : p === '3rd' ? 'bg-orange-100 text-orange-800'
    : 'bg-emerald-50 text-emerald-700'
  return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cls}`}>{p}</span>
}

function classificationLabel(s: SchoolInfo) {
  if (!s.section || !s.classification) return null
  if (s.section === 'Non-Public') return `Non-Public ${s.classification}`
  return `${s.section} Group ${s.classification}`
}

function resultLabel(m: MatchRow) {
  const wt = m.win_type
  if (wt === 'FALL') {
    const t = m.fall_time_seconds
    if (t) { const min = Math.floor(t / 60); const sec = t % 60; return `Fall ${min}:${String(sec).padStart(2, '0')}` }
    return 'Fall'
  }
  if (wt === 'DEC' && m.winner_score != null && m.loser_score != null) return `Dec ${m.winner_score}-${m.loser_score}`
  if (wt === 'MD' && m.winner_score != null && m.loser_score != null) return `MD ${m.winner_score}-${m.loser_score}`
  if (wt === 'TF' && m.winner_score != null && m.loser_score != null) return `TF ${m.winner_score}-${m.loser_score}`
  return wt ?? ''
}

export function PersonalizedHome() {
  const [schools, setSchools] = useState<SchoolInfo[]>([])
  const [preference, setPreference] = useState<string>('both')
  const [breakdown, setBreakdown] = useState<BreakdownRow[]>([])
  const [schoolWrestlers, setSchoolWrestlers] = useState<Map<number, WrestlerRow[]>>(new Map())
  const [followedWrestlers, setFollowedWrestlers] = useState<FollowedWrestlerRow[]>([])
  const [wrestlerPlacements, setWrestlerPlacements] = useState<Map<string, WrestlerPlacement[]>>(new Map())
  const [recentMatches, setRecentMatches] = useState<MatchRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createSupabaseBrowser()

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setLoaded(true); return }
      setIsLoggedIn(true)

      const { data: profile } = await supabase
        .from('users')
        .select('primary_school_id, followed_school_ids, followed_wrestler_ids, wrestling_preference')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!profile) { setLoaded(true); return }
      const p = profile as {
        primary_school_id: number | null
        followed_school_ids: number[] | null
        followed_wrestler_ids: string[] | null
        wrestling_preference: string | null
      }

      const pref = p.wrestling_preference ?? 'both'
      setPreference(pref)
      const gender = pref === 'girls' ? 'F' : 'M'

      // Collect all school IDs (deduplicated)
      const allSchoolIds = [...new Set([
        ...(p.primary_school_id ? [p.primary_school_id] : []),
        ...(p.followed_school_ids ?? []),
      ])]

      if (allSchoolIds.length === 0) { setLoaded(true); return }

      // Fetch school data from schools table (has id, display_name, section, classification)
      const { data: schoolsData } = await supabase
        .from('schools')
        .select('id, display_name, section, classification, mascot, primary_color, secondary_color, short_name')
        .in('id', allSchoolIds)

      if (!schoolsData || schoolsData.length === 0) { setLoaded(true); return }

      // Fetch abbreviations from school_names by matching display_name
      const names = schoolsData.map(s => s.display_name)
      const { data: abbrevData } = await supabase
        .from('school_names')
        .select('abbreviation, school_name')
        .in('school_name', names)

      const abbrevMap = new Map((abbrevData ?? []).map(a => [a.school_name, a.abbreviation]))

      // Build school info
      const schoolInfoList: SchoolInfo[] = schoolsData.map(s => ({
        id: s.id,
        display_name: s.display_name,
        abbreviation: abbrevMap.get(s.display_name) ?? null,
        section: s.section,
        classification: s.classification,
        mascot: s.mascot,
        primary_color: s.primary_color,
        secondary_color: s.secondary_color,
        short_name: s.short_name,
        isPrimary: s.id === p.primary_school_id,
      }))

      // Sort: primary first, then followed
      schoolInfoList.sort((a, b) => (a.isPrimary ? -1 : b.isPrimary ? 1 : 0))
      setSchools(schoolInfoList)

      // Fetch school wrestlers and breakdown for each school that has an abbreviation
      const schoolsWithAbbrev = schoolInfoList.filter(s => s.abbreviation)
      const primary = schoolInfoList.find(s => s.isPrimary && s.abbreviation)

      const wrPromises = schoolsWithAbbrev.map(s =>
        supabase.rpc('school_wrestlers', { p_school: s.abbreviation!, p_gender: gender, p_season: 2 })
          .then(res => ({ schoolId: s.id, data: (res.data ?? []) as WrestlerRow[] }))
      )

      const bdPromise = primary
        ? supabase.rpc('school_points_breakdown', { p_school: primary.abbreviation!, p_gender: gender, p_season: 2 })
        : Promise.resolve({ data: null })

      const [wrResults, bdRes] = await Promise.all([
        Promise.all(wrPromises),
        bdPromise,
      ])

      setBreakdown((bdRes.data ?? []) as BreakdownRow[])

      // Build wrestler map per school (sorted: state placers first)
      const wrMap = new Map<number, WrestlerRow[]>()
      const allWrestlerIds: string[] = []
      for (const { schoolId, data: wr } of wrResults) {
        wr.sort((a, b) => {
          const aRank = a.state_placement ? 0 : a.regions_placement ? 1 : a.districts_placement ? 2 : 3
          const bRank = b.state_placement ? 0 : b.regions_placement ? 1 : b.districts_placement ? 2 : 3
          if (aRank !== bRank) return aRank - bRank
          return a.primary_weight - b.primary_weight
        })
        wrMap.set(schoolId, wr)
        for (const w of wr) allWrestlerIds.push(w.wrestler_id)
      }
      setSchoolWrestlers(wrMap)

      // Fetch recent matches for wrestlers from user's schools
      if (allSchoolIds.length > 0) {
        try {
          // Get recent tournament entries for user's schools
          const { data: entries } = await supabase
            .from('tournament_entries')
            .select('id')
            .in('school_id', allSchoolIds)
            .order('tournament_id', { ascending: false })
            .limit(200)

          if (entries && entries.length > 0) {
            const entryIds = entries.map(e => e.id)
            // Query matches where winner or loser is from user's schools
            const { data: matchesData } = await supabase
              .from('matches')
              .select(`
                id, win_type, winner_score, loser_score, round, fall_time_seconds,
                winner_entry:tournament_entries!winner_entry_id(
                  wrestler:wrestlers(first_name, last_name),
                  school_context_raw,
                  weight_class:weight_classes(weight)
                ),
                loser_entry:tournament_entries!loser_entry_id(
                  wrestler:wrestlers(first_name, last_name),
                  school_context_raw,
                  weight_class:weight_classes(weight)
                ),
                tournament:tournaments(name)
              `)
              .or(`winner_entry_id.in.(${entryIds.join(',')}),loser_entry_id.in.(${entryIds.join(',')})`)
              .order('id', { ascending: false })
              .limit(10)

            setRecentMatches((matchesData ?? []) as unknown as MatchRow[])
          }
        } catch {
          // Matches query failed — not critical, skip silently
        }
      }

      // Fetch followed wrestlers
      const wrestlerIds = p.followed_wrestler_ids ?? []
      if (wrestlerIds.length > 0) {
        const { data: wData } = await supabase
          .from('wrestlers')
          .select('id, first_name, last_name, gender')
          .in('id', wrestlerIds)
        setFollowedWrestlers((wData ?? []) as FollowedWrestlerRow[])

        const { data: plData } = await supabase
          .from('placements')
          .select('wrestler_id, weight_class:weight_classes(weight), place, tournament:tournaments(tournament_type)')
          .in('wrestler_id', wrestlerIds)
          .lte('place', 8)
        if (plData) {
          const map = new Map<string, WrestlerPlacement[]>()
          for (const row of plData as unknown as { wrestler_id: string; weight_class: { weight: number } | null; place: number; tournament: { tournament_type: string } | null }[]) {
            if (!row.tournament || !row.weight_class) continue
            const list = map.get(row.wrestler_id) ?? []
            list.push({
              wrestler_id: row.wrestler_id,
              wrestler_name: '',
              weight: row.weight_class.weight,
              place: row.place,
              tournament_type: row.tournament.tournament_type,
            })
            map.set(row.wrestler_id, list)
          }
          setWrestlerPlacements(map)
        }
      }

      setLoaded(true)
    })
  }, [])

  if (!loaded) return null

  // Not logged in — show nothing
  if (!isLoggedIn) return null

  // Logged in but no schools — show prompt
  if (schools.length === 0 && followedWrestlers.length === 0) {
    return (
      <div className="mb-8 bg-white border border-black rounded-none shadow-none px-5 py-6 text-center">
        <p className="text-sm text-slate-600 mb-2">Follow some schools to personalize your feed</p>
        <Link href="/schools" className="text-sm font-medium text-blue-600 hover:underline">
          Browse schools →
        </Link>
      </div>
    )
  }

  const base = preference === 'girls' ? '/girls' : '/boys'
  const primarySchool = schools.find(s => s.isPrimary)
  const totalPts = breakdown.reduce((sum, r) => sum + Number(r.total_points), 0)
  const totalWins = breakdown.reduce((sum, r) => sum + Number(r.win_count), 0)

  // Build school leaderboard data: top placers (1-8) for each school
  const schoolLeaderboards = schools
    .filter(s => {
      const wr = schoolWrestlers.get(s.id) ?? []
      return wr.some(w => w.state_placement || w.regions_placement || w.districts_placement)
    })
    .map(s => {
      const wr = schoolWrestlers.get(s.id) ?? []
      const placers = wr.filter(w => w.state_placement || w.regions_placement || w.districts_placement)
      return { school: s, placers: placers.slice(0, 8) }
    })

  return (
    <div className="mb-8 space-y-6">

      {/* ── YOUR SCHOOLS ── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Your Schools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {schools.map(s => {
            const label = classificationLabel(s)
            const pc = s.primary_color ?? '#1a1a2e'
            const sc = s.secondary_color ?? '#FFD700'
            return (
              <Link
                key={s.id}
                href={s.abbreviation ? `/schools/${encodeURIComponent(s.abbreviation)}` : '#'}
                className="block rounded-none border border-black bg-white shadow-none hover:bg-slate-50 transition-colors overflow-hidden"
              >
                <div className="flex items-center gap-3 px-4 py-3" style={{ borderLeft: `4px solid ${pc}` }}>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{ backgroundColor: pc, color: sc }}
                  >
                    {schoolInitials(s)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 truncate">{s.display_name}</span>
                      {s.isPrimary && (
                        <span className="text-[10px] font-medium text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded-full shrink-0">Primary</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {s.mascot && <span className="text-xs text-slate-400">{s.mascot}</span>}
                      {s.mascot && label && <span className="text-xs text-slate-300">·</span>}
                      {label && <span className="text-xs text-slate-400">{label}</span>}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── Primary School Detail ── */}
      {primarySchool && primarySchool.abbreviation && (
        <section className="bg-white border border-black rounded-none shadow-none overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between" style={{ borderTop: `3px solid ${primarySchool.primary_color ?? '#1a1a2e'}` }}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                style={{ backgroundColor: primarySchool.primary_color ?? '#1a1a2e', color: primarySchool.secondary_color ?? '#FFD700' }}
              >
                {schoolInitials(primarySchool)}
              </div>
              <div>
                <Link
                  href={`/schools/${encodeURIComponent(primarySchool.abbreviation)}`}
                  className="text-lg font-bold text-slate-900 hover:underline"
                >
                  {primarySchool.display_name}
                </Link>
                <p className="text-xs text-slate-500 mt-0.5">
                  {[primarySchool.mascot, classificationLabel(primarySchool)].filter(Boolean).join(' · ') || 'Your primary school'}
                </p>
              </div>
            </div>
            {totalPts > 0 && (
              <div className="text-right">
                <p className="text-xl font-bold text-slate-900 tabular-nums">{Math.round(totalPts * 10) / 10}</p>
                <p className="text-[10px] text-slate-500 uppercase">Team Pts</p>
              </div>
            )}
          </div>

          {breakdown.length > 0 && (
            <div className="px-5 py-3 border-b border-slate-50 flex gap-4">
              {breakdown.map(r => (
                <div key={r.tournament_type} className="text-center">
                  <p className="text-sm font-semibold text-slate-800 tabular-nums">{r.total_points}</p>
                  <p className="text-[10px] text-slate-400">{TOURNEY_LABEL[r.tournament_type] ?? r.tournament_type}</p>
                </div>
              ))}
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-500 tabular-nums">{totalWins}</p>
                <p className="text-[10px] text-slate-400">Wins</p>
              </div>
            </div>
          )}

          {(() => {
            const wr = schoolWrestlers.get(primarySchool.id) ?? []
            return wr.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {wr.slice(0, 14).map(w => (
                  <div key={w.wrestler_id} className="flex items-center gap-2 px-5 py-2">
                    <span className="text-[10px] text-slate-400 w-8 shrink-0 text-right tabular-nums">{w.primary_weight}</span>
                    <Link
                      href={`/wrestler/${w.wrestler_id}`}
                      className="text-sm font-medium text-slate-800 hover:underline truncate flex-1"
                    >
                      {w.wrestler_name}
                    </Link>
                    <div className="flex items-center gap-1 shrink-0">
                      {placeBadge(w.state_placement)}
                      {!w.state_placement && placeBadge(w.regions_placement)}
                      {!w.state_placement && !w.regions_placement && placeBadge(w.districts_placement)}
                    </div>
                  </div>
                ))}
              </div>
            ) : null
          })()}

          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
            <Link
              href={`/schools/${encodeURIComponent(primarySchool.abbreviation)}`}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              View full school profile →
            </Link>
          </div>
        </section>
      )}

      {/* ── RECENT MATCHES ── */}
      {recentMatches.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Recent Matches</h2>
          <div className="bg-white border border-black rounded-none shadow-none overflow-hidden divide-y divide-slate-50">
            {recentMatches.map(m => {
              const winner = m.winner_entry
              const loser = m.loser_entry
              if (!winner?.wrestler || !loser?.wrestler) return null
              const wName = `${winner.wrestler.first_name} ${winner.wrestler.last_name}`
              const lName = `${loser.wrestler.first_name} ${loser.wrestler.last_name}`
              const weight = winner.weight_class?.weight ?? loser.weight_class?.weight
              return (
                <div key={m.id} className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {weight && <span className="text-[10px] text-slate-400 w-8 shrink-0 text-right tabular-nums">{weight}</span>}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-sm">
                        <span className="font-medium text-slate-800 truncate">{wName}</span>
                        <span className="text-slate-400 shrink-0">def.</span>
                        <span className="text-slate-600 truncate">{lName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{resultLabel(m)}</span>
                        {m.tournament?.name && (
                          <>
                            <span>·</span>
                            <span className="truncate">{m.tournament.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── SCHOOL LEADERBOARDS ── */}
      {schoolLeaderboards.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">School Leaderboards</h2>
          <div className="space-y-4">
            {schoolLeaderboards.map(({ school: s, placers }) => (
              <div key={s.id} className="bg-white border border-black rounded-none shadow-none overflow-hidden" style={{ borderTop: `3px solid ${s.primary_color ?? '#1a1a2e'}` }}>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                      style={{ backgroundColor: s.primary_color ?? '#1a1a2e', color: s.secondary_color ?? '#FFD700' }}
                    >
                      {schoolInitials(s)}
                    </div>
                    <div>
                      <Link
                        href={s.abbreviation ? `/schools/${encodeURIComponent(s.abbreviation)}` : '#'}
                        className="text-sm font-bold text-slate-900 hover:underline"
                      >
                        {s.display_name}
                      </Link>
                      {(s.mascot || classificationLabel(s)) && (
                        <span className="text-[11px] text-slate-400 ml-2">{[s.mascot, classificationLabel(s)].filter(Boolean).join(' · ')}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{placers.length} placer{placers.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {placers.map(w => (
                    <div key={w.wrestler_id} className="flex items-center gap-2 px-4 py-2">
                      <span className="text-[10px] text-slate-400 w-8 shrink-0 text-right tabular-nums">{w.primary_weight}</span>
                      <Link
                        href={`/wrestler/${w.wrestler_id}`}
                        className="text-sm font-medium text-slate-800 hover:underline truncate flex-1"
                      >
                        {w.wrestler_name}
                      </Link>
                      <div className="flex items-center gap-1 shrink-0">
                        {placeBadge(w.state_placement)}
                        {!w.state_placement && placeBadge(w.regions_placement)}
                        {!w.state_placement && !w.regions_placement && placeBadge(w.districts_placement)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Followed Wrestlers ── */}
      {followedWrestlers.length > 0 && (
        <section className="bg-white border border-black rounded-none shadow-none overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Your Wrestlers</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {followedWrestlers.map(w => {
              const pls = wrestlerPlacements.get(w.id) ?? []
              const best = new Map<string, WrestlerPlacement>()
              for (const pl of pls) {
                const existing = best.get(pl.tournament_type)
                if (!existing || pl.place < existing.place) best.set(pl.tournament_type, pl)
              }
              const sortedPlacements = [...best.values()].sort((a, b) => {
                const order: Record<string, number> = { boys_state: 0, girls_state: 0, regions: 1, girls_regions: 1, districts: 2 }
                return (order[a.tournament_type] ?? 3) - (order[b.tournament_type] ?? 3)
              })
              const SUFFIX: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' }

              return (
                <div key={w.id} className="flex items-center gap-2 px-5 py-2.5">
                  <Link
                    href={`/wrestler/${w.id}`}
                    className="text-sm font-medium text-slate-800 hover:underline truncate flex-1"
                  >
                    {w.first_name} {w.last_name}
                  </Link>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {sortedPlacements.map(pl => (
                      <span
                        key={pl.tournament_type}
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          pl.place === 1 ? 'bg-amber-100 text-amber-800'
                          : pl.place <= 3 ? 'bg-slate-200 text-slate-700'
                          : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {TOURNEY_LABEL[pl.tournament_type] ?? pl.tournament_type} {pl.place}{SUFFIX[pl.place] ?? 'th'}
                      </span>
                    ))}
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      w.gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {w.gender === 'F' ? 'G' : 'B'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
