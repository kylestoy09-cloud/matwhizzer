'use client'

import { useState } from 'react'
import Link from 'next/link'

type TechMasterRow = {
  wrestler_id: string
  wrestler_name: string
  school: string | null
  school_name: string | null
  weight: number
  tech_fall_wins: number
  avg_tf_time_seconds: number | null
  fastest_tf_seconds: number | null
  avg_tf_time_display: string | null
  fastest_tf_display: string | null
}

function timeColor(seconds: number | null): string {
  if (seconds == null) return 'text-slate-500'
  if (seconds < 180) return 'text-emerald-600 font-semibold'
  if (seconds < 240) return 'text-slate-700'
  return 'text-slate-400'
}

export function TechnicalMasters({
  rows,
  limit = 10,
}: {
  rows: TechMasterRow[]
  limit?: number
}) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? rows : rows.slice(0, limit)
  const hasMore = rows.length > limit

  if (rows.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Technical Masters</h3>
        <p className="text-[10px] text-slate-400 mt-0.5">100% tech fall win rate · min. 2 wins</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase">
              <th className="px-3 py-2 text-left w-6">#</th>
              <th className="px-3 py-2 text-left">Wrestler</th>
              <th className="px-3 py-2 text-right w-10">Wt</th>
              <th className="px-3 py-2 text-right w-12">TFs</th>
              <th className="px-3 py-2 text-right w-16">Avg</th>
              <th className="px-3 py-2 text-right w-16">Best</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {visible.map((r, i) => (
              <tr key={r.wrestler_id} className="hover:bg-slate-50/60">
                <td className="px-3 py-2 text-slate-400 text-xs">{i + 1}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/wrestler/${r.wrestler_id}`}
                    className="font-medium text-slate-800 hover:underline"
                  >
                    {r.wrestler_name}
                  </Link>
                  <span className="ml-1.5 text-[10px] text-slate-400">
                    {r.school_name || r.school}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-slate-500 tabular-nums">{r.weight}</td>
                <td className="px-3 py-2 text-right font-semibold text-slate-700 tabular-nums">{r.tech_fall_wins}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${timeColor(r.avg_tf_time_seconds)}`}>
                  {r.avg_tf_time_display ?? '—'}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${timeColor(r.fastest_tf_seconds)}`}>
                  {r.fastest_tf_display ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-t border-slate-100 transition-colors"
        >
          {expanded ? `Show top ${limit}` : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  )
}
