'use client'

// Insight · Off-Season (Kyle 2026-11-13): notable offseason performances by our wrestlers, by weight, plus "Most
// Notable Overall" across weights. Our schools only; no club, score, best win or bout record; every notable result
// (a win over a kid rated 75+, or a 1-2 point / overtime loss to one) opens under its wrestler with every event they
// placed at. The order is Kyle's where he set it (admin Offseason Hub → Public board), then by score. Data:
// src/lib/offseasonPublic.ts. Live 2026-11-14 (Insight · Off-Season); also previewed in the Aesthetic Tool.
import { Fragment, useState } from 'react'
import Link from 'next/link'
import { SiteTabs } from '@/components/site/SiteTabs'
import type { OffseasonBoardData, OffseasonEntry, OffseasonMatch } from '@/lib/offseasonPublic'

const OVERALL = 'Most Notable Overall'
// the offseason's own color (Kyle 2026-11-13): deep teal, summer and outdoors, a color no in-season page uses
const HEAD = 'bg-teal-700 text-white'
const th = 'px-3 py-1 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap'
const td = 'px-3 py-1 whitespace-nowrap'
const ord = (n: number) => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th')
const day = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '')

export function OffseasonBoard({ data, side }: { data: OffseasonBoardData | null; side: 'boys' | 'girls' }) {
  const [tab, setTab] = useState(OVERALL)
  const [classes, setClasses] = useState<number[]>([])
  const [open, setOpen] = useState<string | null>(null)
  if (!data) return <p className="text-sm text-slate-500">No offseason results yet.</p>

  const byId = new Map(data.entries.map(e => [e.wrestler_id, e]))
  const pool = (data.lists[tab === OVERALL ? 'overall' : tab] ?? []).map(id => byId.get(id)!).filter(Boolean)
  const shown = pool.filter(e => !classes.length || classes.includes(e.class_year))
  const toggle = (y: number) => setClasses(classes.includes(y) ? classes.filter(x => x !== y) : [...classes, y])

  return (
    <div>
      <p className="text-sm text-slate-600 mb-3">Notable offseason performances, not all tournaments and matches included.</p>
      <SiteTabs items={[OVERALL, ...data.weights].map(k => ({ key: k, label: k === OVERALL ? k : `${k}`, onClick: () => { setTab(k); setOpen(null) } }))} active={tab} />
      <div className="flex items-center gap-2 my-3 text-xs">
        <span className="text-slate-500">Class of</span>
        {data.classes.map(y => (
          <button key={y} type="button" onClick={() => toggle(y)}
            className={`px-2 py-0.5 border ${classes.includes(y) ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300 text-slate-600 hover:border-slate-500'}`}>{y}</button>
        ))}
        {classes.length > 0 && <button type="button" onClick={() => setClasses([])} className="underline text-slate-500 hover:text-slate-900">All</button>}
      </div>
      {!shown.length ? <p className="text-sm text-slate-500">No wrestlers here yet.</p> : (
        <div className="overflow-x-auto border border-teal-800">
          <table className="w-full text-[13px]">
            <thead>
              <tr className={HEAD}>
                <th className={th}>#</th>
                {tab === OVERALL && <th className={`${th} text-center`}>Weight</th>}
                <th className={th}>Wrestler</th><th className={th}>School</th><th className={th}>Class</th>
                <th className={th}>Best result</th><th className={`${th} text-center`}>Events</th><th className={`${th} text-center`}>Titles</th>
                <th className={`${th} text-center`}>Podiums</th><th className={th}>Results</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e, i) => (
                <Fragment key={e.wrestler_id}>
                  <tr className={`${i % 2 ? 'bg-slate-50' : 'bg-white'} cursor-pointer hover:bg-blue-50`} onClick={() => setOpen(open === e.wrestler_id ? null : e.wrestler_id)}>
                    <td className={`${td} text-slate-400`}>{i + 1}</td>
                    {tab === OVERALL && <td className={`${td} text-center font-bold text-teal-800 tabular-nums`}>{e.weight ?? '—'}</td>}
                    <td className={`${td} font-semibold`}><Link href={`/${side}/wrestler/${e.wrestler_id}`} onClick={ev => ev.stopPropagation()} className="hover:text-blue-600">{e.name}</Link></td>
                    <td className={td}>{e.school}</td>
                    <td className={td}>{e.class_year}</td>
                    <td className={`${td} text-slate-600`}>{e.best_result ?? '—'}</td>
                    <td className={`${td} text-center`}>{e.events}</td>
                    <td className={`${td} text-center`}>{e.titles || ''}</td>
                    <td className={`${td} text-center`}>{e.podiums || ''}</td>
                    <td className={`${td} text-xs text-slate-500`}>{open === e.wrestler_id ? '▾' : '▸'}</td>
                  </tr>
                  {open === e.wrestler_id && <ResultRows entry={e} side={side} span={tab === OVERALL ? 10 : 9} />}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// opened under a wrestler: every event they placed at, the events they wrestled without placing, then their notable results
function ResultRows({ entry, side, span }: { entry: OffseasonEntry; side: 'boys' | 'girls'; span: number }) {
  const events = [...entry.finishes].sort((a, b) => (b.event_date ?? '').localeCompare(a.event_date ?? ''))
  return (
    <tr className="bg-white border-t border-slate-100">
      <td colSpan={span} className="px-6 py-2 text-xs text-slate-700">
        {events.map((f, j) => (
          <div key={`f${j}`}>
            <span className="font-semibold">{f.place_to ? `${ord(f.place)}–${ord(f.place_to)}` : ord(f.place)}</span> · {f.tournament}{f.division ? ` · ${f.division}` : ''} {f.weight}{f.style === 'freestyle' ? ' (freestyle)' : ''}{f.event_date ? ` · ${day(f.event_date)}` : ''}
          </div>
        ))}
        {entry.wrestled.map((w, j) => (
          <div key={`w${j}`}>
            <span className="text-slate-500">{w.wins + w.losses ? `${w.wins}-${w.losses}` : 'Wrestled'}</span> · {w.tournament} {w.weight}{w.event_date ? ` · ${day(w.event_date)}` : ''}
          </div>
        ))}
        {entry.notable.length > 0 && <p className="mt-1.5 font-semibold text-slate-800">Notable results</p>}
        {entry.notable.map((n, j) => (
          <div key={`n${j}`}>
            <span className={n.kind === 'win' ? 'text-emerald-700 font-semibold' : 'text-amber-700'}>{n.kind === 'win' ? 'Beat' : 'Lost close to'}</span>{' '}
            {n.opponent_wrestler_id ? <Link href={`/${side}/wrestler/${n.opponent_wrestler_id}`} className="hover:text-blue-600 underline decoration-slate-300">{n.opponent}</Link> : n.opponent}{n.opponent_from ? <span className="text-slate-400"> ({n.opponent_from})</span> : null} · {n.result} · {n.event} {n.weight}{n.event_date ? ` · ${day(n.event_date)}` : ''}
          </div>
        ))}
      </td>
    </tr>
  )
}

/** The wrestler-profile table: their offseason results and notable results, in the profile's match table style. */
// matches: event → their bouts at an event with no placement (an offseason dual): the record, then every match
export function OffseasonProfileTable({ entry, season, matches = {} }: { entry: OffseasonEntry; season: number; matches?: Record<number, OffseasonMatch[]> }) {
  const shown = new Set(entry.wrestled.filter(w => matches[w.event_id]?.length).map(w => w.event_id))
  const rows = [
    ...entry.finishes.map(f => ({ date: f.event_date, kind: 'place' as const, f })),
    // a notable result at an event whose matches are all listed shows in that list instead
    ...entry.notable.filter(n => !shown.has(n.event_id)).map(n => ({ date: n.event_date, kind: 'notable' as const, n })),
    ...entry.wrestled.map(w => ({ date: w.event_date, kind: 'wrestled' as const, w })),
  ].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  return (
    <div className="rounded-lg border border-teal-200 overflow-hidden">
      <div className="px-4 py-2 bg-teal-50 border-b border-teal-200 flex items-center gap-2">
        <span className="text-xs font-semibold text-teal-800 uppercase tracking-widest">{season} Offseason</span>
        <span className="text-xs text-teal-700/60 font-medium">— notable results; not every tournament or match</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-max w-full text-[13px]">
          <thead>
            <tr className={HEAD}>
              <th className={th}>Date</th><th className={th}>Event</th><th className={`${th} text-center`}>Wt</th><th className={th}>Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-t border-slate-100 ${i % 2 ? 'bg-slate-50' : 'bg-white'}`}>
                <td className={`${td} text-slate-400 text-xs`}>{r.date ? new Date(`${r.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                {r.kind === 'place' ? <>
                  <td className={td}>{r.f.tournament}{r.f.division ? <span className="text-slate-400 text-xs"> · {r.f.division}</span> : null}</td>
                  <td className={`${td} text-center text-slate-500 font-mono text-xs`}>{r.f.weight}</td>
                  <td className={`${td} font-semibold`}>{r.f.place_to ? `${ord(r.f.place)}–${ord(r.f.place_to)}` : ord(r.f.place)}{r.f.style === 'freestyle' ? <span className="text-slate-400 text-xs font-normal"> (freestyle)</span> : null}</td>
                </> : r.kind === 'wrestled' ? <>
                  <td className={`${td} align-top`}>{r.w.tournament}</td>
                  <td className={`${td} align-top text-center text-slate-500 font-mono text-xs`}>{r.w.weight}</td>
                  <td className={td}>
                    {r.w.wins + r.w.losses ? <span className="font-semibold">{r.w.wins}-{r.w.losses}</span> : <span className="text-slate-500">Wrestled</span>}
                    {(matches[r.w.event_id] ?? []).map((m, k) => {
                      const hit = entry.notable.find(n => n.event_id === r.w.event_id && n.opponent === m.opponent)
                      return (
                        <div key={k} className="text-xs text-slate-600">
                          <span className={`inline-block w-4 font-bold ${!m.counted ? 'text-slate-400' : m.won ? 'text-emerald-700' : 'text-red-700'}`}>{!m.counted ? '–' : m.won ? 'W' : 'L'}</span>
                          {m.round ? <span className="text-slate-400">{m.round} · </span> : null}
                          {m.opponent_wrestler_id ? <Link href={`/wrestler/${m.opponent_wrestler_id}`} className="hover:underline">{m.opponent}</Link> : m.opponent}
                          {m.result ? <span className="text-slate-500"> · {m.result}</span> : null}
                          {hit ? <span className={`ml-1 font-semibold ${hit.kind === 'win' ? 'text-emerald-700' : 'text-amber-700'}`}>{hit.kind === 'win' ? '★ notable win' : '★ close loss'}</span> : null}
                        </div>)
                    })}
                  </td>
                </> : <>
                  <td className={td}>{r.n.event}</td>
                  <td className={`${td} text-center text-slate-500 font-mono text-xs`}>{r.n.weight}</td>
                  <td className={td}><span className={r.n.kind === 'win' ? 'text-emerald-700 font-semibold' : 'text-amber-700'}>{r.n.kind === 'win' ? 'Beat' : 'Lost close to'}</span> {r.n.opponent} <span className="text-slate-500 text-xs">{r.n.result}</span></td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
