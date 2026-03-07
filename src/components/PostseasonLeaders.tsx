'use client'

import { useState } from 'react'
import Link from 'next/link'

type TeamScoreRow = {
  school: string
  school_name: string | null
  district_points: number
  region_points: number
  state_points: number
  total_points: number
}

export function PostseasonLeaders({
  rows,
  schoolBase,
  accentColor = 'slate',
}: {
  rows: TeamScoreRow[]
  schoolBase: string
  accentColor?: 'slate' | 'rose'
}) {
  const [visible, setVisible] = useState(10)
  const shown = rows.slice(0, visible)
  const hasMore = visible < rows.length

  const titleColor = accentColor === 'rose' ? 'text-rose-900' : 'text-slate-900'

  return (
    <section>
      <h2 className={`text-lg font-bold ${titleColor} mb-3`}>Postseason Point Leaders</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-8">#</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">School</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">Dist</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">Reg</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">State</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">Total</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={r.school} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                <td className="px-3 py-2 text-xs text-slate-400">{i + 1}</td>
                <td className="px-3 py-2">
                  <Link href={`${schoolBase}/${encodeURIComponent(r.school)}`} className="font-medium text-slate-800 hover:underline">
                    {r.school_name || r.school}
                  </Link>
                </td>
                <td className="px-3 py-2 text-right text-slate-500">{r.district_points}</td>
                <td className="px-3 py-2 text-right text-slate-500">{r.region_points}</td>
                <td className="px-3 py-2 text-right text-slate-500">{r.state_points}</td>
                <td className="px-3 py-2 text-right font-semibold text-slate-700">{r.total_points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <button
          onClick={() => setVisible(v => Math.min(v + 10, rows.length))}
          className="mt-3 w-full py-2 text-sm font-medium text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Show more ({Math.min(10, rows.length - visible)} more)
        </button>
      )}
    </section>
  )
}
