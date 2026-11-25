'use client'

// Home Video (Kyle 2026-11-12), under Articles: the weekly historical match video for this side's home page.
// The switch turns the feature on or off. Each week (starting Monday) gets a YouTube link and the
// creator's name and channel link, so the original poster gets credit. The home page shows the current
// week's video, or the latest earlier one if a week is left empty.
import { useCallback, useEffect, useState } from 'react'
import { useAdminGender } from '@/components/admin/AdminGenderContext'

type Row = { week_start: string; youtube_url: string; video_id: string; title: string | null; creator_name: string | null; creator_url: string | null; notes: string | null; updated_by: string | null }
type Data = { enabled: boolean; setting: { updated_at: string; updated_by: string | null } | null; rows: Row[]; thisWeek: string; showing: string | null }
const input = 'border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black'
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const weekLabel = (iso: string) => `${new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} – ${new Date(`${addDays(iso, 6)}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`

export function HomeVideoClient() {
  const { gender, side, loaded } = useAdminGender()
  const [d, setD] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [weeks, setWeeks] = useState(12)
  const [showPast, setShowPast] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/admin/home-videos?gender=${gender}`).then(r => r.json()).then(x => x.error ? setError(x.error) : setD(x)).catch(() => setError('Could not load'))
  }, [gender])
  useEffect(() => { if (loaded) load() }, [load, loaded])

  async function toggle() {
    if (!d) return
    if (!confirm(d.enabled ? `Turn the home page video OFF for ${side}?` : `Turn the home page video ON for ${side}?`)) return
    const r = await fetch('/api/admin/home-videos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, enabled: !d.enabled }) })
    if (r.ok) load(); else setError((await r.json()).error)
  }

  if (error) return <div className="max-w-5xl mx-auto px-6 py-8 text-sm text-red-600">{error}</div>
  if (!d) return <div className="max-w-5xl mx-auto px-6 py-8 text-sm text-slate-400">Loading…</div>
  const byWeek = new Map(d.rows.map(r => [r.week_start, r]))
  const upcoming = [...new Set([...Array.from({ length: weeks }, (_, i) => addDays(d.thisWeek, i * 7)), ...d.rows.map(r => r.week_start).filter(w => w >= d.thisWeek)])].sort()
  const past = d.rows.filter(r => r.week_start < d.thisWeek)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Articles · {side === 'girls' ? 'Girls' : 'Boys'} home page</p>
      <h1 className="text-lg font-bold text-slate-900 mb-4">Home Video</h1>

      <div className={`flex items-center gap-4 border p-4 mb-5 ${d.enabled ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
        <button onClick={toggle} role="switch" aria-checked={d.enabled} className={`relative w-12 h-6 rounded-full transition-colors ${d.enabled ? 'bg-emerald-600' : 'bg-slate-300'}`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${d.enabled ? 'left-6' : 'left-0.5'}`} />
        </button>
        <div className="text-sm">
          <p className="font-semibold">{d.enabled ? 'On: the home page shows the video' : 'Off: no video on the home page'}</p>
          <p className="text-xs text-slate-500">
            {d.enabled ? (d.showing ? `Showing the week of ${weekLabel(d.showing)}${d.showing !== d.thisWeek ? ' (this week has no video yet)' : ''}.` : 'No video entered for this week or before, so nothing shows yet.') : 'Videos below are kept and show when it\'s turned on.'}
            {d.setting?.updated_by && ` Last switched by ${d.setting.updated_by}.`}
          </p>
        </div>
      </div>

      <p className="text-sm text-slate-600 mb-2">A new video each week, starting Monday. Paste the YouTube link and credit whoever posted it.</p>
      <div className="border border-slate-200 divide-y divide-slate-100">
        {upcoming.map(w => <WeekRow key={w} week={w} row={byWeek.get(w) ?? null} gender={gender} current={w === d.thisWeek} onSaved={load} />)}
      </div>
      <button onClick={() => setWeeks(weeks + 12)} className="mt-2 text-sm underline text-slate-500 hover:text-black">Show 12 more weeks</button>

      <div className="mt-8">
        <button onClick={() => setShowPast(v => !v)} className="text-sm font-semibold text-slate-800">{showPast ? '▾' : '▸'} Past weeks ({past.length})</button>
        {showPast && <div className="border border-slate-200 divide-y divide-slate-100 mt-2">{past.map(r => <WeekRow key={r.week_start} week={r.week_start} row={r} gender={gender} current={false} onSaved={load} />)}</div>}
      </div>
    </div>
  )
}

