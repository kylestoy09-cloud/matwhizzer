'use client'
// Article Hub (Kyle 2026-11-17): the season's article events (scheduler), each article written section by section,
// saved whole (Ready), published by the publisher at its time. Emergency Extension = the red light. API: /api/admin/article-hub

import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { useCallback, useEffect, useState } from 'react'

type Section = { key: string; label: string }
type Part = { id: string; section: string; title: string; body: string; status: string; updated_at: string }
type Ev = { id: string; kind: string; title: string; covers_date: string | null; publish_at: string; status: 'open' | 'ready' | 'published' | 'missed'; extended_from: string | null; auto: boolean; sections: Part[] }

const KIND: Record<string, string> = { preseason: 'Preseason', match_day: 'Match day', rankings: 'Rankings', feature: 'Feature' }
const STATUS: Record<Ev['status'], string> = { open: 'bg-slate-100 text-slate-600', ready: 'bg-emerald-100 text-emerald-700', published: 'bg-sky-100 text-sky-700', missed: 'bg-red-100 text-red-700' }
const fmt = (t: string) => new Date(t).toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
function untilText(t: string, now: number) {
  const ms = new Date(t).getTime() - now
  if (ms <= 0) return 'time passed'
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000)
  return h >= 48 ? `in ${Math.floor(h / 24)} days` : `in ${h}h ${m}m`
}

