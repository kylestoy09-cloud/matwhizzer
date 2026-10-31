'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { RATING_SHORT } from '@/lib/rating'

type ResultRow = { rank: number; wrestler_id: string; label: string; score: number; movement?: string | null }
type Variant   = { id: string; formula_name: string; computed_at: string; results: ResultRow[] }
type Editorial = { id: string; based_on_variant_id: string | null; results: ResultRow[]; updated_by: string; updated_at: string; period_start: string; period_end: string }
type Published = { id: string; published_at: string; published_by: string | null; source_type: string; period_start: string; period_end: string; results: (ResultRow & { movement: string | null })[] }

const BOYS_WEIGHTS  = [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285]
const GIRLS_WEIGHTS = [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235]

function fmt(iso: string) { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }

function MovChip({ v }: { v: string | null | undefined }) {
  if (!v || v === '—') return <span className="text-slate-300 text-xs">—</span>
  if (v === 'NEW') return <span className="text-xs px-1 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">NEW</span>
  const up = v.startsWith('+')
  return (
    <span className={`text-xs font-medium tabular-nums ${up ? 'text-green-700' : 'text-red-600'}`}>{v}</span>
  )
}

export function IndividualRankingsClient() {
  const { gender } = useAdminGender()
  const [sections,     setSections]     = useState<string[]>([])
  const [scope,        setScope]        = useState<'state' | 'section'>('state')
  const [scopeId,      setScopeId]      = useState<string>('')
  const [weightClass,  setWeightClass]  = useState<number | null>(null)
  const weightClasses = gender === 'F' ? GIRLS_WEIGHTS : BOYS_WEIGHTS
  const [variants,     setVariants]     = useState<Variant[]>([])
  const [editorial,    setEditorial]    = useState<Editorial | null>(null)
  const [editedRows,   setEditedRows]   = useState<ResultRow[]>([])
  const [history,      setHistory]      = useState<Published[]>([])
  const [loading,      setLoading]      = useState(false)
  const [seeding,      setSeeding]      = useState(false)
  const [startingEdit, setStartingEdit] = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [publishing,   setPublishing]   = useState(false)
  const [editMode,     setEditMode]     = useState(false)
  const [tab,          setTab]          = useState<'workbench' | 'history'>('workbench')
  const [flash,        setFlash]        = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  // Fetch section list when gender changes; also reset weight class
  useEffect(() => {
    setWeightClass(null)
    setVariants([])
    setEditorial(null)
    setHistory([])
    fetch(`/api/admin/rankings/variants?sections=1&gender=${gender}`)
      .then(r => r.json())
      .then(d => setSections(d.sections ?? []))
      .catch(() => {})
  }, [gender])

  const scopeParam = scope === 'section' ? `scope=section&scope_id=${encodeURIComponent(scopeId)}` : 'scope=state&scope_id='

  const load = useCallback(async (wc: number) => {
    setLoading(true)
    setFlash(null)
    try {
      const [varRes, editRes, histRes] = await Promise.all([
        fetch(`/api/admin/rankings/variants?${scopeParam}&weight_class=${wc}&gender=${gender}`),
        fetch(`/api/admin/rankings/editorial?${scopeParam}&weight_class=${wc}&gender=${gender}`),
        fetch(`/api/admin/rankings/history?${scopeParam}&weight_class=${wc}&gender=${gender}`),
      ])
      const [varD, editD, histD] = await Promise.all([varRes.json(), editRes.json(), histRes.json()])
      setVariants(varD.variants ?? [])
      setEditorial(editD.editorial ?? null)
      setEditedRows(editD.editorial?.results ?? [])
      setHistory(histD.history ?? [])
      setEditMode(false)
    } catch {
      setFlash({ kind: 'err', msg: 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }, [scopeParam, gender]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleApply() {
    if (!weightClass) return
    load(weightClass)
  }

  async function handleSeed() {
    if (!weightClass) return
    setSeeding(true)
    setFlash(null)
    try {
      const res = await fetch('/api/admin/rankings/variants', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'seed_from_hammer', scope, scope_id: scopeId || null, weight_class: weightClass, gender }),
      })
      const d = await res.json()
      if (d.error) { setFlash({ kind: 'err', msg: d.error }); return }
      setFlash({ kind: 'ok', msg: `Seeded ${d.variant.results?.length ?? 0} wrestlers from ${RATING_SHORT}` })
      await load(weightClass)
    } finally {
      setSeeding(false)
    }
  }

  async function handleStartEditorial(variantId: string) {
    if (!weightClass) return
    setStartingEdit(true)
    setFlash(null)
    try {
      const res = await fetch('/api/admin/rankings/editorial', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ variant_id: variantId, scope, scope_id: scopeId || null, weight_class: weightClass, gender }),
      })
      const d = await res.json()
      if (d.error) { setFlash({ kind: 'err', msg: d.error }); return }
      setEditorial(d.editorial)
      setEditedRows(d.editorial.results ?? [])
      setEditMode(true)
    } finally {
      setStartingEdit(false)
    }
  }

  function moveRow(idx: number, dir: -1 | 1) {
    const next = [...editedRows]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setEditedRows(next)
  }

  async function handleSave() {
    if (!editorial) return
    setSaving(true)
    setFlash(null)
    try {
      const res = await fetch('/api/admin/rankings/editorial', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: editorial.id, results: editedRows, gender }),
      })
      const d = await res.json()
      if (d.error) { setFlash({ kind: 'err', msg: d.error }); return }
      setFlash({ kind: 'ok', msg: 'Saved' })
      setEditMode(false)
      if (weightClass) await load(weightClass)
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    if (!editorial) return
    if (!window.confirm('Publish this ranking? A permanent snapshot will be added to the archive.')) return
    setPublishing(true)
    setFlash(null)
    try {
      // Save current edits first — abort if the flush fails so we don't snapshot stale data
      const patchRes = await fetch('/api/admin/rankings/editorial', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: editorial.id, results: editedRows, gender }),
      })
      if (!patchRes.ok) {
        const pd = await patchRes.json().catch(() => ({}))
        setFlash({ kind: 'err', msg: (pd as { error?: string }).error ?? 'Failed to save edits before publishing — try again.' })
        return
      }
      const res = await fetch('/api/admin/rankings/publish', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ editorial_id: editorial.id, gender }),
      })
      const d = await res.json()
      if (d.error) { setFlash({ kind: 'err', msg: d.error }); return }
      setFlash({ kind: 'ok', msg: 'Published — snapshot added to history' })
      setEditMode(false)
      setTab('history')
      if (weightClass) await load(weightClass)
    } finally {
      setPublishing(false)
    }
  }

  const scopeOk = scope === 'state' || (scope === 'section' && !!scopeId)
  const ready   = !!weightClass && scopeOk && !loading

  return (
    <div className="space-y-6">
      {/* ── Scope + weight selector ─────────────────────────────────────────── */}
      <div className="border border-slate-200 rounded p-4 bg-slate-50">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Select Scope</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Scope</label>
            <select
              value={scope}
              onChange={e => { setScope(e.target.value as 'state' | 'section'); setScopeId('') }}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="state">State</option>
              <option value="section">Section</option>
            </select>
          </div>

          {scope === 'section' && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Section</label>
              <select
                value={scopeId}
                onChange={e => setScopeId(e.target.value)}
                className="border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="">— pick —</option>
                {sections.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-500 mb-1">Weight Class</label>
            <select
              value={weightClass ?? ''}
              onChange={e => setWeightClass(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="">— pick —</option>
              {weightClasses.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>

          <button
            onClick={handleApply}
            disabled={!ready}
            className="px-4 py-1.5 bg-slate-900 text-white text-sm rounded font-medium disabled:opacity-40 hover:bg-slate-700"
          >
            {loading ? 'Loading…' : 'Load'}
          </button>
        </div>
      </div>

      {flash && (
        <div className={`rounded px-4 py-2 text-sm ${flash.kind === 'ok' ? 'border border-green-200 bg-green-50 text-green-800' : 'border border-red-200 bg-red-50 text-red-700'}`}>
          {flash.msg}
          <button onClick={() => setFlash(null)} className="ml-3 text-xs underline opacity-60">dismiss</button>
        </div>
      )}

      {weightClass && !loading && (
        <>
          {/* ── Tabs ──────────────────────────────────────────────────────── */}
          <div className="flex gap-2 border-b border-slate-200">
            {(['workbench', 'history'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium capitalize -mb-px border-b-2 transition-colors ${
                  tab === t ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                {t} {t === 'history' && history.length > 0 && `(${history.length})`}
              </button>
            ))}
          </div>

          {/* ── Workbench tab ─────────────────────────────────────────────── */}
          {tab === 'workbench' && (
            <div className="space-y-6">
              {/* Computed variants */}
              <section>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Computed Variants</p>
                {variants.length === 0 ? (
                  <div className="border border-dashed border-slate-300 rounded p-6 text-center">
                    <p className="text-sm text-slate-500 mb-3">No computed variants yet for this scope and weight class.</p>
                    <button
                      onClick={handleSeed}
                      disabled={seeding}
                      className="px-4 py-2 bg-slate-800 text-white text-sm rounded font-medium hover:bg-slate-700 disabled:opacity-50"
                    >
                      {seeding ? 'Seeding…' : `Seed from ${RATING_SHORT}`}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-4 flex-wrap">
                    {variants.map(v => (
                      <div key={v.id} className="border border-slate-200 rounded p-4 flex-1 min-w-64">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-xs font-semibold text-slate-700 capitalize">{v.formula_name.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-slate-400">Computed {fmt(v.computed_at)}</p>
                          </div>
                          <button
                            onClick={() => handleStartEditorial(v.id)}
                            disabled={startingEdit}
                            className="text-xs px-2 py-1 border border-slate-300 text-slate-600 rounded hover:bg-slate-100 disabled:opacity-50"
                          >
                            {startingEdit ? '…' : 'Start Editorial'}
                          </button>
                        </div>
                        <ol className="space-y-1">
                          {(v.results ?? []).slice(0, 10).map(r => (
                            <li key={r.wrestler_id} className="flex items-center gap-2 text-xs">
                              <span className="w-5 text-right text-slate-400 tabular-nums">{r.rank}</span>
                              <span className="text-slate-700 truncate flex-1">{r.label}</span>
                              <span className="text-slate-400 tabular-nums">{r.score.toFixed(1)}</span>
                            </li>
                          ))}
                          {(v.results ?? []).length > 10 && (
                            <li className="text-xs text-slate-400 pl-7">+{v.results.length - 10} more</li>
                          )}
                        </ol>
                      </div>
                    ))}
                    <div className="flex items-end">
                      <button
                        onClick={handleSeed}
                        disabled={seeding}
                        className="text-xs px-3 py-1.5 border border-slate-300 text-slate-600 rounded hover:bg-slate-100 disabled:opacity-50"
                      >
                        {seeding ? 'Seeding…' : `+ New ${RATING_SHORT} Seed`}
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* Editorial */}
              {editorial && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Working Editorial
                      <span className="ml-2 font-normal normal-case text-slate-400">
                        {fmt(editorial.period_start)}–{fmt(editorial.period_end)} · last saved by {editorial.updated_by}
                      </span>
                    </p>
                    <div className="flex gap-2">
                      {!editMode ? (
                        <button
                          onClick={() => { setEditedRows(editorial.results); setEditMode(true) }}
                          className="text-xs px-3 py-1 border border-slate-300 text-slate-600 rounded hover:bg-slate-100"
                        >
                          Edit Order
                        </button>
                      ) : (
                        <>
                          <button onClick={() => { setEditMode(false); setEditedRows(editorial.results) }} className="text-xs px-3 py-1 border border-slate-300 text-slate-500 rounded hover:bg-slate-100">
                            Cancel
                          </button>
                          <button onClick={handleSave} disabled={saving} className="text-xs px-3 py-1 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50">
                            {saving ? 'Saving…' : 'Save'}
                          </button>
                        </>
                      )}
                      <button
                        onClick={handlePublish}
                        disabled={publishing}
                        className="text-xs px-3 py-1 bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-50 font-medium"
                      >
                        {publishing ? 'Publishing…' : 'Publish'}
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 w-10">#</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Wrestler</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Score</th>
                          {editMode && <th className="px-3 py-2 w-16" />}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {editedRows.map((r, idx) => (
                          <tr key={r.wrestler_id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-xs text-slate-400 tabular-nums">{idx + 1}</td>
                            <td className="px-3 py-2 text-slate-800">{r.label}</td>
                            <td className="px-3 py-2 text-right text-xs text-slate-500 tabular-nums">{r.score.toFixed(1)}</td>
                            {editMode && (
                              <td className="px-3 py-2">
                                <div className="flex gap-1 justify-end">
                                  <button onClick={() => moveRow(idx, -1)} disabled={idx === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-xs px-1">↑</button>
                                  <button onClick={() => moveRow(idx, 1)} disabled={idx === editedRows.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-xs px-1">↓</button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {!editorial && variants.length > 0 && (
                <p className="text-sm text-slate-400 text-center py-4">
                  Click "Start Editorial" on a variant above to begin editing the ranked list.
                </p>
              )}
            </div>
          )}

          {/* ── History tab ───────────────────────────────────────────────── */}
          {tab === 'history' && (
            <div>
              {history.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No published rankings yet for this scope and weight class.</p>
              ) : history.map((pub, pubIdx) => (
                <div key={pub.id} className="mb-6">
                  <p className="text-xs font-semibold text-slate-500 mb-2">
                    {fmt(pub.period_start)}–{fmt(pub.period_end)}
                    <span className="ml-2 font-normal text-slate-400">
                      Published {fmt(pub.published_at)}{pub.published_by ? ` by ${pub.published_by}` : ' (auto)'}
                    </span>
                    {pubIdx === 0 && <span className="ml-2 text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">Latest</span>}
                  </p>
                  <div className="border border-slate-200 rounded overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 w-10">#</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Wrestler</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Score</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 w-16">Δ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pub.results.map((r, idx) => (
                          <tr key={r.wrestler_id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-xs text-slate-400 tabular-nums">{idx + 1}</td>
                            <td className="px-3 py-2 text-slate-800">{r.label}</td>
                            <td className="px-3 py-2 text-right text-xs text-slate-500 tabular-nums">{r.score.toFixed(1)}</td>
                            <td className="px-3 py-2 text-right"><MovChip v={r.movement} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
