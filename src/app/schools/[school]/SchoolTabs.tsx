'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { WrestlerAvatar } from '@/components/WrestlerAvatar'

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

  // Champions
  const stateChamps = wrestlers.filter(r => r.state_placement === '1st').sort((a, b) => a.primary_weight - b.primary_weight)
  const regionChamps = wrestlers.filter(r => r.regions_placement === '1st').sort((a, b) => a.primary_weight - b.primary_weight)
  const districtChamps = wrestlers.filter(r => r.districts_placement === '1st').sort((a, b) => a.primary_weight - b.primary_weight)

  // Group wrestlers by weight for roster
  const byWeight = new Map<number, WrestlerRow[]>()
  for (const w of wrestlers) {
    const wt = w.primary_weight ?? 0
    if (!byWeight.has(wt)) byWeight.set(wt, [])
    byWeight.get(wt)!.push(w)
  }
  const weights = [...byWeight.keys()].sort((a, b) => a - b)

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

          {/* Points breakdown — use precomputed team scores */}
          {teamScore && (
            <section>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Points Breakdown</h3>
              <div className="inline-block border border-black rounded-none overflow-hidden shadow-none bg-white">
                <table className="text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-5 py-2 font-medium text-slate-500 w-36">Tournament</th>
                      <th className="text-right px-5 py-2 font-medium text-slate-500 w-24">Points</th>
                      <th className="text-right px-5 py-2 font-medium text-slate-500 w-20">Wins</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { label: 'Districts', pts: teamScore.district_points, type: gender === 'girls' ? 'girls_districts' : 'boys_districts' },
                      { label: 'Regions', pts: teamScore.region_points, type: gender === 'girls' ? 'girls_regions' : 'regions' },
                      { label: 'State', pts: teamScore.state_points, type: gender === 'girls' ? 'girls_state' : 'boys_state' },
                    ].filter(r => r.pts > 0).map(r => (
                      <tr key={r.label}>
                        <td className="px-5 py-2 text-slate-700">{r.label}</td>
                        <td className="px-5 py-2 text-right tabular-nums font-semibold text-slate-800">{r.pts}</td>
                        <td className="px-5 py-2 text-right tabular-nums text-slate-500">
                          {breakdown.find(b => b.tournament_type === r.type)?.win_count ?? '—'}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td className="px-5 py-2 font-bold text-slate-800">Total</td>
                      <td className="px-5 py-2 text-right tabular-nums font-bold text-slate-900">{teamScore.total_points}</td>
                      <td className="px-5 py-2 text-right tabular-nums font-semibold text-slate-600">{totalWins}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Champions */}
          {(stateChamps.length > 0 || regionChamps.length > 0 || districtChamps.length > 0) && (
            <section>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Champions</h3>
              <div className="border border-black rounded-none overflow-hidden shadow-none bg-white">
                {[
                  { label: 'State', list: stateChamps },
                  { label: 'Region', list: regionChamps },
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
        <div className="border border-black rounded-none overflow-x-auto shadow-none bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-right px-4 py-2.5 font-medium text-slate-500 w-16">Wt</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-500">Wrestler</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-500 hidden sm:table-cell">Districts</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-500 hidden sm:table-cell">Regions</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-500">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {weights.map(wt =>
                byWeight.get(wt)!.map((w, i) => (
                  <tr key={w.wrestler_id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-500 font-mono text-xs">{i === 0 ? `${wt} lb` : ''}</td>
                    <td className="px-4 py-2.5">
                      <Link href={`/wrestler/${w.wrestler_id}`} className="flex items-center gap-2.5 group">
                        <WrestlerAvatar school={schoolData} weight={w.primary_weight} size="sm" />
                        <span className="font-medium text-slate-800 group-hover:underline">{w.wrestler_name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell"><PlaceBadge placement={w.districts_placement} short={w.districts_short} /></td>
                    <td className="px-4 py-2.5 hidden sm:table-cell"><PlaceBadge placement={w.regions_placement} short={w.regions_short} /></td>
                    <td className="px-4 py-2.5"><PlaceBadge placement={w.state_placement} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tab: Postseason ── */}
      {activeTab === 'postseason' && (
        <div className="space-y-6">
          {wrestlers.filter(w => w.state_placement || w.regions_placement || w.districts_placement).length === 0 ? (
            <p className="text-sm text-slate-500">No postseason results found for the current season.</p>
          ) : (
            ['State', 'Regions', 'Districts'].map(level => {
              const filtered = wrestlers.filter(w => {
                if (level === 'State') return w.state_placement
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
        <div className="border border-black rounded-none overflow-x-auto shadow-none bg-white">
          {leaders.length === 0 ? (
            <p className="text-sm text-slate-500 p-4">No leaderboard data available.</p>
          ) : (
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right px-4 py-2.5 font-medium text-slate-500 w-14">Wt</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-500">Wrestler</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-500 w-14">Wins</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-500 w-14">Falls</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-500 w-20">Fast Pin</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-500 w-16">Bonus%</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-500 w-14">Dist</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-500 w-14">Reg</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-500 w-14">State</th>
                  <th className="text-right px-4 py-2.5 font-medium text-slate-500 w-14">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaders.map((r, i) => {
                  const fastPin = r.fastest_fall_sec != null
                    ? `${Math.floor(r.fastest_fall_sec / 60)}:${String(r.fastest_fall_sec % 60).padStart(2, '0')}`
                    : '—'
                  return (
                    <tr key={r.wrestler_id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-400 text-xs">{r.primary_weight}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-300 w-4 text-right shrink-0">{i + 1}</span>
                          <Link href={`/wrestler/${r.wrestler_id}`} className="font-medium text-slate-800 hover:underline truncate">{r.wrestler_name}</Link>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{r.win_count}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{r.fall_count}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{fastPin}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{r.bonus_pct}%</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{r.district_points || '—'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{r.region_points || '—'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{r.state_points || '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-slate-800">{r.total_points}</td>
                    </tr>
                  )
                })}
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="px-4 py-2.5" colSpan={6}></td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-slate-800">{leaders.reduce((s, r) => s + Number(r.district_points), 0) || '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-slate-800">{leaders.reduce((s, r) => s + Number(r.region_points), 0) || '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-slate-800">{leaders.reduce((s, r) => s + Number(r.state_points), 0) || '—'}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-bold text-slate-900">{leaders.reduce((s, r) => s + Number(r.total_points), 0)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Tab: Team Scores ── */}
      {activeTab === 'scores' && (
        <div>
          {!teamScore && breakdown.length === 0 ? (
            <p className="text-sm text-slate-500">No team score data available.</p>
          ) : (
            <div className="space-y-6">
              {/* Authoritative team scores from top_postseason_team_scores */}
              {teamScore && (
                <div className="inline-block border border-black rounded-none overflow-hidden shadow-none bg-white">
                  <table className="text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-5 py-2.5 font-medium text-slate-500 w-36">Tournament</th>
                        <th className="text-right px-5 py-2.5 font-medium text-slate-500 w-24">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="hover:bg-slate-50">
                        <td className="px-5 py-2.5 text-slate-700 font-medium">Districts</td>
                        <td className="px-5 py-2.5 text-right tabular-nums font-semibold text-slate-800">{teamScore.district_points}</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="px-5 py-2.5 text-slate-700 font-medium">Regions</td>
                        <td className="px-5 py-2.5 text-right tabular-nums font-semibold text-slate-800">{teamScore.region_points}</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="px-5 py-2.5 text-slate-700 font-medium">State</td>
                        <td className="px-5 py-2.5 text-right tabular-nums font-semibold text-slate-800">{teamScore.state_points}</td>
                      </tr>
                      <tr className="bg-slate-50 border-t-2 border-slate-200">
                        <td className="px-5 py-2.5 font-bold text-slate-800">Total</td>
                        <td className="px-5 py-2.5 text-right tabular-nums font-bold text-slate-900">{teamScore.total_points}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Win breakdown from school_points_breakdown */}
              {breakdown.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Win Breakdown</h3>
                  <div className="inline-block border border-black rounded-none overflow-hidden shadow-none bg-white">
                    <table className="text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left px-5 py-2.5 font-medium text-slate-500 w-36">Tournament</th>
                          <th className="text-right px-5 py-2.5 font-medium text-slate-500 w-20">Wins</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {breakdown.map(r => (
                          <tr key={r.tournament_type} className="hover:bg-slate-50">
                            <td className="px-5 py-2.5 text-slate-700 font-medium">{tourneyLabel[r.tournament_type] ?? r.tournament_type}</td>
                            <td className="px-5 py-2.5 text-right tabular-nums text-slate-700">{r.win_count}</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 border-t-2 border-slate-200">
                          <td className="px-5 py-2.5 font-bold text-slate-800">Total</td>
                          <td className="px-5 py-2.5 text-right tabular-nums font-bold text-slate-900">{totalWins}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Schedule ── */}
      {activeTab === 'schedule' && (
        <div className="bg-white border border-black rounded-none shadow-none p-8 text-center">
          <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: primaryColor + '15' }}>
            <svg className="w-6 h-6" style={{ color: primaryColor }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-700">Live match scoring coming in a future update</p>
          <p className="text-xs text-slate-400 mt-1">Dual meet schedules and results will appear here</p>
        </div>
      )}
    </>
  )
}
