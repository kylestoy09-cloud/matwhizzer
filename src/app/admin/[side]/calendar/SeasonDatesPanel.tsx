'use client'

// Season Dates: this side's Preseason / Season / Postseason dates for each season
// (admin_phase_dates). They decide which dashboard the admin home opens and which dashboard a
// task's due date puts it on. Off season runs from the day after postseason ends to the next
// preseason. Admin only: the public site's season is set in the season lifecycle tool.

import { useEffect, useState } from 'react'
import { checkDates, dayAfter, dayBefore, shortDate, type PhaseDates } from '@/lib/phaseDates'

type Season = { id: number; label: string }
type Draft = { preseason_start: string; season_start: string; postseason_start: string; postseason_end: string }
const EMPTY: Draft = { preseason_start: '', season_start: '', postseason_start: '', postseason_end: '' }
const FIELDS: [keyof Draft, string][] = [
  ['preseason_start', 'Preseason starts'], ['season_start', 'Season starts'],
  ['postseason_start', 'Postseason starts'], ['postseason_end', 'Postseason ends'],
]

export function SeasonDatesPanel({ gender, onClose, onSaved }: { gender: 'M' | 'F'; onClose: () => void; onSaved: (rows: PhaseDates[]) => void }) {
  const [rows, setRows]       = useState<PhaseDates[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [seasonId, setSeasonId] = useState<number | null>(null)
  const [draft, setDraft]     = useState<Draft>(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => {
    fetch(`/api/admin/phase-dates?gender=${gender}`).then(r => r.json()).then(d => {
      if (d.error) { setMsg({ text: d.error, ok: false }); return }
      setRows(d.rows); setSeasons(d.seasons)
      // start on the newest season
      const newest = (d.seasons as Season[]).at(-1)
      if (newest) pick(newest.id, d.rows)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender])

  function pick(id: number, list = rows) {
    setSeasonId(id); setMsg(null)
    const r = list.find(x => x.season_id === id)
    setDraft(r ? { preseason_start: r.preseason_start, season_start: r.season_start, postseason_start: r.postseason_start, postseason_end: r.postseason_end } : EMPTY)
  }

  async function save() {
    if (!seasonId) return
    const problem = checkDates(draft)
    if (problem) { setMsg({ text: problem, ok: false }); return }
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/phase-dates', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, season_id: seasonId, ...draft }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setRows(d.rows); onSaved(d.rows); setMsg({ text: 'Saved.', ok: true })
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : String(e), ok: false })
    } finally { setSaving(false) }
  }

  const side = gender === 'F' ? 'Girls' : 'Boys'
  const valid = !checkDates(draft)

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border border-slate-200 shadow-lg w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-base font-bold text-slate-800">{side} Season Dates</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm">✕</button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          These decide which dashboard the {side.toLowerCase()} admin home opens and which dashboard a task&apos;s due date puts it on.
          Off season runs from the day after postseason ends until the next preseason. The public site isn&apos;t affected.
        </p>

        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Season</label>
        <select value={seasonId ?? ''} onChange={e => pick(Number(e.target.value))} className="w-full text-sm border border-slate-200 rounded px-2.5 py-1.5 mb-4">
          {seasons.map(s => (
            <option key={s.id} value={s.id}>{s.label}{rows.some(r => r.season_id === s.id) ? '' : ' (not set)'}</option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {FIELDS.map(([k, label]) => (
            <label key={k} className="block">
              <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</span>
              <input type="date" value={draft[k]} onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded px-2.5 py-1.5" />
            </label>
          ))}
        </div>

        {valid && (
          <ul className="text-xs text-slate-600 mb-4 space-y-0.5">
            <li><span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1.5" />Preseason: {shortDate(draft.preseason_start)} – {shortDate(dayBefore(draft.season_start))}</li>
            <li><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5" />Season: {shortDate(draft.season_start)} – {shortDate(dayBefore(draft.postseason_start))}</li>
            <li><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1.5" />Postseason: {shortDate(draft.postseason_start)} – {shortDate(draft.postseason_end)}</li>
            <li><span className="inline-block w-2 h-2 rounded-full bg-slate-300 mr-1.5" />Off season: from {shortDate(dayAfter(draft.postseason_end))}</li>
          </ul>
        )}

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving || !seasonId} className="px-4 py-1.5 rounded bg-slate-900 text-white text-sm font-medium disabled:opacity-40">
            {saving ? 'Saving…' : 'Save dates'}
          </button>
          {msg && <span className={`text-xs ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</span>}
        </div>
      </div>
    </div>
  )
}
