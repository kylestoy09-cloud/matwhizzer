'use client'
// Tournament history progress (Kyle 2026-11-20: "something similar to the college spreadsheet … show what is complete
// and what is not"). Tournaments down the left, seasons across the top (newest first), two cells a season: P the podium
// (placements), B the bouts (gathered from 2012-13 on; before that, placements only).
//   ✓ green   in the system
//   yellow    we have a file that can be parsed (a number = how deep its podium goes: 2 finals, 3, 8)
//   orange    we have a file we can't parse (a scanned page)
//   red       no data yet
//   grey      bouts before 2012-13 (not gathered)
// An out-of-state tournament loaded only from NJ teams' results has its NJ bouts in the system: green when that's all
// there is, yellow ("NJ") when a file can fill in the rest.
import { useEffect, useState } from 'react'
import { HISTORY_SOURCES, type HistorySourceCell } from '@/lib/tournamentHistorySources'
import { BOUTS_FROM, type HistorySeries } from '@/lib/tournamentHistorySeries'
import type { HistoryProgressCell } from '@/app/api/admin/tournament-history-progress/route'

type Status = 'done' | 'parse' | 'scan' | 'none' | 'na'
const TONE: Record<Status, string> = {
  done: 'bg-green-100 text-green-800', parse: 'bg-yellow-100 text-yellow-800', scan: 'bg-orange-200 text-orange-900',
  none: 'bg-red-100 text-red-700', na: 'bg-slate-100 text-slate-300',
}
const seasonStart = (s: string) => parseInt(s.slice(0, 4), 10)
const label = (start: number) => `${start}-${String((start + 1) % 100).padStart(2, '0')}`

function podium(db: HistoryProgressCell | undefined, src: HistorySourceCell | undefined): { s: Status; text: string } {
  if (db && db.placements > 0) return { s: 'done', text: '✓' }
  if (src && src.podium > 0) return { s: 'parse', text: String(src.podium) }
  if (src?.podiumScan) return { s: 'scan', text: '' }
  return { s: 'none', text: '' }
}
function bouts(season: string, db: HistoryProgressCell | undefined, src: HistorySourceCell | undefined): { s: Status; text: string } {
  if (season < BOUTS_FROM) return { s: 'na', text: '' }
  const partial = db && db.bouts > 0 && db.outside && db.njOnly
  if (db && db.bouts > 0 && !partial) return { s: 'done', text: '✓' }
  if (src?.bouts === 'yes') return { s: 'parse', text: partial ? 'NJ' : '' }
  if (partial) return { s: 'done', text: 'NJ' }
  if (src?.bouts === 'scan') return { s: 'scan', text: '' }
  return { s: 'none', text: '' }
}

