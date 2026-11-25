'use client'
// College Progress (Kyle 2026-11-18): every championship by year — tournaments down the left, years across the top
// (newest first: the review works backwards), three cells a year: Q qualifiers, P placements, B bouts. A year not
// imported yet is empty and red — or black when we have no document for it (src/lib/ncaa/sourceYears.ts, from the
// PDF folders); once imported its cells say what we have (✓ / –; 2 of 3 is fine). Red until that year is reviewed,
// then green. Click a year for its numbers and the Reviewed switch (only with nobody left waiting).
import { useState } from 'react'
import { COLLEGE_LEVELS } from '@/lib/ncaa/stats'
import { SOURCE_YEARS } from '@/lib/ncaa/sourceYears'

export type ProgressEv = { id: number; level: string; year: number; entrants: number; places: number; bouts: number; auto: number; confirmed: number; review: number; not_ours: number; reviewed_at: string | null; reviewed_by: string | null; source_files: string[] | null }

// the first championship of each level (no cells before it); a level not listed starts at its earliest import
const FIRST_YEAR: Record<string, number> = { 'NCAA DI': 1928, 'NCAA DII': 1963, 'NCAA DIII': 1974, NAIA: 1958 }
// the latest championship held: this year's from March on
const lastYear = () => { const d = new Date(); return d.getMonth() >= 2 ? d.getFullYear() : d.getFullYear() - 1 }

