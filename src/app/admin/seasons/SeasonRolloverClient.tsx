'use client'

import { useState, useEffect } from 'react'

type PreviewRow = { id: string; name: string; from: string; to: string }
type GradRow    = { id: string; name: string }

type Preview = {
  advancing:  PreviewRow[]
  graduating: GradRow[]
  unchanged:  number
}

type Phase = 'idle' | 'loading' | 'preview' | 'confirming' | 'done' | 'error'

export function SeasonRolloverClient() {
  const [migrationPending, setMigrationPending] = useState<boolean | null>(null)
  const [phase,    setPhase]    = useState<Phase>('idle')
  const [preview,  setPreview]  = useState<Preview | null>(null)
  const [result,   setResult]   = useState<{ advanced: number; graduated: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showAll,  setShowAll]  = useState(false)

  useEffect(() => {
    fetch('/api/admin/season-rollover?check=1')
      .then(r => r.json())
      .then(d => setMigrationPending(d.migrationPending ?? false))
  }, [])

  const loadPreview = async () => {
    setPhase('loading')
    setErrorMsg(null)
    try {
      const r = await fetch('/api/admin/season-rollover')
      const d = await r.json()
      if (d.error) { setErrorMsg(d.error); setPhase('error'); return }
      setPreview(d.preview)
      setPhase('preview')
    } catch (e) {
      setErrorMsg(String(e))
      setPhase('error')
    }
  }

  const executeRollover = async () => {
    setPhase('confirming')
    setErrorMsg(null)
    try {
      const r = await fetch('/api/admin/season-rollover', { method: 'POST' })
      const d = await r.json()
      if (d.error) { setErrorMsg(d.error); setPhase('error'); return }
      setResult({ advanced: d.advanced, graduated: d.graduated })
      setPhase('done')
    } catch (e) {
      setErrorMsg(String(e))
      setPhase('error')
    }
  }

  if (migrationPending === null) return <p className="text-sm text-slate-400">Checking migration status…</p>

  if (migrationPending) {
    return (
      <div className="border border-amber-200 bg-amber-50 rounded px-4 py-3 text-sm text-amber-800">
        Apply <code className="font-mono text-xs">docs/migrations/20260824_roster_enrollment.sql</code> first to enable
        grade tracking and the rollover tool. This migration adds the <code className="font-mono text-xs">grade</code>,{' '}
        <code className="font-mono text-xs">is_active</code>, and other enrollment columns to the wrestlers table.
      </div>
    )
  }

  return (
    <div className="border border-slate-200 rounded overflow-hidden">
      <div className="bg-slate-50 px-5 py-4 border-b border-slate-200">
        <h2 className="text-base font-semibold text-slate-800">Roll Over Season</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Advances every wrestler with a confirmed grade by one year. Seniors are marked inactive (graduated).
          Wrestlers without a confirmed grade are left untouched.
        </p>
      </div>

      <div className="px-5 py-5">
        {phase === 'idle' && (
          <button
            onClick={loadPreview}
            className="px-4 py-2 bg-slate-900 text-white text-sm rounded font-medium"
          >
            Preview Rollover
          </button>
        )}

        {phase === 'loading' && (
          <p className="text-sm text-slate-400">Loading preview…</p>
        )}

        {phase === 'error' && (
          <div>
            <p className="text-sm text-red-600 mb-3">{errorMsg}</p>
            <button onClick={() => { setPhase('idle'); setErrorMsg(null) }} className="text-sm text-slate-500 underline">
              Try again
            </button>
          </div>
        )}

        {phase === 'preview' && preview && (
          <div className="space-y-5">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-green-200 bg-green-50 rounded px-4 py-3 text-center">
                <p className="text-2xl font-bold text-green-700">{preview.advancing.length}</p>
                <p className="text-xs text-green-600 mt-0.5">Grade Advance</p>
              </div>
              <div className="border border-amber-200 bg-amber-50 rounded px-4 py-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{preview.graduating.length}</p>
                <p className="text-xs text-amber-600 mt-0.5">Graduate (→ Inactive)</p>
              </div>
              <div className="border border-slate-200 bg-slate-50 rounded px-4 py-3 text-center">
                <p className="text-2xl font-bold text-slate-500">{preview.unchanged}</p>
                <p className="text-xs text-slate-400 mt-0.5">Left Unchanged (unknown grade)</p>
              </div>
            </div>

            {/* Advancing list */}
            {preview.advancing.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Advancing ({preview.advancing.length})</p>
                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-semibold text-slate-600">Name</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-slate-600">From</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-slate-600">To</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(showAll ? preview.advancing : preview.advancing.slice(0, 20)).map(r => (
                        <tr key={r.id}>
                          <td className="px-3 py-1.5">{r.name}</td>
                          <td className="px-3 py-1.5 text-slate-500">{r.from}</td>
                          <td className="px-3 py-1.5 text-green-600 font-medium">{r.to}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.advancing.length > 20 && (
                    <button onClick={() => setShowAll(v => !v)}
                      className="w-full py-2 text-xs text-slate-500 hover:bg-slate-50 border-t border-slate-200">
                      {showAll ? 'Show less' : `Show all ${preview.advancing.length}`}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Graduating list */}
            {preview.graduating.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Graduating — will be marked inactive ({preview.graduating.length})</p>
                <div className="border border-amber-200 rounded overflow-hidden">
                  <div className="divide-y divide-amber-100 max-h-48 overflow-y-auto">
                    {preview.graduating.map(r => (
                      <div key={r.id} className="px-3 py-1.5 text-xs">{r.name}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {preview.advancing.length === 0 && preview.graduating.length === 0 ? (
              <p className="text-sm text-slate-400">
                No wrestlers have a confirmed grade yet. Set grades first (via district import or wrestler profile edits) before running the rollover.
              </p>
            ) : (
              <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                <button
                  onClick={executeRollover}
                  className="px-5 py-2 bg-red-700 text-white text-sm rounded font-medium hover:bg-red-800"
                >
                  Confirm &amp; Execute Rollover
                </button>
                <button onClick={() => setPhase('idle')} className="text-sm text-slate-500 hover:text-slate-800">
                  Cancel
                </button>
                <p className="text-xs text-slate-400 ml-2">This cannot be undone. Run at the end of the season only.</p>
              </div>
            )}
          </div>
        )}

        {phase === 'confirming' && (
          <p className="text-sm text-slate-400">Executing rollover…</p>
        )}

        {phase === 'done' && result && (
          <div className="space-y-3">
            <div className="border border-green-200 bg-green-50 rounded px-4 py-4">
              <p className="text-sm font-semibold text-green-800">Rollover complete</p>
              <p className="text-sm text-green-700 mt-1">
                {result.advanced} wrestlers advanced · {result.graduated} graduated (marked inactive)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
