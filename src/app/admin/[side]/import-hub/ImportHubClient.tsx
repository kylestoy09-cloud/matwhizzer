'use client'

import { useState, useCallback } from 'react'
import { adminHref, sideOfGender } from '@/lib/admin-side'
import { useRouter } from 'next/navigation'
import { useSeasons } from '@/components/SeasonsProvider'
import { liveSeasonId } from '@/lib/seasons'
import { useAdminGender } from '@/components/admin/AdminGenderContext'

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

type DetectedType = 'tournament' | 'dual' | 'unknown'

export function ImportHubClient() {
  const router = useRouter()
  const { gender } = useAdminGender()
  const { seasons, label } = useSeasons()
  const defaultSeason = liveSeasonId(seasons, gender) ?? 0
  const [seasonId, setSeasonId] = useState<number>(defaultSeason)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [detected, setDetected] = useState<{ type: DetectedType; tournament_count: number; dual_count: number } | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSave = useCallback(async () => {
    if (!text.trim()) return
    setSaving(true)
    setSaveError(null)
    setDetected(null)
    try {
      const res = await fetch('/api/admin/detect-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, gender }),
      })
      const data = await res.json()
      if (data.error) { setSaveError(data.error); return }

      setDetected({ type: data.type, tournament_count: data.tournament_count, dual_count: data.dual_count })
    } catch (e) {
      setSaveError(String(e))
    } finally {
      setSaving(false)
    }
  }, [text, gender])

  function routeToImporter(type: 'tournament' | 'dual') {
    try {
      sessionStorage.setItem('mw_pending_import', JSON.stringify({ text, type, gender, seasonId }))
    } catch { /* storage full */ }
    router.push(adminHref(sideOfGender(gender), type === 'tournament' ? '/import-rtf' : '/import'))
  }

  return (
    <div className="space-y-4">
      {/* Season selector */}
      <div className="flex flex-wrap items-center gap-6 p-4 border-2 border-black bg-slate-50">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-900 shrink-0">Season:</span>
          <div className="flex border border-black overflow-hidden">
            {seasons.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setSeasonId(s.id)}
                className={`px-6 py-2 text-sm font-bold transition-colors ${i > 0 ? 'border-l border-black' : ''} ${seasonId === s.id ? 'bg-black text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <span className="text-xs text-slate-500">
          School matching will be restricted to {gender === 'M' ? 'boys' : 'girls'} schools in {label(seasonId) ?? seasonId}.
        </span>
      </div>

      {/* ── Import ─────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Paste tournament or dual meet data below. Click <strong>Detect</strong> to identify the format,
            then use the appropriate import button.
          </p>

          <textarea
            className="w-full h-72 text-xs font-mono border border-slate-300 p-3 focus:outline-none focus:ring-1 focus:ring-black resize-y placeholder-slate-300"
            placeholder={`Paste tournament or dual meet data here…\n\nTournament format:\n  Tournament Name - MM/DD/YYYY\n  1    School A     215.5\n  ...\n\nDual meet format:\n  School A vs. School B (MM/DD/YYYY)\n  ...`}
            value={text}
            onChange={e => { setText(e.target.value); setDetected(null) }}
          />

          {saveError && <p className="text-sm text-red-600">{saveError}</p>}

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSave}
              disabled={!text.trim() || saving}
              className="px-4 py-2 bg-black text-white text-sm font-medium disabled:opacity-40 hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              {saving ? <><Spinner /> Detecting…</> : 'Detect'}
            </button>

            <button
              onClick={() => routeToImporter('tournament')}
              disabled={!detected || detected.type !== 'tournament'}
              className="px-4 py-2 text-sm font-medium border border-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              Import Tournament
            </button>

            <button
              onClick={() => routeToImporter('dual')}
              disabled={!detected || detected.type !== 'dual'}
              className="px-4 py-2 text-sm font-medium border border-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              Import Dual
            </button>

            <span className="text-slate-300">|</span>

            {gender === 'F' && (
              <a
                href="/admin/girls/import-jamboree"
                className="px-4 py-2 text-sm font-medium border border-slate-400 text-slate-600 hover:border-black hover:text-black transition-colors"
              >
                Import Jamboree (Girls)
              </a>
            )}

            <a
              href="/admin/import-csv"
              className="px-4 py-2 text-sm font-medium border border-slate-400 text-slate-600 hover:border-black hover:text-black transition-colors"
            >
              Import CSV
            </a>
          </div>

          {detected && (
            <div className={`p-3 border text-sm ${
              detected.type === 'unknown'
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-green-300 bg-green-50 text-green-800'
            }`}>
              {detected.type === 'tournament' && (
                <>Detected <strong>tournament data</strong> — {detected.tournament_count} tournament{detected.tournament_count !== 1 ? 's' : ''} found. Click <strong>Import Tournament</strong> to continue.</>
              )}
              {detected.type === 'dual' && (
                <>Detected <strong>dual meet data</strong> — {detected.dual_count} meet{detected.dual_count !== 1 ? 's' : ''} found. Click <strong>Import Dual</strong> to continue.</>
              )}
              {detected.type === 'unknown' && (
                <>Format not recognized. Check that the data includes a valid tournament or dual meet header, then try again.</>
              )}
            </div>
          )}
        </div>
    </div>
  )
}
