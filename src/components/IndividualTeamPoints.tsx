'use client'

import { useState } from 'react'
import Link from 'next/link'

type TeamPtsRow = {
  wrestler_id: string
  wrestler_name: string
  school: string | null
  school_name: string | null
  weight: number
  team_points: number
}

export function IndividualTeamPoints({ rows }: { rows: TeamPtsRow[] }) {
  const [visibleCount, setVisibleCount] = useState(10)
  const visible = rows.slice(0, visibleCount)
  const hasMore = visibleCount < rows.length

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Individual Team Points</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.length === 0 && (
          <p className="px-4 py-3 text-sm text-slate-400">No data</p>
        )}
        {visible.map((r, i) => (
          <div key={`${r.wrestler_id}-${i}`} className="flex items-center gap-2 px-4 py-2.5">
            <span className="text-xs text-slate-400 w-4 shrink-0 text-right">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <Link
                href={`/wrestler/${r.wrestler_id}`}
                className="text-sm font-medium text-slate-800 hover:underline truncate block"
              >
                {r.wrestler_name}
              </Link>
              <div className="text-[11px] text-slate-400 truncate">
                {r.school_name || r.school || '\u2014'} · {r.weight} lb
              </div>
            </div>
            <span className="text-sm font-semibold text-slate-700 shrink-0">{r.team_points} pts</span>
          </div>
        ))}
      </div>
      {(hasMore || visibleCount > 10) && (
        <div className="flex border-t border-slate-100">
          {hasMore && (
            <button
              onClick={() => setVisibleCount(c => Math.min(c + 10, rows.length))}
              className="flex-1 px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Show 10 More
            </button>
          )}
          {visibleCount > 10 && (
            <button
              onClick={() => setVisibleCount(10)}
              className="flex-1 px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Show Less
            </button>
          )}
        </div>
      )}
    </div>
  )
}
