'use client'

import { useState, useEffect } from 'react'

type SectionRow = {
  id?: string
  section_key: string
  display_order: number
  is_visible: boolean
}

const PAGE_TYPES: { value: string; label: string }[] = [
  { value: 'wrestler_profile', label: 'Wrestler Profile' },
  { value: 'school',           label: 'School Profile'  },
]

const SECTION_LABELS: Record<string, string> = {
  placements:      'Trophy Case (Placements & Awards)',
  ghost_champion:  'Ghost Champion Badge',
  career_stats:    'Career Stats',
  rankings:        'Published Rankings',
  match_history:   'Match History',
  team_points:     'Team Points Breakdown',
  champions:       'Champions',
  team_leaderboard:'Team Leaderboard',
  wrestlers:       'Wrestler Results',
}

export function LayoutClient() {
  const [pageType,  setPageType]  = useState<string>('wrestler_profile')
  const [sections,  setSections]  = useState<SectionRow[]>([])
  const [loading,   setLoading]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setSaved(false)
    fetch(`/api/admin/content/layout?page_type=${pageType}`)
      .then(r => r.json())
      .then(d => setSections(d.sections ?? []))
      .catch(() => setError('Failed to load sections'))
      .finally(() => setLoading(false))
  }, [pageType])

  function moveUp(idx: number) {
    if (idx === 0) return
    setSections(prev => {
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next.map((s, i) => ({ ...s, display_order: i }))
    })
    setSaved(false)
  }

  function moveDown(idx: number) {
    setSections(prev => {
      if (idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next.map((s, i) => ({ ...s, display_order: i }))
    })
    setSaved(false)
  }

  function toggleVisible(idx: number) {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, is_visible: !s.is_visible } : s))
    setSaved(false)
  }

  async function save() {
    setSaving(true); setError(null); setSaved(false)
    try {
      const res = await fetch('/api/admin/content/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_type: pageType, sections }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Save failed')
      setSaved(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl">
      {/* Page type selector */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
          Page Type
        </label>
        <div className="flex gap-2 flex-wrap">
          {PAGE_TYPES.map(pt => (
            <button
              key={pt.value}
              onClick={() => setPageType(pt.value)}
              className={`px-3 py-1.5 text-sm border transition-colors ${
                pageType === pt.value
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'border-slate-300 text-slate-600 hover:border-slate-500'
              }`}
            >
              {pt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section list */}
      {loading ? (
        <p className="text-sm text-slate-400 py-8 text-center">Loading…</p>
      ) : sections.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded p-8 text-center text-sm text-slate-400">
          No sections configured for this page type.
          <p className="text-xs mt-1">Run the page_sections migration first, then reload.</p>
        </div>
      ) : (
        <>
          <div className="border border-slate-200 rounded overflow-hidden divide-y divide-slate-100">
            {sections.map((s, idx) => (
              <div
                key={s.section_key}
                className={`flex items-center gap-3 px-4 py-3 ${s.is_visible ? 'bg-white' : 'bg-slate-50'}`}
              >
                {/* Order controls */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="text-slate-400 hover:text-slate-700 disabled:opacity-20 leading-none text-xs"
                    title="Move up"
                  >▲</button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === sections.length - 1}
                    className="text-slate-400 hover:text-slate-700 disabled:opacity-20 leading-none text-xs"
                    title="Move down"
                  >▼</button>
                </div>

                {/* Position badge */}
                <span className="text-xs text-slate-400 tabular-nums w-5 text-right shrink-0">
                  {idx + 1}
                </span>

                {/* Label */}
                <span className={`flex-1 text-sm ${s.is_visible ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                  {SECTION_LABELS[s.section_key] ?? s.section_key}
                </span>

                {/* Visibility toggle */}
                <button
                  onClick={() => toggleVisible(idx)}
                  className={`text-xs px-2 py-1 rounded border transition-colors shrink-0 ${
                    s.is_visible
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {s.is_visible ? 'Visible' : 'Hidden'}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className={`px-4 py-2 text-sm font-semibold border transition-colors ${
                saving
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-wait'
                  : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-700'
              }`}
            >
              {saving ? 'Saving…' : 'Save Order & Visibility'}
            </button>
            {saved  && <span className="text-sm text-emerald-600 font-medium">Saved</span>}
            {error  && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </>
      )}
    </div>
  )
}
