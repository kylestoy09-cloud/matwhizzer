'use client'

import { useState, useEffect } from 'react'

type Combo = {
  ranking_type: string
  scope: string
  scope_id: string | null
  weight_class: number | null
  snapshot_count: number
  latest_published_at: string
}

type ResultRow = { rank: number; wrestler_id?: string; school_id?: number; label: string; score: number; movement?: string | null }
type Snapshot  = { id: string; published_at: string; published_by: string | null; source_type: string; period_start: string; period_end: string; results: ResultRow[] }

const SCOPE_ORDER: Record<string, number> = { state: 0, section: 1, conference: 2, district: 3, region: 4 }

function scopeLabel(scope: string, scopeId: string | null): string {
  if (scope === 'state') return 'State'
  if (scope === 'district') return `District ${scopeId}`
  if (scope === 'region')   return `Region ${scopeId}`
  return scopeId ?? scope
}

function scopeGroupLabel(scope: string): string {
  return scope.charAt(0).toUpperCase() + scope.slice(1)
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function MovChip({ v }: { v: string | null | undefined }) {
  if (!v || v === '—') return <span className="text-slate-300 text-xs">—</span>
  if (v === 'NEW') return <span className="text-xs px-1 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">NEW</span>
  const up = v.startsWith('+')
  return <span className={`text-xs font-medium tabular-nums ${up ? 'text-green-700' : 'text-red-600'}`}>{v}</span>
}

type SelectedCombo = { ranking_type: string; scope: string; scope_id: string | null; weight_class: number | null }

export function ArchiveClient() {
  const [combos,    setCombos]    = useState<Combo[]>([])
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [selected,  setSelected]  = useState<SelectedCombo | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [histLoading, setHistLoading] = useState(false)
  const [expanded,  setExpanded]  = useState<Set<string>>(new Set())
  const [typeFilter, setTypeFilter] = useState<'all' | 'individual' | 'team'>('all')
  const [scopeFilter, setScopeFilter] = useState<'all' | string>('all')

  useEffect(() => {
    fetch('/api/admin/rankings/archive')
      .then(r => r.json())
      .then(d => setCombos(d.combos ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function loadHistory(combo: SelectedCombo) {
    setSelected(combo)
    setSnapshots([])
    setExpanded(new Set())
    setHistLoading(true)
    const wcParam = combo.weight_class !== null ? `&weight_class=${combo.weight_class}` : ''
    const sidParam = combo.scope_id ? `&scope_id=${encodeURIComponent(combo.scope_id)}` : '&scope_id='
    const res = await fetch(`/api/admin/rankings/history?scope=${combo.scope}${sidParam}${wcParam}`)
    const d = await res.json()
    setSnapshots(d.history ?? [])
    setHistLoading(false)
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // Group combos by scope for navigation
  const distinctScopes = [...new Set(combos.map(c => c.scope))].sort((a, b) => (SCOPE_ORDER[a] ?? 9) - (SCOPE_ORDER[b] ?? 9))

  const filtered = combos.filter(c => {
    if (typeFilter !== 'all' && c.ranking_type !== typeFilter) return false
    if (scopeFilter !== 'all' && c.scope !== scopeFilter) return false
    return true
  })

  // Group filtered combos by scope
  const grouped = new Map<string, Combo[]>()
  for (const c of filtered) {
    if (!grouped.has(c.scope)) grouped.set(c.scope, [])
    grouped.get(c.scope)!.push(c)
  }

  const isSelected = (c: Combo) =>
    selected?.scope === c.scope &&
    selected?.scope_id === c.scope_id &&
    selected?.weight_class === c.weight_class &&
    selected?.ranking_type === c.ranking_type

  return (
    <div className="flex gap-6 min-h-[60vh]">
      {/* ── Left: scope selector ──────────────────────────────────────────── */}
      <aside className="w-64 shrink-0">
        {/* Filters */}
        <div className="mb-4 space-y-2">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as 'all' | 'individual' | 'team')}
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none"
            >
              <option value="all">All</option>
              <option value="individual">Individual</option>
              <option value="team">Team</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Scope</label>
            <select
              value={scopeFilter}
              onChange={e => setScopeFilter(e.target.value)}
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none"
            >
              <option value="all">All Scopes</option>
              {distinctScopes.map(s => (
                <option key={s} value={s}>{scopeGroupLabel(s)}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-slate-400 py-4">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">No published rankings yet.</p>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {[...grouped.entries()].map(([scope, items]) => (
              <div key={scope}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 px-1">
                  {scopeGroupLabel(scope)}
                </p>
                <ul className="space-y-px">
                  {items.map(c => {
                    const label = scope === 'state' ? 'State' :
                      scope === 'district' ? `Dist. ${c.scope_id}` :
                      scope === 'region'   ? `Region ${c.scope_id}` :
                      c.scope_id ?? '—'
                    const wc = c.weight_class ? ` · ${c.weight_class}` : ''
                    return (
                      <li key={`${c.scope}|${c.scope_id}|${c.weight_class}|${c.ranking_type}`}>
                        <button
                          onClick={() => loadHistory(c)}
                          className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
                            isSelected(c)
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate block">{label}{wc}</span>
                          <span className={`text-[10px] ${isSelected(c) ? 'text-slate-300' : 'text-slate-400'}`}>
                            {c.snapshot_count} snapshot{c.snapshot_count !== 1 ? 's' : ''}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ── Right: timeline ───────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0">
        {!selected ? (
          <div className="flex items-center justify-center h-48 text-sm text-slate-400 border border-dashed border-slate-200 rounded">
            Select a scope on the left to view its snapshot timeline
          </div>
        ) : histLoading ? (
          <p className="text-sm text-slate-400 py-8 text-center">Loading…</p>
        ) : snapshots.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No snapshots found for this scope.</p>
        ) : (
          <div>
            <h2 className="text-sm font-semibold text-slate-800 mb-4">
              {scopeLabel(selected.scope, selected.scope_id)}
              {selected.weight_class ? ` · ${selected.weight_class} lbs` : ''}
              <span className="ml-2 text-xs font-normal text-slate-400 capitalize">{selected.ranking_type}</span>
              <span className="ml-1 text-xs font-normal text-slate-400">— {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''}</span>
            </h2>

            <div className="space-y-3">
              {snapshots.map((snap, idx) => {
                const isOpen = expanded.has(snap.id)
                return (
                  <div key={snap.id} className="border border-slate-200 rounded overflow-hidden">
                    {/* Snapshot header — always visible */}
                    <button
                      onClick={() => toggleExpand(snap.id)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        {idx === 0 && (
                          <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">Latest</span>
                        )}
                        <span className="text-sm font-medium text-slate-800">
                          {fmt(snap.period_start)}–{fmt(snap.period_end)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {snap.source_type === 'auto_computed' ? 'Auto' : 'Editorial'} · Published {fmt(snap.published_at)}{snap.published_by ? ` by ${snap.published_by}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-slate-400">{snap.results.length} entries</span>
                        <span className="text-xs text-slate-400">{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </button>

                    {/* Expanded list */}
                    {isOpen && (
                      <table className="min-w-full text-sm">
                        <thead className="border-t border-slate-200 bg-white">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 w-10">#</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
                              {selected.ranking_type === 'team' ? 'School' : 'Wrestler'}
                            </th>
                            {selected.ranking_type === 'individual' && (
                              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Score</th>
                            )}
                            <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 w-16">Δ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {snap.results.map((r, ri) => (
                            <tr key={r.wrestler_id ?? r.school_id ?? ri} className="hover:bg-slate-50">
                              <td className="px-3 py-1.5 text-xs text-slate-400 tabular-nums">{r.rank}</td>
                              <td className="px-3 py-1.5 text-slate-800 text-sm">{r.label}</td>
                              {selected.ranking_type === 'individual' && (
                                <td className="px-3 py-1.5 text-right text-xs text-slate-400 tabular-nums">{r.score.toFixed(1)}</td>
                              )}
                              <td className="px-3 py-1.5 text-right"><MovChip v={r.movement} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