export function ArticleHubClient() {
  const { gender } = useAdminGender()
  const [events, setEvents] = useState<Ev[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [season, setSeason] = useState<{ label: string } | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, { title: string; body: string }>>({})
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [extendId, setExtendId] = useState<string | null>(null)
  const [extendTo, setExtendTo] = useState('')
  const [newEv, setNewEv] = useState<{ title: string; at: string } | null>(null)
  const [showPast, setShowPast] = useState(false)

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t) }, [])

  const load = useCallback(async () => {
    const d = await (await fetch(`/api/admin/article-hub?gender=${gender}`)).json()
    if (d.error) { setMsg({ ok: false, text: d.error }); return }
    setEvents(d.events); setSections(d.sections); setSeason(d.season)
  }, [gender])
  useEffect(() => { setOpenId(null); load() }, [load])

  async function post(body: Record<string, unknown>, ok?: string) {
    setBusy(true)
    try {
      const d = await (await fetch('/api/admin/article-hub', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, ...body }) })).json()
      if (d.error) { setMsg({ ok: false, text: d.error }); return null }
      if (ok) setMsg({ ok: true, text: ok })
      await load()
      return d
    } finally { setBusy(false) }
  }

  const part = (ev: Ev, key: string) => ev.sections.find(p => p.section === key)
  const draft = (ev: Ev, key: string) => drafts[`${ev.id}|${key}`] ?? { title: part(ev, key)?.title ?? ev.title, body: part(ev, key)?.body ?? '' }
  const setDraft = (ev: Ev, key: string, v: Partial<{ title: string; body: string }>) => setDrafts(x => ({ ...x, [`${ev.id}|${key}`]: { ...draft(ev, key), ...v } }))

  const visible = events.filter(e => showPast || e.status !== 'published')
  return (
    <div className="space-y-4">
      {msg && <div className={`border px-3 py-2 text-sm ${msg.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{msg.text} <button onClick={() => setMsg(null)} className="ml-2 text-xs underline">dismiss</button></div>}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-slate-800">{season?.label} · {gender === 'F' ? 'Girls' : 'Boys'}</span>
        <button onClick={() => post({ action: 'seed' }, 'Automatic events checked: preseason week and ranking weeks.')} disabled={busy}
          className="border border-slate-400 px-3 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-40">Create automatic events</button>
        <button onClick={() => setNewEv(newEv ? null : { title: '', at: '' })} className="border border-slate-400 px-3 py-1 text-xs font-medium hover:bg-slate-50">+ New article event</button>
        <label className="ml-auto flex items-center gap-1 text-xs text-slate-500"><input type="checkbox" checked={showPast} onChange={e => setShowPast(e.target.checked)} /> show published</label>
      </div>
      {newEv && (
        <div className="flex flex-wrap items-end gap-2 border border-slate-200 bg-slate-50 p-3">
          <label className="text-xs text-slate-500">Title<input value={newEv.title} onChange={e => setNewEv({ ...newEv, title: e.target.value })} className="mt-0.5 block w-64 border border-slate-300 px-2 py-1 text-sm" /></label>
          <label className="text-xs text-slate-500">Publishes (Eastern)<input type="datetime-local" value={newEv.at} onChange={e => setNewEv({ ...newEv, at: e.target.value })} className="mt-0.5 block border border-slate-300 px-2 py-1 text-sm" /></label>
          <button disabled={busy || !newEv.title.trim() || !newEv.at} onClick={async () => { if (await post({ action: 'create_event', title: newEv.title, publish_at: new Date(newEv.at).toISOString() }, 'Event created.')) setNewEv(null) }}
            className="bg-slate-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-40">Create</button>
        </div>
      )}

      {visible.length === 0 && <p className="text-sm text-slate-400">No events yet. “Create automatic events” adds the preseason week (8 AM each day before competition starts) and the weekly rankings (Monday 8 AM). Match-day events come from the master schedule.</p>}

      <div className="divide-y divide-slate-200 border border-slate-200">
        {visible.map(ev => {
          const done = sections.filter(s => part(ev, s.key)?.status === 'finalized' || part(ev, s.key)?.status === 'published').length
          const isOpen = openId === ev.id
          const editable = ev.status !== 'published'
          return (
            <div key={ev.id}>
              <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS[ev.status]}`}>{ev.status}</span>
                <span className="text-[11px] text-slate-400">{KIND[ev.kind]}</span>
                <button onClick={() => setOpenId(isOpen ? null : ev.id)} className="font-medium text-slate-900 hover:underline">{ev.title || '(untitled)'}</button>
                <span className="text-xs text-slate-500">{done}/{sections.length} sections</span>
                <span className="ml-auto text-xs text-slate-600">{fmt(ev.publish_at)}{ev.status !== 'published' && <span className="ml-1 text-slate-400">({untilText(ev.publish_at, now)})</span>}{ev.extended_from && <span className="ml-1 text-amber-700">extended</span>}</span>
                {editable && (
                  <button onClick={() => { setExtendId(extendId === ev.id ? null : ev.id); setExtendTo('') }} title="Emergency extension"
                    className="flex items-center gap-1 border border-red-300 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 hover:bg-red-100">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-600 shadow-[0_0_6px_2px_rgba(220,38,38,0.6)]" /> Extension
                  </button>
                )}
              </div>
              {extendId === ev.id && (
                <div className="flex flex-wrap items-end gap-2 border-t border-red-200 bg-red-50 px-3 py-2">
                  <label className="text-xs text-red-800">New publish time (Eastern)<input type="datetime-local" value={extendTo} onChange={e => setExtendTo(e.target.value)} className="mt-0.5 block border border-red-300 bg-white px-2 py-1 text-sm" /></label>
                  <button disabled={busy || !extendTo} onClick={async () => { if (await post({ action: 'extend', event_id: ev.id, publish_at: new Date(extendTo).toISOString() }, `Extended to ${fmt(new Date(extendTo).toISOString())}.`)) setExtendId(null) }}
                    className="bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-40">Extend</button>
                </div>
              )}
              {isOpen && (
                <div className="space-y-3 border-t border-slate-200 bg-slate-50 px-3 py-3">
                  {sections.map(s => {
                    const p = part(ev, s.key), d = draft(ev, s.key)
                    const saved = p?.status === 'finalized' || p?.status === 'published'
                    return (
                      <div key={s.key} className="border border-slate-200 bg-white p-2">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">{s.label}</span>
                          <span className={`text-[11px] ${saved ? 'text-emerald-700' : 'text-slate-400'}`}>{saved ? '✓ saved' : p ? 'draft' : 'not started'}</span>
                        </div>
                        <input value={d.title} disabled={!editable} onChange={e => setDraft(ev, s.key, { title: e.target.value })} placeholder="Title" className="mb-1 w-full border border-slate-200 px-2 py-1 text-sm" />
                        <textarea value={d.body} disabled={!editable} onChange={e => setDraft(ev, s.key, { body: e.target.value })} rows={6} className="w-full border border-slate-200 px-2 py-1 text-sm" />
                        {editable && (
                          <div className="mt-1 flex gap-2">
                            <button disabled={busy} onClick={() => post({ action: 'save_section', event_id: ev.id, section: s.key, title: d.title, body: d.body, finalize: false }, `${s.label} draft saved.`)} className="border border-slate-300 px-2 py-0.5 text-xs disabled:opacity-40">Save draft</button>
                            <button disabled={busy || !d.body.trim()} onClick={() => post({ action: 'save_section', event_id: ev.id, section: s.key, title: d.title, body: d.body, finalize: true }, `${s.label} saved.`)} className="bg-slate-900 px-2 py-0.5 text-xs text-white disabled:opacity-40">Save section</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {editable && (
                    <div className="flex items-center gap-2">
                      {ev.status === 'ready'
                        ? <button disabled={busy} onClick={() => post({ action: 'unready', event_id: ev.id }, 'Back to open.')} className="border border-slate-400 px-3 py-1 text-xs font-medium disabled:opacity-40">Reopen</button>
                        : <button disabled={busy || done < sections.length} onClick={() => post({ action: 'ready', event_id: ev.id }, `Saved. Publishes ${fmt(ev.publish_at)}.`)} className="bg-emerald-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40">Save article — publish {fmt(ev.publish_at)}</button>}
                      {done < sections.length && <span className="text-xs text-slate-500">Save every section first ({done}/{sections.length}).</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
