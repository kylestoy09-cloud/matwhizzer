'use client'

import { useEffect, useState } from 'react'

type Priority = {
  task_type:  string
  label:      string
  sort_order: number
  enabled:    boolean
}

export default function TaskPrioritiesPage() {
  const [items,   setItems]   = useState<Priority[]>([])
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/microcheck/priorities')
      .then(r => r.json())
      .then(d => { setItems(d.priorities ?? []); setLoading(false) })
      .catch(() => { setError('Failed to load'); setLoading(false) })
  }, [])

  function move(index: number, dir: -1 | 1) {
    const next = [...items]
    const swap = index + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    next.forEach((item, i) => { item.sort_order = i + 1 })
    setItems(next)
    setSaved(false)
  }

  function toggle(index: number) {
    const next = [...items]
    next[index] = { ...next[index], enabled: !next[index].enabled }
    setItems(next)
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/microcheck/priorities', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ priorities: items }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setSaved(true)
    } catch {
      setError('Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-400 text-sm animate-pulse">Loading…</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-md mx-auto px-5 py-10">
        <a
          href="/admin/microcheck"
          className="text-xs text-slate-400 hover:text-slate-600 mb-6 inline-flex items-center gap-1"
        >
          ← Back to Microcheck
        </a>

        <h1 className="text-2xl font-bold text-slate-900 mb-1">Task Order</h1>
        <p className="text-sm text-slate-500 mb-8">
          Drag tasks higher to serve them first. Toggle off to pause a task type.
        </p>

        <div className="space-y-2 mb-8">
          {items.map((item, i) => (
            <div
              key={item.task_type}
              className={`flex items-center gap-3 bg-white border rounded-xl px-4 py-3 ${
                item.enabled ? 'border-slate-200' : 'border-slate-100 opacity-50'
              }`}
            >
              {/* Order badge */}
              <span className="text-xs font-semibold text-slate-400 w-5 text-center">
                {i + 1}
              </span>

              {/* Label */}
              <span className="flex-1 text-sm font-medium text-slate-800">
                {item.label}
              </span>

              {/* Enable toggle */}
              <button
                onClick={() => toggle(i)}
                className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                  item.enabled
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {item.enabled ? 'On' : 'Off'}
              </button>

              {/* Move buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-xs leading-none px-1"
                  aria-label="Move up"
                >
                  ▲
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                  className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-xs leading-none px-1"
                  aria-label="Move down"
                >
                  ▼
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-4 rounded-xl bg-slate-900 text-white text-base font-semibold disabled:opacity-40 active:scale-95 transition-transform"
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Order'}
        </button>

        {error && <p className="mt-3 text-xs text-center text-red-600">{error}</p>}
      </div>
    </div>
  )
}
