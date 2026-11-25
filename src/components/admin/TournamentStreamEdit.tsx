'use client'
// Admins only: set a tournament page's stream link (Kyle 2026-11-18). PATCH /api/admin/tournament-stream.
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function TournamentStreamEdit({ id, gender, current }: { id: string; gender: 'M' | 'F'; current: string | null }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [v, setV] = useState(current ?? '')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  async function save() {
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/admin/tournament-stream', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, gender, stream_url: v }) })
      const d = await res.json()
      if (!res.ok || d.error) { setErr(d.error ?? 'Could not save'); return }
      setOpen(false); router.refresh()
    } finally { setBusy(false) }
  }
  if (!open) return <button onClick={() => setOpen(true)} className="text-xs font-semibold text-slate-500 hover:text-slate-900 border border-slate-300 px-2.5 py-1 hover:border-slate-500">{current ? 'Edit stream link' : '+ Stream link'}</button>
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <input value={v} onChange={e => setV(e.target.value)} placeholder="https://… (empty = none)" className="border border-slate-300 px-2 py-1 text-xs w-72" />
      <button onClick={save} disabled={busy} className="bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-40">Save</button>
      <button onClick={() => setOpen(false)} className="border border-slate-300 px-2.5 py-1 text-xs">Cancel</button>
      {err && <span className="text-xs text-red-700">{err}</span>}
    </span>
  )
}
