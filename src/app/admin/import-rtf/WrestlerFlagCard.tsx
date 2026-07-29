'use client'

import { useState, useCallback, useEffect } from 'react'
import type { WrestlerFlag, WrestlerOverride } from './types'

function splitName(raw: string): { first_name: string; last_name: string } {
  const parts = raw.trim().split(/\s+/)
  if (parts.length === 1) return { first_name: raw, last_name: '' }
  return { first_name: parts.slice(0, -1).join(' '), last_name: parts[parts.length - 1] }
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

type SearchResult = { id: string; display_name: string }

type Props = {
  flag: WrestlerFlag
  override: WrestlerOverride | undefined
  onOverride: (key: string, o: WrestlerOverride | undefined) => void
}

export function WrestlerFlagCard({ flag, override, onOverride }: Props) {
  const defaultNames = splitName(flag.raw_name)
  const [mode, setMode] = useState<'default' | 'edit' | 'confirmed' | 'search'>(() => {
    if (override?.type === 'create') return 'confirmed'
    if (override?.type === 'skip' || override?.type === 'existing' || override?.type === 'accept') return 'default'
    return flag.is_new ? 'edit' : 'default'
  })
  const [firstName, setFirstName] = useState(
    override?.type === 'create' ? override.first_name : defaultNames.first_name,
  )
  const [lastName, setLastName] = useState(
    override?.type === 'create' ? override.last_name : defaultNames.last_name,
  )
  const [query, setQuery] = useState('')
  const [roster, setRoster] = useState<SearchResult[]>([])
  const [rosterLoading, setRosterLoading] = useState(false)

  // Emit create override whenever name fields change (new wrestler mode)
  useEffect(() => {
    if (mode !== 'edit') return
    onOverride(flag.key, { type: 'create', first_name: firstName, last_name: lastName })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName, lastName, mode])

  // Pre-load roster when entering search mode
  const loadRoster = useCallback(async () => {
    if (roster.length > 0) return  // already loaded
    setRosterLoading(true)
    try {
      const res = await fetch(`/api/admin/search-wrestlers?school_id=${flag.school_id}&gender=M`)
      const data = await res.json()
      setRoster(data.wrestlers ?? [])
    } catch { setRoster([]) }
    finally { setRosterLoading(false) }
  }, [flag.school_id, roster.length])

  useEffect(() => {
    if (mode === 'search') loadRoster()
  }, [mode, loadRoster])

  // Filter roster locally as user types
  const filteredRoster = query.trim()
    ? roster.filter(w => w.display_name.toLowerCase().includes(query.toLowerCase()))
    : roster

  function pickExisting(w: SearchResult) {
    onOverride(flag.key, { type: 'existing', wrestler_id: w.id, display_name: w.display_name })
    setQuery('')
    setMode('default')
  }

  function clearOverride() {
    onOverride(flag.key, undefined)
    setMode(flag.is_new ? 'edit' : 'default')
    setFirstName(defaultNames.first_name)
    setLastName(defaultNames.last_name)
    setQuery('')
  }

  function confirmCreate() {
    onOverride(flag.key, { type: 'create', first_name: firstName, last_name: lastName })
    setMode('confirmed')
  }

  const isSkipped = override?.type === 'skip'
  const isConfirmedCreate = override?.type === 'create' && mode === 'confirmed'
  const isResolved = override?.type === 'existing' || override?.type === 'accept' || isConfirmedCreate
  const borderColor = isSkipped
    ? 'border-slate-300 bg-slate-100'
    : isResolved
    ? 'border-green-300 bg-green-50'
    : flag.is_new
    ? 'border-blue-200 bg-blue-50'
    : 'border-amber-200 bg-amber-50'

  return (
    <div className={`border text-xs ${borderColor}`}>
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-2 gap-2 flex-wrap">
        <div className={`flex items-center gap-2 flex-wrap ${isSkipped ? 'opacity-40 line-through' : ''}`}>
          <span className="font-semibold text-slate-800">{flag.raw_name}</span>
          <span className="text-slate-400">{flag.school_raw}</span>
          <span className="text-slate-400">{flag.weight_class} lb</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isSkipped && (
            <>
              <span className="text-slate-500">OOS — will not be imported</span>
              <button onClick={clearOverride} className="text-slate-400 hover:text-red-500 ml-1">✕</button>
            </>
          )}
          {!isSkipped && override?.type === 'existing' && (
            <>
              <span className="text-green-700 font-medium">→ {override.display_name}</span>
              <button onClick={clearOverride} className="text-slate-400 hover:text-red-500 ml-1">✕</button>
            </>
          )}
          {!isSkipped && override?.type === 'accept' && (
            <>
              <span className="text-green-700 font-medium">✓ accepted — {flag.display_name}</span>
              <button onClick={clearOverride} className="text-slate-400 hover:text-red-500 ml-1">✕</button>
            </>
          )}
          {!isSkipped && isConfirmedCreate && override?.type === 'create' && (
            <>
              <span className="text-green-700 font-medium">✓ new — {override.first_name} {override.last_name}</span>
              <button onClick={() => setMode('edit')} className="text-slate-400 hover:text-slate-600 ml-1 text-xs">edit</button>
            </>
          )}
          {!isSkipped && override?.type === 'create' && mode !== 'confirmed' && (
            <span className="text-blue-600">● new — needs confirmation</span>
          )}
          {!override && flag.is_new && (
            <span className="text-blue-600">● new</span>
          )}
          {!override && !flag.is_new && (
            <span className="text-amber-700">⚠ low — {flag.display_name ?? '—'}</span>
          )}
          {/* Skip/OOS button — hidden for OOS school wrestlers (they're already OOS) */}
          {!isSkipped && !flag.is_oos && (
            <button
              onClick={() => { onOverride(flag.key, { type: 'skip' }); setMode('default') }}
              className="ml-2 px-2 py-0.5 border border-slate-300 text-slate-500 hover:border-red-400 hover:text-red-600 transition-colors"
              title="Mark as out-of-state — will not be imported"
            >
              OOS
            </button>
          )}
        </div>
      </div>

      {/* Body — hidden when skipped */}
      {!isSkipped && (
        <>
          {/* Low-confidence action bar */}
          {!flag.is_new && !override && mode === 'default' && (
            <div className="flex items-center gap-2 px-3 pb-2">
              <button
                onClick={() => onOverride(flag.key, { type: 'accept' })}
                className="px-2 py-0.5 border border-green-400 text-green-700 hover:bg-green-100 transition-colors"
              >
                ✓ Accept match
              </button>
              <button
                onClick={() => setMode('search')}
                className="px-2 py-0.5 border border-slate-300 text-slate-600 hover:border-black transition-colors"
              >
                Link different
              </button>
              <button
                onClick={() => { setMode('edit'); setFirstName(defaultNames.first_name); setLastName(defaultNames.last_name) }}
                className="px-2 py-0.5 border border-slate-300 text-slate-600 hover:border-black transition-colors"
              >
                Create new
              </button>
            </div>
          )}

          {/* Edit mode */}
          {mode === 'edit' && override?.type !== 'existing' && (
            <div className="px-3 pb-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-slate-500 w-10 shrink-0">First</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="border border-slate-300 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-black w-36"
                />
                <label className="text-slate-500 w-8 shrink-0">Last</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="border border-slate-300 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-black w-36"
                />
                <button
                  onClick={confirmCreate}
                  disabled={!firstName.trim() && !lastName.trim()}
                  className="px-3 py-0.5 bg-black text-white hover:bg-slate-800 transition-colors disabled:opacity-40"
                >
                  ✓ Confirm
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">or</span>
                <button
                  onClick={() => setMode('search')}
                  className="text-blue-600 hover:underline"
                >
                  link to existing wrestler →
                </button>
                {!flag.is_new && (
                  <button onClick={clearOverride} className="text-slate-400 hover:text-red-500 ml-2">cancel</button>
                )}
              </div>
            </div>
          )}

          {/* Search mode — pre-loaded roster with local filter */}
          {mode === 'search' && (
            <div className="px-3 pb-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Filter by name…"
                  className="border border-slate-300 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-black w-56"
                  autoFocus
                />
                {rosterLoading && <Spinner />}
                <button onClick={() => { setMode(flag.is_new ? 'edit' : 'default'); setQuery('') }} className="text-slate-400 hover:text-slate-600">cancel</button>
              </div>
              {!rosterLoading && roster.length === 0 && (
                <p className="text-slate-400">No wrestlers on file for this school</p>
              )}
              {!rosterLoading && roster.length > 0 && (
                <div className="border border-slate-200 bg-white shadow-sm max-h-48 overflow-y-auto">
                  {filteredRoster.length > 0 ? filteredRoster.map(w => (
                    <button
                      key={w.id}
                      onClick={() => pickExisting(w)}
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-0"
                    >
                      {w.display_name}
                    </button>
                  )) : (
                    <p className="px-3 py-2 text-slate-400">No matches for &ldquo;{query}&rdquo;</p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
