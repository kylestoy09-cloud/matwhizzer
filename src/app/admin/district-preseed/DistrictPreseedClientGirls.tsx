'use client'

const GENDER = 'F' as const

import { useState, useEffect, useCallback } from 'react'
import type { PreSeedRow } from '@/lib/districtPreseed'

const WEIGHTS = [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235]

// Tier color coding
function tierColor(label: string): string {
  if (label.includes('States'))  return 'text-amber-700 bg-amber-50'
  if (label.includes('Regions')) return 'text-blue-700 bg-blue-50'
  if (label.includes('Districts') || label === '4th Districts') return 'text-slate-600 bg-slate-100'
  return 'text-slate-400 bg-slate-50'
}

function TierBadge({ label }: { label: string }) {
  return (
    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${tierColor(label)}`}>
      {label}
    </span>
  )
}

export function DistrictPreseedClientGirls({ season}: { season: string}) {
  const weights = WEIGHTS
  const [weight, setWeight] = useState<number>(weights[0])
  const [rows, setRows] = useState<PreSeedRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Reset weight when gender changes
  useEffect(() => {
    const newWeights = WEIGHTS
    setWeight(newWeights[0])
    setRows([])
  }, [])

  const load = useCallback(async (wt: number) => {
    setLoading(true)
    setError(null)
    setExpanded(null)
    try {
      const res = await fetch(
        `/api/admin/district-preseed?gender=${GENDER}&season=${encodeURIComponent(season)}&weight=${wt}`
      )
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      const { rows: r } = await res.json()
      setRows(r ?? [])
    } catch (e: any) {
      setError(e.message ?? 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [ season])

  useEffect(() => { load(weight) }, [weight, load])

  return (
    <div className="space-y-4">
      {/* Weight class selector */}
      <div className="flex flex-wrap gap-1.5">
        {weights.map(wt => (
          <button
            key={wt}
            onClick={() => setWeight(wt)}
            className={`px-3 py-1 text-sm rounded border transition-colors ${
              weight === wt
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
            }`}
          >
            {wt}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400" /> State tier
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400" /> Region tier
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-slate-300" /> District / unranked
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-sm text-slate-500 py-8 text-center">Computing pre-seed scores…</div>
      )}

      {/* Table */}
      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="py-2 pr-3 text-left w-8">#</th>
                <th className="py-2 pr-3 text-left">Wrestler</th>
                <th className="py-2 pr-3 text-left hidden sm:table-cell">School</th>
                <th className="py-2 pr-3 text-right">Pre-Seed</th>
                <th className="py-2 pr-3 text-right">Prestige</th>
                <th className="py-2 pr-3 text-right">Caliber</th>
                <th className="py-2 pr-3 text-left hidden md:table-cell">Prior Year</th>
                <th className="py-2 text-center hidden md:table-cell">Matches</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => (
                <>
                  <tr
                    key={row.wrestler_id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => setExpanded(expanded === row.wrestler_id ? null : row.wrestler_id)}
                  >
                    <td className="py-2 pr-3 text-slate-400 tabular-nums font-medium">{idx + 1}</td>
                    <td className="py-2 pr-3 font-medium text-slate-900">
                      {row.first_name} {row.last_name}
                      {/* School shown inline on mobile */}
                      <span className="block sm:hidden text-xs text-slate-500">{row.school_name}</span>
                    </td>
                    <td className="py-2 pr-3 text-slate-600 hidden sm:table-cell">{row.school_name}</td>
                    <td className="py-2 pr-3 text-right font-bold text-slate-900 tabular-nums">
                      {row.preseed_total.toFixed(1)}
                    </td>
                    <td className="py-2 pr-3 text-right text-slate-700 tabular-nums">{row.prestige}</td>
                    <td className="py-2 pr-3 text-right text-slate-700 tabular-nums">
                      {row.caliber >= 0 ? '+' : ''}{row.caliber.toFixed(1)}
                    </td>
                    <td className="py-2 pr-3 hidden md:table-cell">
                      <TierBadge label={row.tier_label} />
                    </td>
                    <td className="py-2 text-center text-slate-500 hidden md:table-cell tabular-nums">
                      {row.match_count}
                    </td>
                  </tr>
                  {expanded === row.wrestler_id && (
                    <tr key={`${row.wrestler_id}-exp`} className="bg-slate-50">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="space-y-2">
                          {/* Mobile tier display */}
                          <div className="md:hidden flex items-center gap-2 text-xs text-slate-500">
                            Prior year: <TierBadge label={row.tier_label} />
                            <span>· {row.match_count} matches counted</span>
                          </div>
                          {/* Top matches breakdown */}
                          {row.top_matches.length > 0 ? (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 mb-1.5">Top matches (by caliber)</p>
                              <div className="space-y-1">
                                {row.top_matches.map((m, mi) => (
                                  <div key={mi} className="flex items-center gap-3 text-xs">
                                    <span className={`font-semibold w-12 ${m.isWin ? 'text-green-700' : 'text-red-600'}`}>
                                      {m.isWin ? (m.isFall ? 'Win (F)' : 'Win') : 'Loss'}
                                    </span>
                                    <span className="text-slate-700">{m.oppName}</span>
                                    <TierBadge label={m.oppTierLabel} />
                                    <span className={`ml-auto tabular-nums font-medium ${m.earned >= 0 ? 'text-slate-800' : 'text-red-500'}`}>
                                      {m.earned >= 0 ? '+' : ''}{m.earned.toFixed(1)} pts
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400">No matches recorded this season.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-slate-500 py-8 text-center">
          No wrestlers found at {weight} lbs for {season}.
        </p>
      )}

      <p className="text-[11px] text-slate-400">
        Pre-seed = Prestige Points (prior year advancement) + Caliber Points (best 20 current-season matches).
        Click a row to expand match breakdown. Tie-breaking (head-to-head, common opponents, coaches vote) is done at the seeding meeting.
      </p>
    </div>
  )
}
