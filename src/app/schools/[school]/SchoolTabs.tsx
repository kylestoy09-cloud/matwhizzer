'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { WrestlerAvatar } from '@/components/WrestlerAvatar'
import { StatsTable } from '@/components/StatsTable'
import { supabase } from '@/lib/supabase'
import { SEASONS } from '@/lib/seasons'
import { SeasonSelector } from '@/components/SeasonSelector'

type WrestlerRow = {
  wrestler_id: string
  wrestler_name: string
  primary_weight: number
  districts_placement: string | null
  districts_short: string | null
  regions_placement: string | null
  regions_short: string | null
  state_placement: string | null
}

type BreakdownRow = { tournament_type: string; total_points: number; win_count: number }

type LeaderRow = {
  wrestler_id: string; wrestler_name: string; primary_weight: number
  win_count: number; fall_count: number; fastest_fall_sec: number | null
  bonus_pct: number; district_points: number; region_points: number
  state_points: number; total_points: number
}

type DualMeet = {
  id: string
  team1_school_id: number
  team2_school_id: number
  meet_date: string
  team1_score: number | null
  team2_score: number | null
  status: string
  team1: { display_name: string } | null
  team2: { display_name: string } | null
}

type TournamentEvent = {
  id: number
  name: string
  start_date: string
  end_date: string | null
}

function placeBadgeClass(p: string | null): string {
  switch (p) {
    case '1st': return 'bg-amber-100 text-amber-800'
    case '2nd': return 'bg-slate-200 text-slate-700'
    case '3rd': return 'bg-orange-100 text-orange-800'
    case '4th': case '5th': case '6th': return 'bg-emerald-50 text-emerald-700'
    default: return 'bg-slate-50 text-slate-500'
  }
}

