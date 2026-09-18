'use client'

import { useState } from 'react'
import type { MsWrestlerFlag, MsWrestlerOverride } from './msImportTypes'

function ordinal(n: number): string {
  const s = ['th','st','nd','rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function ConfidenceBadge({ confidence }: { confidence: MsWrestlerFlag['confidence'] }) {
  const styles: Record<string, string> = {
    exact: 'bg-green-100 text-green-700',
    high:  'bg-blue-100 text-blue-700',
    low:   'bg-amber-100 text-amber-700',
    none:  'bg-slate-100 text-slate-500',
  }
  const labels: Record<string, string> = { exact: 'Exact', high: 'High', low: 'Low', none: 'New' }
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${styles[confidence]}`}>
      {labels[confidence]}
    </span>
  )
}

type Props = {
  flag: MsWrestlerFlag
  override: MsWrestlerOverride | undefined
  onOverride: (key: string, o: MsWrestlerOverride | undefined) => void
  allWrestlers: { ms_wrestler_id: number; canonical_name: string }[]
}

export function MsWrestlerFlagCard({ flag, override, onOverride, allWrestlers }: Props) {
  const [mode, setMode] = useState<'default' | 'search' | 'edit'>(() => {
    if (flag.is_new) return 'edit'
    if (flag.confidence === 'exact' || flag.confidence === 'high') return 'default'
    return 'default'
  })

  const [canonicalName, setCanonicalName] = useState(flag.raw_names[0] ?? '')
  const [searchQuery, setSearchQuery] = useState('')

  const isResolved = !!override
  const resolvedLabel = override?.type === 'existing'
    ? `→ ${override.canonical_name}`
    : override?.type === 'create'
    ? `+ new: ${override.canonical_name}`
    : null

  const filteredWrestlers = searchQuery.trim()
    ? allWrestlers.filter(w => w.canonical_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : allWrestlers.slice(0, 20)

  const borderColor = isResolved
    ? 'border-green-200 bg-green-50'
    : flag.is_new
    ? 'border-blue-200 bg-blue-50'
    : flag.confidence === 'low'
    ? 'border-amber-200 bg-amber-50'
    : 'border-slate-200 bg-white'

  return (
    <div className={`border text-xs ${borderColor}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
        <span className="font-semibold text-slate-800">{flag.raw_names[0]}</span>
        {flag.raw_names.length > 1 && (
          <span className="text-slate-400 text-[10px]">also: {flag.raw_names.slice(1).join(', ')}</span>
        )}
        <span className="text-slate-400">{flag.weight_classes.map(w => `${w} lb`).join(', ')}</span>
        <ConfidenceBadge confidence={flag.confidence} />
        {isResolved && resolvedLabel && (
          <span className="text-green-700 font-medium">{resolvedLabel}</span>
        )}
        {isResolved && (
          <button
            onClick={() => { onOverride(flag.key, undefined); setMode(flag.is_new ? 'edit' : 'default') }}
            className="text-slate-400 hover:text-red-500 ml-auto"
          >✕</button>
        )}
      </div>

      {/* Body */}
      {!isResolved && (
        <>
          {/* Auto-matched (exact/high) — show match info + allow override */}
          {!flag.is_new && (flag.confidence === 'exact' || flag.confidence === 'high') && mode === 'default' && (
            <div className="flex items-center gap-2 px-3 pb-2 flex-wrap">
              <span className="text-slate-600">
                → <span className="font-medium">{flag.canonical_name}</span>
                {flag.last_weight && <span className="text-slate-400 ml-1">last seen {flag.last_weight} lb{flag.last_date ? ` · ${flag.last_date}` : ''}</span>}
              </span>
              <button
                onClick={() => onOverride(flag.key, { type: 'existing', ms_wrestler_id: flag.ms_wrestler_id!, canonical_name: flag.canonical_name! })}
                className="px-2 py-0.5 border border-green-400 text-green-700 hover:bg-green-100 transition-colors"
              >✓ Accept</button>
              <button onClick={() => setMode('search')} className="px-2 py-0.5 border border-slate-300 text-slate-600 hover:border-black transition-colors">
                Link different
              </button>
              <button onClick={() => { setMode('edit'); setCanonicalName(flag.raw_names[0]) }} className="px-2 py-0.5 border border-slate-300 text-slate-600 hover:border-black transition-colors">
                Create new
              </button>
            </div>
          )}

          {/* Low confidence — needs decision */}
          {!flag.is_new && flag.confidence === 'low' && mode === 'default' && (
            <div className="space-y-1.5 px-3 pb-2">
              <div className="text-slate-600">
                Possible match: <span className="font-medium">{flag.canonical_name}</span>
                {flag.last_weight && <span className="text-slate-400 ml-1">(last {flag.last_weight} lb{flag.last_date ? ` · ${flag.last_date}` : ''})</span>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => onOverride(flag.key, { type: 'existing', ms_wrestler_id: flag.ms_wrestler_id!, canonical_name: flag.canonical_name! })}
                  className="px-2 py-0.5 border border-green-400 text-green-700 hover:bg-green-100 transition-colors"
                >✓ Accept match</button>
                <button onClick={() => setMode('search')} className="px-2 py-0.5 border border-slate-300 text-slate-600 hover:border-black transition-colors">
                  Link different
                </button>
                <button onClick={() => { setMode('edit'); setCanonicalName(flag.raw_names[0]) }} className="px-2 py-0.5 border border-slate-300 text-slate-600 hover:border-black transition-colors">
                  Create new
                </button>
              </div>
              {flag.alternates.length > 0 && (
                <div className="text-[10px] text-slate-400">
                  Other candidates: {flag.alternates.map(a => `${a.canonical_name} (${a.score}%)`).join(' · ')}
                </div>
              )}
            </div>
          )}

          {/* New wrestler — canonical name form */}
          {(flag.is_new || mode === 'edit') && mode === 'edit' && (
            <div className="px-3 pb-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-slate-500 w-28 shrink-0">Canonical name</label>
                <input
                  type="text"
                  value={canonicalName}
                  onChange={e => setCanonicalName(e.target.value)}
                  className="border border-slate-300 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-black w-48"
                />
                <button
                  onClick={() => onOverride(flag.key, { type: 'create', canonical_name: canonicalName.trim() })}
                  disabled={!canonicalName.trim()}
                  className="px-3 py-0.5 bg-black text-white hover:bg-slate-800 transition-colors disabled:opacity-40"
                >✓ Confirm new</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">or</span>
                <button onClick={() => setMode('search')} className="text-blue-600 hover:underline">
                  link to existing →
                </button>
                {!flag.is_new && (
                  <button onClick={() => setMode('default')} className="text-slate-400 hover:text-red-500 ml-2">cancel</button>
                )}
              </div>
            </div>
          )}

          {/* Search mode */}
          {mode === 'search' && (
            <div className="px-3 pb-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search wrestler name…"
                  autoFocus
                  className="border border-slate-300 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-black w-56"
                />
                <button onClick={() => { setMode(flag.is_new ? 'edit' : 'default'); setSearchQuery('') }} className="text-slate-400 hover:text-slate-600">
                  cancel
                </button>
              </div>
              {filteredWrestlers.length === 0 ? (
                <p className="text-slate-400">No wrestlers match &ldquo;{searchQuery}&rdquo;</p>
              ) : (
                <div className="border border-slate-200 bg-white max-h-40 overflow-y-auto">
                  {filteredWrestlers.map(w => (
                    <button
                      key={w.ms_wrestler_id}
                      onClick={() => { onOverride(flag.key, { type: 'existing', ms_wrestler_id: w.ms_wrestler_id, canonical_name: w.canonical_name }); setMode('default'); setSearchQuery('') }}
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-0"
                    >
                      {w.canonical_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