function WeekRow({ week, row, gender, current, onSaved }: { week: string; row: Row | null; gender: 'M' | 'F'; current: boolean; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [f, setF] = useState({ youtube_url: row?.youtube_url ?? '', title: row?.title ?? '', creator_name: row?.creator_name ?? '', creator_url: row?.creator_url ?? '', notes: row?.notes ?? '' })
  const [err, setErr] = useState<string | null>(null)
  async function save() {
    const r = await fetch('/api/admin/home-videos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, week_start: week, ...f }) })
    const x = await r.json()
    if (!r.ok) return setErr(x.error)
    setEditing(false); setErr(null); onSaved()
  }
  async function clear() {
    if (!confirm(`Clear the video for ${weekLabel(week)}?`)) return
    const r = await fetch(`/api/admin/home-videos?gender=${gender}&week=${week}`, { method: 'DELETE' })
    if (r.ok) { setEditing(false); onSaved() } else setErr((await r.json()).error)
  }
  const head = <span className={`text-xs w-44 shrink-0 ${current ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>{weekLabel(week)}{current ? ' · this week' : ''}</span>
  if (editing) return (
    <div className="px-4 py-3 bg-slate-50 space-y-2">
      <div className="flex gap-2 items-center">{head}</div>
      <input value={f.youtube_url} onChange={e => setF({ ...f, youtube_url: e.target.value })} placeholder="YouTube link (paste it here)" className={`${input} w-full`} autoFocus />
      <input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Match (e.g. 1994 State Final, 135: Smith vs. Jones) — optional" className={`${input} w-full`} />
      <div className="flex gap-2">
        <input value={f.creator_name} onChange={e => setF({ ...f, creator_name: e.target.value })} placeholder="Creator (who posted it)" className={`${input} flex-1`} />
        <input value={f.creator_url} onChange={e => setF({ ...f, creator_url: e.target.value })} placeholder="Creator's channel link" className={`${input} flex-1`} />
      </div>
      <input value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Notes for the team (not shown)" className={`${input} w-full`} />
      <div className="flex gap-2 items-center">
        <button onClick={save} disabled={!f.youtube_url.trim()} className="px-3 py-1 text-sm bg-black text-white disabled:opacity-40">Save</button>
        <button onClick={() => setEditing(false)} className="px-3 py-1 text-sm border border-slate-300">Cancel</button>
        {row && <button onClick={clear} className="ml-auto text-xs text-slate-400 hover:text-red-600">Clear this week</button>}
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>
    </div>
  )
  return (
    <div className={`px-4 py-2 flex items-start gap-3 ${current ? 'bg-amber-50/60' : ''}`}>
      {head}
      {row ? (
        <div className="flex-1 flex gap-3 items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${row.video_id}/mqdefault.jpg`} alt="" className="w-28 h-16 object-cover bg-slate-100 shrink-0" />
          <div className="text-sm">
            <a href={row.youtube_url} target="_blank" rel="noreferrer" className="font-medium hover:underline">{row.title || 'Video'}</a>
            <div className="text-xs text-slate-500">
              {row.creator_name ? <>Credit: {row.creator_url ? <a href={row.creator_url} target="_blank" rel="noreferrer" className="underline">{row.creator_name}</a> : row.creator_name}</> : <span className="text-amber-700">No creator credit yet</span>}
            </div>
            {row.notes && <div className="text-xs text-slate-400">{row.notes}</div>}
          </div>
        </div>
      ) : <span className="flex-1 text-sm text-slate-300">No video yet</span>}
      <button onClick={() => setEditing(true)} className="text-xs underline text-slate-500 hover:text-black shrink-0">{row ? 'Edit' : 'Add'}</button>
    </div>
  )
}