function PlaceBadge({ placement, short }: { placement: string | null; short?: string | null }) {
  if (!placement) return <span className="text-slate-300 text-xs">—</span>
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${placeBadgeClass(placement)}`}>{placement}</span>
      {short && <span className="text-slate-400 text-xs">{short}</span>}
    </span>
  )
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'roster', label: 'Roster' },
  { id: 'postseason', label: 'Postseason' },
  { id: 'leaders', label: 'Leaders' },
  { id: 'scores', label: 'Team Scores' },
  { id: 'schedule', label: 'Schedule' },
]

type TeamScoreData = { district_points: number; region_points: number; state_points: number; total_points: number } | null

type SchoolData = {
  display_name: string
  primary_color: string | null
  secondary_color: string | null
  logo_url: string | null
}

export function SchoolTabs({
  school, gender, activeTab, primaryColor,
  schoolData,
  wrestlers, breakdown, leaders, teamScore,
  totalPts, totalWins, stateMedalists, tourneyLabel,
}: {
  school: string; gender: string; activeTab: string; primaryColor: string
  schoolData: SchoolData
  wrestlers: WrestlerRow[]; breakdown: BreakdownRow[]; leaders: LeaderRow[]
  teamScore: TeamScoreData
  totalPts: number; totalWins: number; stateMedalists: number
  tourneyLabel: Record<string, string>
}) {
  const router = useRouter()

  function tabUrl(tabId: string) {
    const params = new URLSearchParams()
    if (gender === 'girls') params.set('gender', 'girls')
    if (tabId !== 'overview') params.set('tab', tabId)
    const qs = params.toString()
    return `/schools/${school}${qs ? `?${qs}` : ''}`
  }

  const stateChamps    = wrestlers.filter(r => r.state_placement === '1st').sort((a, b) => a.primary_weight - b.primary_weight)
  const regionChamps   = wrestlers.filter(r => r.regions_placement === '1st').sort((a, b) => a.primary_weight - b.primary_weight)
  const districtChamps = wrestlers.filter(r => r.districts_placement === '1st').sort((a, b) => a.primary_weight - b.primary_weight)

  const byWeight = new Map<number, WrestlerRow[]>()
  for (const w of wrestlers) {
    const wt = w.primary_weight ?? 0
    if (!byWeight.has(wt)) byWeight.set(wt, [])
    byWeight.get(wt)!.push(w)
  }
  const weights = [...byWeight.keys()].sort((a, b) => a - b)

  // ── Schedule tab state ──────────────────────────────────────────────────────
  const schoolIdNum = parseInt(school, 10)
  const genderCode  = gender === 'girls' ? 'F' : 'M'
  const defaultSeason = Number(
    Object.entries(SEASONS).find(([, v]) => v.isCurrent)?.[0] ?? 2
  )
  const [scheduleSeason, setScheduleSeason] = useState(defaultSeason)
  const [meets,          setMeets]          = useState<DualMeet[]>([])
  const [tourEvents,     setTourEvents]     = useState<TournamentEvent[]>([])
  const [meetsLoading,   setMeetsLoading]   = useState(false)

  useEffect(() => {
    if (activeTab !== 'schedule') return
    let cancelled = false
    setMeetsLoading(true)
    ;(async () => {
      const [meetsRes, boutsRes] = await Promise.all([
        supabase
          .from('dual_meets')
          .select(`
            id, team1_school_id, team2_school_id, meet_date,
            team1_score, team2_score, status,
            team1:schools!team1_school_id(display_name),
            team2:schools!team2_school_id(display_name)
          `)
          .or(`team1_school_id.eq.${schoolIdNum},team2_school_id.eq.${schoolIdNum}`)
          .eq('season_id', scheduleSeason)
          .eq('gender', genderCode)
          .order('meet_date', { ascending: true }),
        supabase
          .from('tournament_bouts')
          .select('in_season_tournament_id')
          .or(`wrestler1_school_id.eq.${schoolIdNum},wrestler2_school_id.eq.${schoolIdNum}`),
      ])

      if (cancelled) return
      if (!meetsRes.error) setMeets((meetsRes.data ?? []) as unknown as DualMeet[])

      const tidSet = new Set(
        (boutsRes.data ?? []).map((b: { in_season_tournament_id: string }) => b.in_season_tournament_id),
      )
      if (tidSet.size > 0) {
        const seasonLabel = SEASONS[scheduleSeason]?.label ?? ''
        const { data: tours } = await supabase
          .from('in_season_tournaments')
          .select('id, name, start_date, end_date')
          .in('id', [...tidSet])
          .eq('season', seasonLabel)
        if (!cancelled) setTourEvents((tours ?? []) as TournamentEvent[])
      } else {
        if (!cancelled) setTourEvents([])
      }

      if (!cancelled) setMeetsLoading(false)
    })()
    return () => { cancelled = true }
  }, [activeTab, scheduleSeason, schoolIdNum, genderCode])

  return (
    <>
      {/* Tab nav */}
      <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => router.push(tabUrl(t.id), { scroll: false })}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === t.id
                ? 'text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
            style={activeTab === t.id ? { borderBottomColor: primaryColor } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ── */}
      {activeTab === 'overview' && (
        <div className="space-y-8">

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-black rounded-none p-4 text-center">
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{Math.round(totalPts * 10) / 10}</p>
              <p className="text-xs text-slate-500 mt-0.5">Team Points</p>
            </div>
            <div className="bg-white border border-black rounded-none p-4 text-center">
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{totalWins}</p>
              <p className="text-xs text-slate-500 mt-0.5">Total Wins</p>
            </div>
            <div className="bg-white border border-black rounded-none p-4 text-center">
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{stateMedalists}</p>
              <p className="text-xs text-slate-500 mt-0.5">State Medalists</p>
            </div>
            <div className="bg-white border border-black rounded-none p-4 text-center">
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{wrestlers.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Wrestlers</p>
            </div>
          </div>

          {/* Points breakdown */}
          {teamScore && (
            <section>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Points Breakdown</h3>
              <StatsTable
                columns={[
                  { key: 'tournament', label: 'Tournament', numeric: false },
                  { key: 'pts',        label: 'Points',     align: 'right' },
                  { key: 'wins',       label: 'Wins',       align: 'right' },
                ]}
                rows={[
                  { label: 'Districts', pts: teamScore.district_points, type: gender === 'girls' ? 'girls_districts' : 'boys_districts' },
                  { label: 'Regions',   pts: teamScore.region_points,   type: gender === 'girls' ? 'girls_regions'   : 'regions'        },
                  { label: 'State',     pts: teamScore.state_points,    type: gender === 'girls' ? 'girls_state'     : 'boys_state'     },
                ].filter(r => r.pts > 0).map(r => ({
                  tournament: r.label,
                  pts:  r.pts,
                  wins: breakdown.find(b => b.tournament_type === r.type)?.win_count ?? '—',
                }))}
                footer={{ tournament: 'Total', pts: teamScore.total_points, wins: totalWins }}
              />
            </section>
          )}

          {/* Champions */}
          {(stateChamps.length > 0 || regionChamps.length > 0 || districtChamps.length > 0) && (
            <section>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Champions</h3>
              <div className="border border-black rounded-none overflow-hidden shadow-none bg-white">
                {[
                  { label: 'State',    list: stateChamps    },
                  { label: 'Region',   list: regionChamps   },
                  { label: 'District', list: districtChamps },
                ].filter(s => s.list.length > 0).map((sec, i) => (
                  <div key={sec.label} className={i > 0 ? 'border-t border-slate-200' : ''}>
                    <div className="px-4 py-1.5 bg-amber-50 text-xs font-semibold text-amber-700 uppercase tracking-wide">{sec.label}</div>
                    {sec.list.map(w => (
                      <div key={w.wrestler_id} className="flex items-center gap-3 px-4 py-2 border-t border-slate-50">
                        <span className="text-xs tabular-nums text-slate-400 w-10 text-right shrink-0">{w.primary_weight}</span>
                        <Link href={`/wrestler/${w.wrestler_id}`} className="font-medium text-sm text-slate-800 hover:underline">{w.wrestler_name}</Link>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Top wrestlers preview */}
          {wrestlers.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-800">Top Wrestlers</h3>
                <button onClick={() => router.push(tabUrl('roster'), { scroll: false })} className="text-xs text-blue-600 hover:underline">View full roster →</button>
              </div>
              <div className="bg-white border border-black rounded-none shadow-none overflow-hidden divide-y divide-slate-50">
                {wrestlers.filter(w => w.state_placement || w.regions_placement || w.districts_placement).slice(0, 10).map(w => (
                  <div key={w.wrestler_id} className="flex items-center gap-3 px-4 py-2">
                    <WrestlerAvatar school={schoolData} weight={w.primary_weight} size="sm" />
                    <Link href={`/wrestler/${w.wrestler_id}`} className="text-sm font-medium text-slate-800 hover:underline truncate flex-1">{w.wrestler_name}</Link>
                    <div className="flex items-center gap-1 shrink-0">
                      {w.state_placement && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${placeBadgeClass(w.state_placement)}`}>{w.state_placement}</span>}
                      {!w.state_placement && w.regions_placement && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${placeBadgeClass(w.regions_placement)}`}>{w.regions_placement}</span>}
                      {!w.state_placement && !w.regions_placement && w.districts_placement && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${placeBadgeClass(w.districts_placement)}`}>{w.districts_placement}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── Tab: Roster ── */}
      {activeTab === 'roster' && (
        <StatsTable
          columns={[
            { key: 'wt',        label: 'Wt',       align: 'right', numeric: false },
            { key: 'name',      label: 'Wrestler',                  numeric: false },
            { key: 'districts', label: 'Districts',                 numeric: false, className: 'hidden sm:table-cell' },
            { key: 'regions',   label: 'Regions',                   numeric: false, className: 'hidden sm:table-cell' },
            { key: 'state',     label: 'State',                     numeric: false },
          ]}
          rows={weights.flatMap(wt =>
            byWeight.get(wt)!.map((w, i) => ({
              wt: i === 0 ? String(wt) : '',
              name: (
                <Link href={`/wrestler/${w.wrestler_id}`} className="flex items-center gap-2.5 group">
                  <WrestlerAvatar school={schoolData} weight={w.primary_weight} size="sm" />
                  <span className="group-hover:underline">{w.wrestler_name}</span>
                </Link>
              ),
              districts: <PlaceBadge placement={w.districts_placement} short={w.districts_short} />,
              regions:   <PlaceBadge placement={w.regions_placement}   short={w.regions_short}   />,
              state:     <PlaceBadge placement={w.state_placement} />,
            }))
          )}
        />
      )}

      {/* ── Tab: Postseason ── */}
      {activeTab === 'postseason' && (
        <div className="space-y-6">
          {wrestlers.filter(w => w.state_placement || w.regions_placement || w.districts_placement).length === 0 ? (
            <p className="text-sm text-slate-500">No postseason results found for the current season.</p>
          ) : (
            ['State', 'Regions', 'Districts'].map(level => {
              const filtered = wrestlers.filter(w => {
                if (level === 'State')   return w.state_placement
                if (level === 'Regions') return w.regions_placement
                return w.districts_placement
              }).sort((a, b) => {
                const getPlace = (w: WrestlerRow) => {
                  const p = level === 'State' ? w.state_placement : level === 'Regions' ? w.regions_placement : w.districts_placement
                  return parseInt(p ?? '99')
                }
                return getPlace(a) - getPlace(b) || a.primary_weight - b.primary_weight
              })
              if (filtered.length === 0) return null
              return (
                <section key={level}>
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">{level}</h3>
                  <div className="bg-white border border-black rounded-none shadow-none overflow-hidden divide-y divide-slate-50">
                    {filtered.map(w => (
                      <div key={`${level}-${w.wrestler_id}`} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="text-xs tabular-nums text-slate-400 w-10 text-right shrink-0">{w.primary_weight}</span>
                        <Link href={`/wrestler/${w.wrestler_id}`} className="text-sm font-medium text-slate-800 hover:underline truncate flex-1">{w.wrestler_name}</Link>
                        <PlaceBadge placement={level === 'State' ? w.state_placement : level === 'Regions' ? w.regions_placement : w.districts_placement} />
                      </div>
                    ))}
                  </div>
                </section>
              )
            })
          )}
        </div>
      )}

      {/* ── Tab: Leaders ── */}
      {activeTab === 'leaders' && (
        leaders.length === 0 ? (
          <p className="text-sm text-slate-500 p-4">No leaderboard data available.</p>
        ) : (
          <StatsTable
            columns={[
              { key: 'wt',       label: 'Wt',       align: 'right' },
              { key: 'name',     label: 'Wrestler',              numeric: false },
              { key: 'wins',     label: 'Wins'     },
              { key: 'falls',    label: 'Falls'    },
              { key: 'fastPin',  label: 'Fast Pin' },
              { key: 'bonusPct', label: 'Bonus%',               numeric: false },
              { key: 'dist',     label: 'Dist'     },
              { key: 'reg',      label: 'Reg'      },
              { key: 'state',    label: 'State'    },
              { key: 'total',    label: 'Total'    },
            ]}
            rows={leaders.map((r, i) => {
              const fastPin = r.fastest_fall_sec != null
                ? `${Math.floor(r.fastest_fall_sec / 60)}:${String(r.fastest_fall_sec % 60).padStart(2, '0')}`
                : '—'
              return {
                wt:       r.primary_weight,
                name: (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-300 w-4 text-right shrink-0">{i + 1}</span>
                    <Link href={`/wrestler/${r.wrestler_id}`} className="hover:underline truncate">{r.wrestler_name}</Link>
                  </div>
                ),
                wins:     r.win_count,
                falls:    r.fall_count,
                fastPin,
                bonusPct: `${r.bonus_pct}%`,
                dist:     r.district_points || '—',
                reg:      r.region_points   || '—',
                state:    r.state_points    || '—',
                total:    r.total_points,
              }
            })}
            footer={{
              wt:       '',
              name:     '',
              wins:     '',
              falls:    '',
              fastPin:  '',
              bonusPct: '',
              dist:     leaders.reduce((s, r) => s + Number(r.district_points), 0) || '—',
              reg:      leaders.reduce((s, r) => s + Number(r.region_points),   0) || '—',
              state:    leaders.reduce((s, r) => s + Number(r.state_points),    0) || '—',
              total:    leaders.reduce((s, r) => s + Number(r.total_points),    0),
            }}
          />
        )
      )}

      {/* ── Tab: Team Scores ── */}
      {activeTab === 'scores' && (
        <div>
          {!teamScore && breakdown.length === 0 ? (
            <p className="text-sm text-slate-500">No team score data available.</p>
          ) : (
            <div className="space-y-6">
              {teamScore && (
                <StatsTable
                  columns={[
                    { key: 'tournament', label: 'Tournament', numeric: false },
                    { key: 'pts',        label: 'Points',     align: 'right' },
                  ]}
                  rows={[
                    { tournament: 'Districts', pts: teamScore.district_points },
                    { tournament: 'Regions',   pts: teamScore.region_points   },
                    { tournament: 'State',     pts: teamScore.state_points    },
                  ]}
                  footer={{ tournament: 'Total', pts: teamScore.total_points }}
                />
              )}

              {breakdown.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Win Breakdown</h3>
                  <StatsTable
                    columns={[
                      { key: 'tournament', label: 'Tournament', numeric: false },
                      { key: 'wins',       label: 'Wins',       align: 'right' },
                    ]}
                    rows={breakdown.map(r => ({
                      tournament: tourneyLabel[r.tournament_type] ?? r.tournament_type,
                      wins:       r.win_count,
                    }))}
                    footer={{ tournament: 'Total', wins: totalWins }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Schedule ── */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Schedule</h3>
            <SeasonSelector
              seasons={Object.keys(SEASONS).map(Number)}
              currentSeasonId={scheduleSeason}
              onChange={setScheduleSeason}
            />
          </div>

          {meetsLoading ? (
            <div className="bg-white border border-black rounded-none p-8 text-center">
              <p className="text-sm text-slate-400">Loading...</p>
            </div>
          ) : meets.length === 0 && tourEvents.length === 0 ? (
            <div className="bg-white border border-black rounded-none p-8 text-center">
              <p className="text-sm text-slate-500">No schedule results for this season.</p>
            </div>
          ) : (() => {
            type ScheduleItem =
              | { kind: 'meet';       date: string; meet:  DualMeet       }
              | { kind: 'tournament'; date: string; event: TournamentEvent }

            const items: ScheduleItem[] = [
              ...meets.map(m      => ({ kind: 'meet'       as const, date: m.meet_date,   meet:  m })),
              ...tourEvents.map(t => ({ kind: 'tournament' as const, date: t.start_date,  event: t })),
            ].sort((a, b) => a.date.localeCompare(b.date))

            return (
              <StatsTable
                columns={[
                  { key: 'date',     label: 'Date',             numeric: false },
                  { key: 'ha',       label: 'H/A',              numeric: false },
                  { key: 'opponent', label: 'Opponent / Event', numeric: false },
                  { key: 'score',    label: 'Score',  align: 'right', numeric: false },
                  { key: 'result',   label: 'Result',            numeric: false },
                  { key: 'link',     label: '',       align: 'right', numeric: false },
                ]}
                rows={items.map(item => {
                  if (item.kind === 'tournament') {
                    const dateStr = new Date(item.date + 'T12:00:00').toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })
                    return {
                      date:     dateStr,
                      ha:       null,
                      opponent: (
                        <Link href={`/tournaments/${item.event.id}`} className="font-medium hover:underline">
                          {item.event.name}
                        </Link>
                      ),
                      score:  '—',
                      result: (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          Tournament
                        </span>
                      ),
                      link: (
                        <Link href={`/tournaments/${item.event.id}`} className="text-xs text-slate-400 hover:text-slate-700 hover:underline whitespace-nowrap">
                          Results →
                        </Link>
                      ),
                    }
                  }

                  const meet         = item.meet
                  const isHome       = meet.team1_school_id === schoolIdNum
                  const opponentId   = isHome ? meet.team2_school_id : meet.team1_school_id
                  const opponentName = isHome ? meet.team2?.display_name : meet.team1?.display_name
                  const myScore      = isHome ? meet.team1_score : meet.team2_score
                  const theirScore   = isHome ? meet.team2_score : meet.team1_score
                  const hasScore     = myScore !== null && theirScore !== null
                  const result       = hasScore
                    ? myScore! > theirScore! ? 'W' : myScore! < theirScore! ? 'L' : 'T'
                    : null
                  const dateStr = new Date(meet.meet_date + 'T12:00:00').toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric',
                  })

                  return {
                    date: dateStr,
                    ha: (
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        isHome ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isHome ? 'H' : 'A'}
                      </span>
                    ),
                    opponent: (
                      <Link href={`/schools/${opponentId}`} className="font-medium hover:underline">
                        {opponentName ?? '—'}
                      </Link>
                    ),
                    score: hasScore ? `${myScore}–${theirScore}` : '—',
                    result: result ? (
                      <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                        result === 'W' ? 'bg-emerald-100 text-emerald-800'
                          : result === 'L' ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {result}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    ),
                    link: (
                      <Link href={`/meets/${meet.id}`} className="text-xs text-slate-400 hover:text-slate-700 hover:underline whitespace-nowrap">
                        Details →
                      </Link>
                    ),
                  }
                })}
              />
            )
          })()}
        </div>
      )}
    </>
  )
}
