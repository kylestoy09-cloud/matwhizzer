'use client'

import { useEffect, useState } from 'react'
import type { PastSeason } from '../PastSeasonsClient'

type Doc = { name: string; size: number | null; archivedAt: string | null; url: string; sourceUrl: string | null }

function titleFromFile(name: string) {
  return name.replace(/\.pdf$/, '').split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

export function NjsiaaTab({ season, gender }: { season: PastSeason; gender: 'M' | 'F' }) {
  const key = `${season.end_year}-${gender}`
  const [result, setResult] = useState<{ key: string; docs: Doc[]; error: string | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/past-seasons/documents?end_year=${season.end_year}&gender=${gender}`)
      .then(async r => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`)
        if (!cancelled) setResult({ key, docs: d.documents ?? [], error: null })
      })
      .catch(e => { if (!cancelled) setResult({ key, docs: [], error: e instanceof Error ? e.message : String(e) }) })
    return () => { cancelled = true }
  }, [key, season.end_year, gender])

  const loading = result?.key !== key
  const docs    = loading ? [] : result.docs
  const error   = loading ? null : result.error

  return (
    <div className="max-w-3xl">
      <p className="text-sm font-semibold text-slate-700 mb-1">NJSIAA Documents — {season.year_label}</p>
      <p className="text-xs text-slate-400 mb-4">Archived copies stored by Mat Whizzer. The NJSIAA link is kept for reference but may stop working.</p>

      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && docs.length === 0 && (
        <p className="text-sm text-slate-400">No documents archived for this season.</p>
      )}

      {docs.length > 0 && (
        <table className="w-full text-sm border border-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-1 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Document</th>
              <th className="px-3 py-1 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Size</th>
              <th className="px-3 py-1 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Archived</th>
              <th className="px-3 py-1 text-left text-xs font-bold uppercase tracking-wide text-slate-500">NJSIAA Original</th>
            </tr>
          </thead>
          <tbody>
            {docs.map(d => (
              <tr key={d.name} className="border-t border-slate-100">
                <td className="px-3 py-1">
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {titleFromFile(d.name)}
                  </a>
                </td>
                <td className="px-3 py-1 text-right tabular-nums text-slate-500">
                  {d.size != null ? `${Math.round(d.size / 1024)} KB` : '—'}
                </td>
                <td className="px-3 py-1 text-slate-500">
                  {d.archivedAt ? new Date(d.archivedAt).toLocaleDateString() : '—'}
                </td>
                <td className="px-3 py-1">
                  {d.sourceUrl
                    ? <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:underline">njsiaa.org</a>
                    : <span className="text-slate-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
