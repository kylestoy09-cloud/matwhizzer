'use client'

import { useState, useCallback } from 'react'
import type { SchoolFlag, SchoolOverride } from './types'

function normalizeForDisplay(raw: string): string {
  if (raw === raw.toUpperCase() && /[A-Z]{2}/.test(raw)) {
    return raw.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  }
  return raw
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

function ConfBadge({ c }: { c: string }) {
  const cls =
    c === 'exact' ? 'bg-green-100 text-green-800' :
    c === 'alias' ? 'bg-teal-100 text-teal-800' :
    c === 'high'  ? 'bg-blue-100 text-blue-800' :
    c === 'low'   ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
  return <span className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded ${cls}`}>{c}</span>
}

export function SchoolFlagCard({
  flag,
  override,
  onOverride,
}: {
  flag: SchoolFlag
  override: SchoolOverride | undefined
  onOverride: (raw: string, o: SchoolOverride | undefined) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: number; display_name: string }[]>([])
  const [searching, setSearching] = useState(false)

  const [oosQuery, setOosQuery] = useState('')
  const [oosResults, setOosResults] = useState<{ id: number; display_name: string }[]>([])
  const [oosSearching, setOosSearching] = useState(false)

  const [editingNewOos, setEditingNewOos] = useState(false)
  const [newOosName, setNewOosName] = useState('')

  const search = useCallback((q: string) => {
    setQuery(q)
    if (!q.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/admin/search-schools?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setResults(data.schools ?? [])
      } finally { setSearching(false) }
    }, 250)
    return () => clearTimeout(timer)
  }, [])

  const searchOos = useCallback((q: string) => {
    setOosQuery(q)
    if (!q.trim()) { setOosResults([]); return }
    const timer = setTimeout(async () => {
      setOosSearching(true)
      try {
        const res = await fetch(`/api/admin/search-schools?q=${encodeURIComponent(q)}&oos=true`)
        const data = await res.json()
        setOosResults(data.schools ?? [])
      } finally { setOosSearching(false) }
    }, 250)
    return () => clearTimeout(timer)
  }, [])

  const njAlts  = flag.alternates.filter(a => !a.is_oos)
  const oosAlts = flag.alternates.filter(a => a.is_oos)

  const resolved =
    override?.type === 'nj'  ? `→ ${override.display_name}` :
    override?.type === 'oos' ? (override.display_name ? `→ OOS: ${override.display_name}` : '→ New OOS school') :
    override?.type === 'skip' ? '→ Not a school (skipped)' :
    null

  return (
    <div className="border border-slate-200 rounded p-3 text-sm bg-white">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className="font-medium text-slate-800">{flag.raw}</span>
          <span className="text-slate-400 ml-2 text-xs">{flag.bout_count} bout{flag.bout_count !== 1 ? 's' : ''}</span>
        </div>
        <ConfBadge c={flag.confidence} />
      </div>

      {/* NJ alternates */}
      {njAlts.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {njAlts.map(a => (
            <button
              key={a.school_id}
              onClick={() => onOverride(flag.raw, { type: 'nj', school_id: a.school_id, display_name: a.display_name })}
              className="text-xs px-2 py-0.5 border border-slate-300 hover:border-black hover:bg-slate-50 transition-colors"
            >
              {a.display_name} <span className="text-slate-400">({(a.score * 100).toFixed(0)}%)</span>
            </button>
          ))}
        </div>
      )}

      {/* OOS alternates — existing OOS schools to link to */}
      {oosAlts.length > 0 && (
        <div className="mb-2">
          <p className="text-xs text-slate-400 mb-1">Existing OOS schools:</p>
          <div className="flex flex-wrap gap-1.5">
            {oosAlts.map(a => (
              <button
                key={a.school_id}
                onClick={() => onOverride(flag.raw, { type: 'oos', school_id: a.school_id, display_name: a.display_name })}
                className="text-xs px-2 py-0.5 border border-amber-300 text-amber-800 hover:border-amber-500 hover:bg-amber-50 transition-colors"
              >
                OOS: {a.display_name} <span className="text-amber-500">({(a.score * 100).toFixed(0)}%)</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!resolved && (
        <div className="space-y-1.5">
          {/* NJ search row */}
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-32">
              <input
                type="text"
                placeholder="Search NJ schools…"
                value={query}
                onChange={e => search(e.target.value)}
                className="w-full text-xs border border-slate-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-black"
              />
              {searching && <span className="absolute right-2 top-1.5"><Spinner /></span>}
              {results.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 border border-slate-300 bg-white shadow-sm">
                  {results.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { onOverride(flag.raw, { type: 'nj', school_id: s.id, display_name: s.display_name }); setResults([]) }}
                      className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50"
                    >
                      {s.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => onOverride(flag.raw, { type: 'skip' })}
              className="text-xs px-2 py-1 border border-slate-300 hover:border-black text-slate-500 hover:text-black transition-colors whitespace-nowrap"
              title="Mark as a nickname or non-school value — bouts involving this entry will import without a school link"
            >
              Not a school
            </button>
          </div>
          {/* OOS search row */}
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-32">
              <input
                type="text"
                placeholder="Search existing OOS schools…"
                value={oosQuery}
                onChange={e => searchOos(e.target.value)}
                className="w-full text-xs border border-amber-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              {oosSearching && <span className="absolute right-2 top-1.5"><Spinner /></span>}
              {oosResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 border border-amber-200 bg-white shadow-sm">
                  {oosResults.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { onOverride(flag.raw, { type: 'oos', school_id: s.id, display_name: s.display_name }); setOosResults([]) }}
                      className="block w-full text-left px-3 py-1.5 text-xs hover:bg-amber-50 text-amber-800"
                    >
                      {s.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => { setNewOosName(normalizeForDisplay(flag.raw)); setEditingNewOos(true) }}
              className="text-xs px-2 py-1 border border-amber-300 text-amber-700 hover:border-amber-500 hover:bg-amber-50 transition-colors whitespace-nowrap"
            >
              New OOS school
            </button>
          </div>

          {/* Inline name editor for new OOS school */}
          {editingNewOos && (
            <div className="flex gap-2 items-center mt-1">
              <input
                type="text"
                value={newOosName}
                onChange={e => setNewOosName(e.target.value)}
                autoFocus
                placeholder="Display name…"
                className="flex-1 text-xs border border-amber-400 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                onClick={() => {
                  const name = newOosName.trim()
                  if (!name) return
                  onOverride(flag.raw, { type: 'oos', display_name: name })
                  setEditingNewOos(false)
                }}
                disabled={!newOosName.trim()}
                className="text-xs px-2 py-1 bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                Create
              </button>
              <button
                onClick={() => setEditingNewOos(false)}
                className="text-xs text-slate-400 hover:text-slate-700"
              >
                cancel
              </button>
            </div>
          )}
        </div>
      )}

      {resolved && (
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${override?.type === 'oos' ? 'text-amber-700' : 'text-green-700'}`}>
            {resolved}
          </span>
          <button onClick={() => onOverride(flag.raw, undefined)} className="text-xs text-slate-400 hover:text-slate-700 ml-2">undo</button>
        </div>
      )}
    </div>
  )
}
