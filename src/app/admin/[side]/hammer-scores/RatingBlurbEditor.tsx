'use client'

import { useState } from 'react'

// The rating's bio, edited in place: shown under the rating's table on the boys and
// girls Regular Season leaderboards
export function RatingBlurbEditor({ initial }: { initial: string }) {
  const [saved,   setSaved]   = useState(initial)
  const [text,    setText]    = useState(initial)
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [done,    setDone]    = useState(false)

  async function save() {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/admin/rating-settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ blurb: text }),
      })
      const d = await res.json()
      if (!res.ok || d.error) { setError(d.error ?? 'Save failed'); return }
      setSaved(d.blurb); setText(d.blurb); setEditing(false); setDone(true)
    } catch { setError('Save failed') }
    finally { setSaving(false) }
  }

  if (!editing) {
    return (
      <div>
        <span className="text-slate-600">{saved}</span>{' '}
        <button onClick={() => { setEditing(true); setDone(false) }} className="text-xs text-blue-600 hover:text-blue-800 underline">Edit</button>
        {done && <span className="ml-2 text-xs text-emerald-600">Saved: live on the leaderboards</span>}
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <textarea value={text} onChange={e => setText(e.target.value)} rows={4} maxLength={600}
        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm text-slate-800 bg-white" />
      <div className="flex items-center gap-2">
        <button onClick={save} disabled={saving || !text.trim() || text.trim() === saved}
          className="px-3 py-1 text-xs font-semibold bg-slate-900 text-white rounded disabled:opacity-40">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={() => { setText(saved); setEditing(false); setError(null) }} className="px-3 py-1 text-xs text-slate-500 hover:text-slate-800">Cancel</button>
        <span className="text-xs text-slate-400 ml-auto">{text.trim().length} / 600</span>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