export function ProgressGrid({ events, gender, onChanged, setMsg }: { events: ProgressEv[]; gender: 'M' | 'F'; onChanged: () => void; setMsg: (m: { ok: boolean; text: string }) => void }) {
  const [pick, setPick] = useState<ProgressEv | { level: string; year: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const levels = COLLEGE_LEVELS[gender]
  const byKey = new Map(events.map(e => [`${e.level}|${e.year}`, e]))
  const top = Math.max(lastYear(), ...events.map(e => e.year))
  const first = (level: string) => FIRST_YEAR[level] ?? Math.min(top, ...events.filter(e => e.level === level).map(e => e.year))
  const bottom = Math.min(...levels.map(l => first(l.level)))
  const years = Array.from({ length: top - bottom + 1 }, (_, i) => top - i)

  const imported = (level: string) => events.filter(e => e.level === level)
  const hasDoc = (level: string, y: number) => (SOURCE_YEARS[gender][level] ?? []).includes(y)
  const docs = (level: string) => years.filter(y => y >= first(level) && (hasDoc(level, y) || byKey.has(`${level}|${y}`))).length
  const span = (level: string) => top - first(level) + 1

  async function setReviewed(e: ProgressEv, reviewed: boolean) {
    setBusy(true)
    try {
      const d = await (await fetch('/api/admin/college', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, action: 'event_reviewed', event_id: e.id, reviewed }) })).json()
      if (d.error) { setMsg({ ok: false, text: d.error }); return }
      setMsg({ ok: true, text: `${e.year} ${e.level}: ${reviewed ? 'reviewed' : 'back to not reviewed'}.` })
      setPick(null); onChanged()
    } finally { setBusy(false) }
  }

  const sel = pick && 'id' in pick ? pick : null
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
        <span><span className="mr-1 inline-block h-3 w-3 border border-red-200 bg-red-100 align-middle" />not reviewed (empty = not imported)</span>
        <span><span className="mr-1 inline-block h-3 w-3 border border-green-200 bg-green-100 align-middle" />reviewed</span>
        <span><span className="mr-1 inline-block h-3 w-3 border border-black bg-black align-middle" />no document for that year</span>
        <span><span className="mr-1 inline-block h-3 w-3 border border-slate-200 bg-slate-100 align-middle" />before the first championship</span>
        <span>Q qualifiers · P placements · B bouts — ✓ have · – not in the source</span>
      </div>

      <table className="text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>{['Tournament', 'Documents', 'Imported', 'Reviewed'].map(h => <th key={h} className="px-3 py-1 text-left text-[11px] font-semibold uppercase text-slate-500">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {levels.map(l => (
            <tr key={l.level}>
              <td className="px-3 py-1 font-semibold text-slate-800">{l.full}</td>
              <td className="px-3 py-1 tabular-nums">{docs(l.level)} / {span(l.level)}</td>
              <td className="px-3 py-1 tabular-nums">{imported(l.level).length} / {span(l.level)}</td>
              <td className="px-3 py-1 tabular-nums">{imported(l.level).filter(e => e.reviewed_at).length} / {span(l.level)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="max-h-[70vh] overflow-auto border border-slate-200">
        <table className="border-collapse text-[11px]">
          <thead className="sticky top-0 z-20 bg-white">
            <tr>
              <th rowSpan={2} className="sticky left-0 z-30 border-b border-r border-slate-300 bg-white px-3 py-1 text-left font-semibold uppercase text-slate-500">Tournament</th>
              {years.map(y => <th key={y} colSpan={3} className="border-b border-l border-slate-300 px-1 py-0.5 text-center font-semibold tabular-nums text-slate-700">{y}</th>)}
            </tr>
            <tr>{years.map(y => ['Q', 'P', 'B'].map((c, i) => <th key={`${y}${c}`} className={`border-b border-slate-300 px-1 py-0.5 text-center font-medium text-slate-400 ${i === 0 ? 'border-l' : ''}`}>{c}</th>))}</tr>
          </thead>
          <tbody>
            {levels.map(l => (
              <tr key={l.level}>
                <td className="sticky left-0 z-10 whitespace-nowrap border-b border-r border-slate-300 bg-white px-3 py-1 font-semibold text-slate-800">{l.full}</td>
                {years.map(y => {
                  if (y < first(l.level)) return <td key={y} colSpan={3} className="border-b border-l border-slate-200 bg-slate-100" />
                  const e = byKey.get(`${l.level}|${y}`)
                  if (!e && !hasDoc(l.level, y)) return <td key={y} colSpan={3} title={`${y} ${l.level}: no document`} className="border-b border-l border-slate-700 bg-black" />
                  const on = pick && pick.level === l.level && pick.year === y
                  const tone = e?.reviewed_at ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'
                  const tip = e ? `${y} ${l.level}: ${e.entrants} qualifiers, ${e.places} places, ${e.bouts} bouts — ${e.review} waiting` : `${y} ${l.level}: not imported`
                  return [e?.entrants, e?.places, e?.bouts].map((n, i) => (
                    <td key={`${y}${i}`} title={tip} onClick={() => setPick(e ?? { level: l.level, year: y })}
                      className={`h-6 w-6 cursor-pointer border-b border-slate-200 text-center ${i === 0 ? 'border-l border-l-slate-300' : ''} ${tone} ${on ? 'outline outline-2 -outline-offset-2 outline-slate-900' : ''}`}>
                      {e ? (n ? '✓' : '–') : ''}
                    </td>
                  ))
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pick && !sel && <div className="border border-slate-200 px-3 py-2 text-sm text-slate-600"><strong>{pick.year} {pick.level}</strong> — not imported yet.</div>}
      {sel && (
        <div className="space-y-2 border border-slate-200 px-3 py-2 text-sm">
          <div className="font-semibold text-slate-900">{sel.year} {sel.level}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-700">
            <span>Qualifiers <strong>{sel.entrants}</strong></span><span>Places <strong>{sel.places}</strong></span><span>Bouts <strong>{sel.bouts}</strong></span>
            <span>Matched automatically <strong>{sel.auto}</strong></span><span>Confirmed <strong>{sel.confirmed}</strong></span>
            <span className={sel.review ? 'text-amber-700' : ''}>Waiting for review <strong>{sel.review}</strong></span><span>Not ours <strong>{sel.not_ours}</strong></span>
          </div>
          <div className="text-xs text-slate-500">Files: {(sel.source_files ?? []).join(', ') || '—'}</div>
          {sel.reviewed_at
            ? <div className="flex items-center gap-3 text-xs text-green-800">Reviewed {new Date(sel.reviewed_at).toLocaleDateString()}{sel.reviewed_by ? ` by ${sel.reviewed_by}` : ''}
                <button disabled={busy} onClick={() => setReviewed(sel, false)} className="text-slate-500 underline hover:text-red-700">Undo</button></div>
            : <button disabled={busy || sel.review > 0} onClick={() => setReviewed(sel, true)} className="bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
                {sel.review > 0 ? `${sel.review} still waiting for review` : 'Mark this year reviewed'}</button>}
        </div>
      )}
    </div>
  )
}
