'use client'
// "Edit meet" (Kyle 2026-11-18): an admin's button on a dual — the public meet page and the Match Card — opening the
// meet's date, time, stream link, premier label, home / away (only before bouts are in) and, for girls duals, whether
// it counts toward the record. Shows nothing to anyone but admins (the read is admin-only). Saves through
// PATCH /api/admin/dual-meets; onSaved lets the page reload what it shows.
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Meet = {
  id: string; gender: 'M' | 'F'; meet_date: string; meet_time: string | null; away: string; home: string
  stream_url: string | null; premier_label: string | null; counts_toward_record: boolean | null; has_bouts: boolean; columns_ready: boolean
}
const input = 'border border-slate-300 px-2 py-1 text-sm'

export function MeetEditPanel({ meetId, onSaved }: { meetId: string; onSaved?: () => void }) {
  const router = useRouter()
  const [meet, setMeet] = useState<Meet | null>(null)
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ meet_date: '', meet_time: '', stream_url: '', premier: false, premier_label: '', counts: true, swap: false })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    let live = true
    fetch(`/api/admin/meet-edit?id=${encodeURIComponent(meetId)}`).then(r => (r.ok ? r.json() : null)).then(d => { if (live && d?.meet) setMeet(d.meet) }).catch(() => {})
    return () => { live = false }
  }, [meetId])
  if (!meet) return null   // not an admin, or no such meet

  function start(m: Meet) {
    setF({ meet_date: m.meet_date, meet_time: (m.meet_time ?? '').slice(0, 5), stream_url: m.stream_url ?? '', premier: !!m.premier_label, premier_label: m.premier_label ?? '', counts: m.counts_toward_record !== false, swap: false })
    setMsg(null); setOpen(true)
  }
  async function save() {
    if (!meet) return
    setBusy(true); setMsg(null)
    try {
      const body: Record<string, unknown> = { id: meet.id, gender: meet.gender, meet_date: f.meet_date, meet_time: f.meet_time }
      if (meet.columns_ready) { body.stream_url = f.stream_url; body.premier_label = f.premier ? (f.premier_label.trim() || 'Premier Dual') : '' }
      if (meet.gender === 'F') body.counts_toward_record = f.counts
      if (f.swap) body.swap_home = true
      const res = await fetch('/api/admin/dual-meets', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json()
      if (!res.ok || d.error) { setMsg({ ok: false, text: d.error ?? 'Could not save' }); return }
      const fresh = await (await fetch(`/api/admin/meet-edit?id=${encodeURIComponent(meet.id)}`)).json()
      if (fresh?.meet) setMeet(fresh.meet)
      setMsg({ ok: true, text: 'Saved.' }); setOpen(false)
      if (onSaved) onSaved(); else router.refresh()
    } finally { setBusy(false) }
  }

  return (
    <div className="my-3 text-sm">
      {!open ? (
        <button onClick={() => start(meet)} className="border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500">Edit meet</button>
      ) : (
        <div className="space-y-2 border border-slate-300 bg-slate-50 p-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-slate-500">Date<input type="date" value={f.meet_date} onChange={e => setF({ ...f, meet_date: e.target.value })} className={`${input} block`} /></label>
            <label className="text-xs text-slate-500">Time<input type="time" value={f.meet_time} onChange={e => setF({ ...f, meet_time: e.target.value })} className={`${input} block`} /></label>
          </div>
          {meet.columns_ready ? (
            <>
              <label className="block text-xs text-slate-500">Stream link (empty = the home team&apos;s page, shown as &quot;Check for streaming at …&quot;)
                <input value={f.stream_url} onChange={e => setF({ ...f, stream_url: e.target.value })} placeholder="https://…" className={`${input} block w-full`} />
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={f.premier} onChange={e => setF({ ...f, premier: e.target.checked })} /> Premier dual
                {f.premier && <input value={f.premier_label} onChange={e => setF({ ...f, premier_label: e.target.value })} placeholder="Premier Dual" className={`${input} ml-1 w-56`} />}
              </label>
            </>
          ) : <p className="text-xs text-amber-700">Stream link and premier label need docs/migrations/20261118_meet_stream_and_details.sql run first.</p>}
          {meet.gender === 'F' && (
            <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={f.counts} onChange={e => setF({ ...f, counts: e.target.checked })} /> Counts toward the team record</label>
          )}
          <label className={`flex items-center gap-2 text-xs ${meet.has_bouts ? 'text-slate-400' : 'text-slate-600'}`}>
            <input type="checkbox" disabled={meet.has_bouts} checked={f.swap} onChange={e => setF({ ...f, swap: e.target.checked })} />
            Swap home and away (now: {meet.away} at {meet.home}){meet.has_bouts ? ' — not once bouts are entered' : ''}
          </label>
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={busy || !f.meet_date} className="bg-slate-900 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40">{busy ? 'Saving…' : 'Save'}</button>
            <button onClick={() => setOpen(false)} className="border border-slate-300 px-3 py-1 text-xs">Cancel</button>
            {msg && !msg.ok && <span className="text-xs text-red-700">{msg.text}</span>}
          </div>
        </div>
      )}
      {!open && msg?.ok && <span className="ml-2 text-xs text-green-700">{msg.text}</span>}
    </div>
  )
}
