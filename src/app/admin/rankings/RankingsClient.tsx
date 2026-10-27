'use client'

import { useState } from 'react'

type RunStatus = 'idle' | 'running' | 'auto-publishing' | 'done' | 'error'

type RunResult = {
  wrestlers_scored?: number
  bouts_processed?:  number
  duration_ms?:      number
  season?:           string
  auto_published?:   number
  error?:            string
}

export function RankingsClient({ gender }: { gender: 'M' | 'F' }) {
  const [status,    setStatus]    = useState<RunStatus>('idle')
  const [result,    setResult]    = useState<RunResult | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)

  async function runScoring() {
    setStatus('running')
    setResult(null)
    setStartedAt(Date.now())

    try {
      const res = await fetch('/api/admin/recalculate-hammer-scores', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender }),
      })
      const d = await res.json()
      if (!res.ok || d.error) {
        setResult({ error: d.error ?? `HTTP ${res.status}` })
        setStatus('error')
      } else {
        // Auto-publish conference/district/region rankings immediately after scoring
        setStatus('auto-publishing')
        let auto_published: number | undefined
        try {
          const apRes = await fetch('/api/admin/rankings/auto-publish', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gender: gender }),
          })
          const apD = await apRes.json()
          if (apRes.ok && !apD.error) auto_published = apD.published
        } catch { /* non-fatal */ }
        setResult({ ...d, auto_published })
        setStatus('done')
      }
    } catch (e) {
      setResult({ error: String(e) })
      setStatus('error')
    }
  }

  const elapsed = startedAt && status === 'running'
    ? Math.floor((Date.now() - startedAt) / 1000)
    : null

  return (
    <div className="border border-slate-200 rounded overflow-hidden mb-8">
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Hammer Score Calculation</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full-season replay for all NJ wrestlers in the season in progress. Writes to <code className="font-mono">wrestler_hammer_scores</code> staging table. Takes ~60–90 seconds.
          </p>
        </div>
        <button
          onClick={runScoring}
          disabled={status === 'running' || status === 'auto-publishing'}
          className="px-4 py-2 bg-slate-900 text-white text-sm rounded font-medium hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ml-4"
        >
          {status === 'running' ? 'Running…' : status === 'auto-publishing' ? 'Publishing…' : 'Run Scoring'}
        </button>
      </div>

      {(status === 'running' || status === 'auto-publishing') && (
        <div className="px-5 py-4 flex items-center gap-3">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
          <p className="text-sm text-slate-600">
            {status === 'auto-publishing'
              ? 'Auto-publishing conference, district, and region rankings…'
              : <>Scoring in progress{elapsed !== null ? ` — ${elapsed}s elapsed` : ''}{' '}(this may take up to 90 seconds)</>
            }
          </p>
        </div>
      )}

      {status === 'done' && result && (
        <div className="px-5 py-4 bg-green-50 border-t border-green-100">
          <p className="text-sm font-semibold text-green-800">Scoring complete{result.season ? ` — ${result.season} season` : ''}</p>
          <p className="text-sm text-green-700 mt-1">
            {result.wrestlers_scored != null && `${result.wrestlers_scored.toLocaleString()} wrestlers scored`}
            {result.bouts_processed  != null && ` · ${result.bouts_processed.toLocaleString()} bouts processed`}
            {result.duration_ms      != null && ` · ${(result.duration_ms / 1000).toFixed(1)}s`}
            {result.auto_published   != null && ` · ${result.auto_published} group rankings auto-published`}
          </p>
          <p className="text-xs text-green-600 mt-1">
            Results written to <code className="font-mono">wrestler_hammer_scores</code>. Use the Individual and Team workbenches below to seed rankings from these scores.
          </p>
        </div>
      )}

      {status === 'error' && result?.error && (
        <div className="px-5 py-4 bg-red-50 border-t border-red-100">
          <p className="text-sm font-semibold text-red-800">Scoring failed</p>
          <p className="text-xs text-red-700 mt-1 font-mono">{result.error}</p>
          <button
            onClick={() => { setStatus('idle'); setResult(null) }}
            className="mt-2 text-xs text-red-600 underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
