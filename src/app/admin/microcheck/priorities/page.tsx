'use client'

// Microcheck Task Order: one queue for boys and girls. Drag (or ▲▼) to set the order,
// turn a check on or off, pin one to "do next", or limit a check to chosen schools.
// Schools are dealt A→Z within a check. Nothing here needs a developer.

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

type TaskType = {
  key:           string
  label:         string
  gender:        'M' | 'F' | null
  group_label:   string
  source:        'school_field' | 'queue'
  sort_order:    number
  enabled:       boolean
  pinned_at:     string | null
  school_ids:    number[] | null
  scope_schools: { id: number; name: string }[]
  open?:         number
  total?:        number
}
type Focus = { id: string; task_key: string; school_id: number; school_name: string; task_label: string; status: string }

const GROUP_STYLE: Record<string, string> = {
  Boys:            'bg-blue-50 text-blue-700 border-blue-200',
  Girls:           'bg-rose-50 text-rose-700 border-rose-200',
  'Both programs': 'bg-slate-100 text-slate-600 border-slate-200',
}

export default function TaskOrderPage() {
  const [items,   setItems]   = useState<TaskType[]>([])
  const [focus,   setFocus]   = useState<Focus[]>([])
  const [dirty,   setDirty]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [openScope, setOpenScope] = useState<string | null>(null)
  const dragFrom = useRef<number | null>(null)

  async function load() {
    try {
      const d = await (await fetch('/api/admin/microcheck/task-types')).json()
      if (d.error) { setError(d.error); return }
      // Edit in the saved order; pins are shown on their rows
      setItems([...(d.types as TaskType[])].sort((a, b) => a.sort_order - b.sort_order))
      setFocus(d.focus ?? [])
      setDirty(false)
    } catch { setError('Failed to load') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function change(next: TaskType[]) {
    setItems(next.map((t, i) => ({ ...t, sort_order: i + 1 })))
    setDirty(true)
    setSaved(false)
  }
  function moveTo(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return
    const next = [...items]
    const [row] = next.splice(from, 1)
    next.splice(to, 0, row)
    change(next)
  }
  const update = (i: number, patch: Partial<TaskType>) => change(items.map((t, j) => (j === i ? { ...t, ...patch } : t)))

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/microcheck/task-types', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ types: items.map(t => ({
          key: t.key, sort_order: t.sort_order, enabled: t.enabled, pinned: !!t.pinned_at, school_ids: t.school_ids,
        })) }),
      })
      const d = await res.json()
      if (d.error) { setError(d.error); return }
      setSaved(true)
      await load()
    } catch { setError('Save failed') }
    finally { setSaving(false) }
  }

  async function removeFocus(f: Focus) {
    await fetch('/api/admin/microcheck/focus', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_key: f.task_key, school_id: f.school_id }),
    })
    setFocus(prev => prev.filter(x => x.id !== f.id))
  }

  // Dealing order shown as numbers: pinned checks first (in pin order), then this list
  const dealing = [...items].filter(t => t.enabled).sort((a, b) => {
    if (a.pinned_at && b.pinned_at) return a.pinned_at.localeCompare(b.pinned_at)
    if (a.pinned_at) return -1
    if (b.pinned_at) return 1
    return a.sort_order - b.sort_order
  })
  const dealNo = new Map(dealing.map((t, i) => [t.key, i + 1]))

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-400 text-sm animate-pulse">Loading…</p></div>

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-5 py-10">
        <div className="flex items-center justify-between mb-6">
          <Link href="/admin/microcheck" className="text-xs text-slate-400 hover:text-slate-600">← Back to Microcheck</Link>
          <Link href="/admin/microcheck/tracker" className="text-xs text-slate-500 hover:text-slate-800 underline">Missing data →</Link>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Task Order</h1>
        <p className="text-sm text-slate-500 mb-6">
          One queue for boys and girls. Whoever asks for a task gets the first open one, in this order;
          schools go A→Z within a check. Pinned checks go first. Changes take effect when you save.
        </p>

        {focus.length > 0 && (
          <div className="mb-6 border border-amber-200 bg-amber-50 rounded-lg p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-2">Front of the queue ({focus.length})</p>
            <p className="text-xs text-amber-700 mb-3">Single schools pushed to the front from the Missing Data page. They go before everything below.</p>
            <div className="space-y-1">
              {focus.map(f => (
                <div key={f.id} className="flex items-center justify-between text-sm bg-white border border-amber-100 rounded px-3 py-1">
                  <span><span className="font-medium text-slate-800">{f.school_name}</span> <span className="text-slate-500">· {f.task_label}</span>{f.status !== 'missing' && <span className="text-xs text-emerald-600 ml-2">done</span>}</span>
                  <button onClick={() => removeFocus(f)} className="text-xs text-slate-400 hover:text-red-600">Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2 mb-6">
          {items.map((t, i) => (
            <div
              key={t.key}
              draggable
              onDragStart={() => { dragFrom.current = i }}
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (dragFrom.current != null) moveTo(dragFrom.current, i); dragFrom.current = null }}
              className={`bg-white border rounded-lg ${t.pinned_at ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'} ${t.enabled ? '' : 'opacity-50'}`}
            >
              <div className="flex items-center gap-3 px-3 py-2">
                <span className="cursor-grab text-slate-300 select-none" title="Drag to reorder">⠿</span>
                <span className="w-6 text-right text-xs tabular-nums text-slate-400">{t.enabled ? `#${dealNo.get(t.key)}` : '—'}</span>
                <span className={`text-[10px] font-semibold border rounded px-1.5 py-0.5 shrink-0 ${GROUP_STYLE[t.group_label] ?? ''}`}>{t.group_label}</span>
                <span className="flex-1 text-sm font-medium text-slate-800">{t.label}</span>
                <span className="text-xs tabular-nums text-slate-500 shrink-0">
                  {t.open ?? 0} open{t.source === 'school_field' && t.total != null ? ` / ${t.total}` : ''}
                </span>
                <button onClick={() => update(i, { pinned_at: t.pinned_at ? null : new Date().toISOString() })}
                  className={`text-xs px-2 py-0.5 rounded border shrink-0 ${t.pinned_at ? 'bg-amber-100 border-amber-300 text-amber-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  title="Deal this check before everything else">
                  {t.pinned_at ? '★ Next' : 'Do next'}
                </button>
                <button onClick={() => update(i, { enabled: !t.enabled })}
                  className={`text-xs px-2 py-0.5 rounded border shrink-0 ${t.enabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'border-slate-200 text-slate-400'}`}>
                  {t.enabled ? 'On' : 'Off'}
                </button>
                <div className="flex flex-col shrink-0">
                  <button onClick={() => moveTo(i, i - 1)} disabled={i === 0} aria-label="Move up" className="text-slate-400 hover:text-slate-800 disabled:opacity-20 text-xs leading-none">▲</button>
                  <button onClick={() => moveTo(i, i + 1)} disabled={i === items.length - 1} aria-label="Move down" className="text-slate-400 hover:text-slate-800 disabled:opacity-20 text-xs leading-none">▼</button>
                </div>
              </div>
              {t.source === 'school_field' && (
                <div className="px-3 pb-2 pl-[4.25rem] text-xs text-slate-500">
                  {t.scope_schools.length ? `Only ${t.scope_schools.length} school${t.scope_schools.length === 1 ? '' : 's'}` : 'All schools'} ·{' '}
                  <button onClick={() => setOpenScope(openScope === t.key ? null : t.key)} className="underline hover:text-slate-800">
                    {openScope === t.key ? 'Close' : 'Limit to schools'}
                  </button>
                  {openScope === t.key && (
                    <ScopeEditor
                      schools={t.scope_schools}
                      onChange={sc => update(i, { scope_schools: sc, school_ids: sc.length ? sc.map(s => s.id) : null })}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <button onClick={save} disabled={saving || !dirty}
          className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-40">
          {saving ? 'Saving…' : saved && !dirty ? 'Saved ✓' : dirty ? 'Save order' : 'No changes'}
        </button>
      </div>
    </div>
  )
}

function ScopeEditor({ schools, onChange }: { schools: { id: number; name: string }[]; onChange: (s: { id: number; name: string }[]) => void }) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<{ id: number; display_name: string }[]>([])
  useEffect(() => {
    if (q.trim().length < 2) return
    const timer = setTimeout(async () => {
      const d = await (await fetch(`/api/admin/search-schools?q=${encodeURIComponent(q.trim())}&limit=8`)).json()
      setHits(d.schools ?? [])
    }, 250)
    return () => clearTimeout(timer)
  }, [q])
  const chosen = new Set(schools.map(s => s.id))
  return (
    <div className="mt-2 border border-slate-200 rounded p-2 bg-slate-50">
      <div className="flex flex-wrap gap-1 mb-2">
        {schools.length === 0 && <span className="text-slate-400">No limit: every school.</span>}
        {schools.map(s => (
          <span key={s.id} className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-700">
            {s.name}
            <button onClick={() => onChange(schools.filter(x => x.id !== s.id))} className="text-slate-400 hover:text-red-600">×</button>
          </span>
        ))}
      </div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Add a school…"
        className="w-full border border-slate-300 rounded px-2 py-1 text-sm bg-white" />
      {q.trim().length >= 2 && hits.filter(h => !chosen.has(h.id)).length > 0 && (
        <div className="mt-1 bg-white border border-slate-200 rounded max-h-40 overflow-y-auto">
          {hits.filter(h => !chosen.has(h.id)).map(h => (
            <button key={h.id} onClick={() => { onChange([...schools, { id: h.id, name: h.display_name }]); setQ(''); setHits([]) }}
              className="block w-full text-left px-2 py-1 text-sm hover:bg-slate-50">{h.display_name}</button>
          ))}
        </div>
      )}
    </div>
  )
}
