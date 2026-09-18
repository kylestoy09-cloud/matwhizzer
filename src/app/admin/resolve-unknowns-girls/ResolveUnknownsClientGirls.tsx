'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { UnknownMatchGirls } from './page'
import { useAdminGender } from '@/components/admin/AdminGenderContext'

const RESULT_COLORS: Record<string, string> = {
  'Fall':    'bg-red-100 text-red-700',
  'MD':      'bg-orange-100 text-orange-700',
  'Dec':     'bg-blue-100 text-blue-700',
  'Forfeit': 'bg-slate-100 text-slate-500',
  'TF':      'bg-yellow-100 text-yellow-700',
  'DFF':     'bg-purple-100 text-purple-700',
}

function ResultBadge({ type, detail }: { type: string | null; detail: string | null }) {
  const label = [type, detail].filter(Boolean).join(' ')
  if (!label) return <span className="text-slate-400 text-xs">—</span>
  const cls = RESULT_COLORS[type ?? ''] ?? 'bg-slate-100 text-slate-600'
  return <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${cls}`}>{label}</span>
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${parseInt(m)}/${parseInt(d)}/${y.slice(2)}`
}

export function ResolveUnknownsClientGirls({ initialMatches }: { initialMatches: UnknownMatchGirls[] }) {
  const { gender } = useAdminGender()
  const [matches, setMatches] = useState(initialMatches)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [error,   setError]   = useState<string | null>(null)

  const forfeited = matches.filter(m => m.result_type === 'Forfeit').length
  const remaining = matches.length - forfeited

  async function markForfeit(match: UnknownMatchGirls) {
    if (!match.opponent_wrestler_id) return
    setPending(prev => new Set(prev).add(match.id))
    setError(null)
    try {
      const res = await fetch('/api/admin/update-dual-meet-match', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:                match.id,
          gender:            'F',
          result_type:       'Forfeit',
          result_detail:     null,
          fall_time_seconds: null,
          winner_id:         match.opponent_wrestler_id,
        }),
      })
      if (!res.ok) { setError((await res.json()).error ?? 'Update failed'); return }
      setMatches(prev => prev.map(m =>
        m.id === match.id ? { ...m, result_type: 'Forfeit', result_detail: null, winner_id: match.opponent_wrestler_id } : m
      ))
    } catch (e) {
      setError(String(e))
    } finally {
      setPending(prev => { const n = new Set(prev); n.delete(match.id); return n })
    }
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Resolve Unknowns — Girls</h1>
        <p className="text-sm text-slate-500 mt-1">
          {remaining} unresolved · {forfeited} marked forfeit · {matches.length} total
        </p>
        {gender === 'M' && (
          <p className="mt-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
            Your admin toggle is set to <strong>Boys</strong>. This page shows girls matches only.{' '}
            <Link href="/admin/resolve-unknowns" className="underline font-semibold">Switch to Boys unknowns →</Link>
          </p>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">No Unknown girls matches found.</div>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-3 py-2 font-semibold text-slate-500 text-xs">Date</th>
                <th className="px-3 py-2 font-semibold text-slate-500 text-xs w-14">Wt</th>
                <th className="px-3 py-2 font-semibold text-slate-500 text-xs">Unknown School</th>
                <th className="px-3 py-2 font-semibold text-slate-500 text-xs">Opponent School</th>
                <th className="px-3 py-2 font-semibold text-slate-500 text-xs">Opponent</th>
                <th className="px-3 py-2 font-semibold text-slate-500 text-xs">Result</th>
                <th className="px-3 py-2 font-semibold text-slate-500 text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {matches.map(m => {
                const isForfeit = m.result_type === 'Forfeit'
                const isPending = pending.has(m.id)
                return (
                  <tr key={m.id} className={isForfeit ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50'}>
                    <td className="px-3 py-2 text-xs tabular-nums text-slate-500 whitespace-nowrap">{fmtDate(m.meet_date)}</td>
                    <td className="px-3 py-2 font-mono tabular-nums text-slate-700">{m.weight_class}</td>
                    <td className="px-3 py-2 text-slate-700">{m.unknown_school}</td>
                    <td className="px-3 py-2 text-slate-700">{m.opponent_school}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {m.opponent_name ?? <span className="text-slate-400 italic">unknown</span>}
                    </td>
                    <td className="px-3 py-2">
                      <ResultBadge type={m.result_type} detail={m.result_detail} />
                    </td>
                    <td className="px-3 py-2">
                      {isForfeit ? (
                        <span className="text-xs text-slate-400">Forfeit ✓</span>
                      ) : (
                        <button
                          onClick={() => markForfeit(m)}
                          disabled={isPending || !m.opponent_wrestler_id}
                          className="text-xs px-3 py-1 rounded border border-amber-400 text-amber-700 hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {isPending ? '…' : 'Mark Forfeit'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
