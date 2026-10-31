'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { RefTournament } from './page'

function formatDate(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function TournamentChecklistClient({
  tournaments,
  totalInDb,
  totalMissing,
}: {
  tournaments: RefTournament[]
  totalInDb: number
  totalMissing: number
}) {
  const [filter, setFilter] = useState<'all' | 'missing' | 'found'>('all')

  const visible = tournaments.filter(t => {
    if (filter === 'missing') return !t.dbId
    if (filter === 'found') return !!t.dbId
    return true
  })

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-xs text-slate-500 hover:text-slate-900">← Admin</Link>
        <span className="text-slate-300">/</span>
        {/* season-literal-ok: pinned historical record */}
        <h1 className="text-xl font-bold text-slate-900">Tournament Checklist — Boys 2025-26 record</h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-black p-4">
          <p className="text-2xl font-bold text-slate-900">{tournaments.length}</p>
          <p className="text-xs text-slate-500 mt-1">Expected events</p>
        </div>
        <div className="bg-white border border-black p-4">
          <p className="text-2xl font-bold text-emerald-600">{totalInDb}</p>
          <p className="text-xs text-slate-500 mt-1">In database</p>
        </div>
        <div className="bg-white border border-black p-4">
          <p className="text-2xl font-bold text-red-600">{totalMissing}</p>
          <p className="text-xs text-slate-500 mt-1">Missing / not imported</p>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2 mb-6">
        {(['all', 'missing', 'found'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
              filter === f
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-900'
            }`}
          >
            {f === 'all' ? `All (${tournaments.length})` : f === 'missing' ? `Missing (${totalMissing})` : `Found (${totalInDb})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-black">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-20">Date</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-8">St</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Reference Name</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">DB Match</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-20">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((t, i) => (
              <tr key={i} className={`${!t.dbId ? 'bg-red-50' : ''}`}>
                <td className="px-4 py-2.5 text-slate-500 tabular-nums whitespace-nowrap">
                  {formatDate(t.date)}
                </td>
                <td className="px-4 py-2.5 text-slate-400 font-mono">{t.state}</td>
                <td className="px-4 py-2.5 text-slate-800">{t.name}</td>
                <td className="px-4 py-2.5 text-slate-500 italic">
                  {t.dbName ?? <span className="text-slate-300 not-italic">—</span>}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {t.dbId
                    ? <span className="inline-block bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5">✓ In DB</span>
                    : <span className="inline-block bg-red-100 text-red-700 font-semibold px-2 py-0.5">✗ Missing</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visible.length === 0 && (
          <div className="px-6 py-10 text-center text-sm text-slate-400">No tournaments match this filter.</div>
        )}
      </div>
    </div>
  )
}