export function HistoryGrid({ gender }: { gender: 'M' | 'F' }) {
  const [data, setData] = useState<{ series: HistorySeries[]; cells: Record<string, Record<string, HistoryProgressCell>> } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [pick, setPick] = useState<{ key: string; season: string } | null>(null)
  // the page keys this component by side, so a side switch starts fresh
  useEffect(() => {
    fetch(`/api/admin/tournament-history-progress?gender=${gender}`).then(r => r.json()).then(d => (d.error ? setErr(d.error) : setData(d))).catch(() => setErr('Network error'))
  }, [gender])
  if (err) return <p className="text-sm text-red-600">{err}</p>
  if (!data) return <p className="text-sm text-slate-400">Loading…</p>

  const sources = HISTORY_SOURCES[gender] ?? {}
  // seasons: from the earliest file or record to the newest, newest first
  const all = [...Object.values(sources).flatMap(v => Object.keys(v)), ...Object.values(data.cells).flatMap(v => Object.keys(v)), BOUTS_FROM]
  const top = Math.max(...all.map(seasonStart)), bottom = Math.min(...all.map(seasonStart))
  const seasons = Array.from({ length: top - bottom + 1 }, (_, i) => label(top - i))
  const cellOf = (key: string, season: string) => ({ db: data.cells[key]?.[season], src: sources[key]?.[season] })

  const count = (key: string) => {
    let p = 0, b = 0, waiting = 0
    for (const s of seasons) {
      const { db, src } = cellOf(key, s)
      if (podium(db, src).s === 'done') p++
      if (bouts(s, db, src).s === 'done') b++
      if (podium(db, src).s === 'parse' || bouts(s, db, src).s === 'parse') waiting++
    }
    return { p, b, waiting }
  }
  const sel = pick ? cellOf(pick.key, pick.season) : null
  const selSeries = pick ? data.series.find(s => s.key === pick.key) : null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
        {([['done', '✓ in the system'], ['parse', 'file we can parse'], ['scan', 'file we can’t parse (scan)'], ['none', 'no data yet'], ['na', `bouts before ${BOUTS_FROM} — not gathered`]] as [Status, string][]).map(([s, t]) => (
          <span key={s}><span className={`mr-1 inline-block h-3 w-3 border border-slate-300 align-middle ${TONE[s]}`} />{t}</span>
        ))}
        <span>P podium (2 finals · 3 · 8 places deep) · B bouts · NJ = only NJ wrestlers’ bouts</span>
      </div>

      <table className="text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>{['Tournament', 'Podiums in', 'Brackets in', 'Years with a file to load'].map(h => <th key={h} className="px-3 py-1 text-left text-[11px] font-semibold uppercase text-slate-500">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.series.map(s => { const c = count(s.key); return (
            <tr key={s.key}><td className="px-3 py-1 font-semibold text-slate-800">{s.label}</td><td className="px-3 py-1 tabular-nums">{c.p}</td><td className="px-3 py-1 tabular-nums">{c.b}</td><td className="px-3 py-1 tabular-nums">{c.waiting}</td></tr>
          ) })}
        </tbody>
      </table>

      <div className="max-h-[70vh] overflow-auto border border-slate-200">
        <table className="border-collapse text-[11px]">
          <thead className="sticky top-0 z-20 bg-white">
            <tr>
              <th rowSpan={2} className="sticky left-0 z-30 border-b border-r border-slate-300 bg-white px-3 py-1 text-left font-semibold uppercase text-slate-500">Tournament</th>
              {seasons.map(s => <th key={s} colSpan={2} className="border-b border-l border-slate-300 px-1 py-0.5 text-center font-semibold tabular-nums text-slate-700">{s}</th>)}
            </tr>
            <tr>{seasons.map(s => ['P', 'B'].map((c, i) => <th key={`${s}${c}`} className={`border-b border-slate-300 px-1 py-0.5 text-center font-medium text-slate-400 ${i === 0 ? 'border-l' : ''}`}>{c}</th>))}</tr>
          </thead>
          <tbody>
            {data.series.map(sr => (
              <tr key={sr.key}>
                <td className="sticky left-0 z-10 whitespace-nowrap border-b border-r border-slate-300 bg-white px-3 py-1 font-semibold text-slate-800">{sr.label}</td>
                {seasons.map(s => {
                  const { db, src } = cellOf(sr.key, s)
                  const on = pick?.key === sr.key && pick.season === s
                  return [podium(db, src), bouts(s, db, src)].map((c, i) => (
                    <td key={`${s}${i}`} onClick={() => setPick({ key: sr.key, season: s })}
                      title={`${sr.label} ${s} — ${i === 0 ? 'podium' : 'bouts'}`}
                      className={`h-6 min-w-6 cursor-pointer border-b border-slate-200 px-0.5 text-center ${i === 0 ? 'border-l border-l-slate-300' : ''} ${TONE[c.s]} ${on ? 'outline outline-2 -outline-offset-2 outline-slate-900' : ''}`}>
                      {c.text}
                    </td>
                  ))
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pick && sel && selSeries && (
        <div className="space-y-1 border border-slate-200 px-3 py-2 text-sm">
          <div className="font-semibold text-slate-900">{selSeries.label} {pick.season}</div>
          <div className="text-slate-700">
            {sel.db
              ? <>In the system: <strong>{sel.db.placements}</strong> placements, <strong>{sel.db.bouts}</strong> bouts{sel.db.outside && sel.db.njOnly ? ' (NJ wrestlers’ bouts only)' : ''} — <a href={`/tournaments/${sel.db.id}`} target="_blank" className="text-blue-700 hover:underline">page</a></>
              : 'Nothing in the system for this year.'}
          </div>
          {sel.src?.files.length
            ? <ul className="text-xs text-slate-600">{sel.src.files.map(f => <li key={f.file}>{f.file} — {f.holds}</li>)}</ul>
            : <div className="text-xs text-slate-500">No file for this year in the History folder.</div>}
        </div>
      )}
    </div>
  )
}
