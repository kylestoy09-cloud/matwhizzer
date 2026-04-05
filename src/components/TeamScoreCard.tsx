'use client'

import { useState } from 'react'
import Link from 'next/link'

type TeamScoreRow = {
  school: string
  school_name: string | null
  school_id: number | null
  total_points: number
}

export function TeamScoreCard({
  rows,
}: {
  rows: TeamScoreRow[]
}) {
  const [visibleCount, setVisibleCount] = useState(10)
  const visible = rows.slice(0, visibleCount)
  const hasMore = rows.length > visibleCount

  return (
    <div className="bg-white rounded-none border border-black shadow-none overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Team Scoring</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.length === 0 && (
          <p className="px-4 py-3 text-sm text-slate-400">No data</p>
        )}
        {visible.map((r, i) => (
          <div key={r.school} className="flex items-center gap-2 px-4 py-2.5">
            <span className="text-xs text-slate-400 w-4 shrink-0 text-right">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <Link
                href={r.school_id ? `/schools/${r.school_id}` : '#'}
                className="text-sm font-medium text-slate-800 hover:underline truncate block"
              >
                {r.school_name || r.school}
              </Link>
            </div>
            <span className="text-sm font-semibold text-slate-700 shrink-0">{r.total_points} pts</span>
          </div>
        ))}
      </div>
      {(hasMore || visibleCount > 10) && (
        <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100">
          {hasMore && (
            <button
              onClick={() => setVisibleCount(c => c + 10)}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors underline"
            >
              Show 10 More
            </button>
          )}
          {visibleCount > 10 && (
            <button
              onClick={() => setVisibleCount(10)}
              className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors underline"
            >
              Show Less
            </button>
          )}
        </div>
      )}
    </div>
  )
}
