'use client'

// Microcheck Missing Data: every active boys or girls program school × every
// school-data check, with what is done and what is still missing. Click a missing
// cell to push that school's check to the front of the queue (click again to undo).

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Column = { key: string; label: string; gender: 'M' | 'F' | null; group_label: string; enabled: boolean; open?: number; total?: number }
type Row    = { id: number; name: string; boys: boolean; girls: boolean; cells: string; focus: string }
type Queue  = { key: string; label: string; open: number }

// d done · c entered via microcheck · x can't find · f flagged · m missing · - not applicable
const CELL: Record<string, { mark: string; cls: string; title: string }> = {
  d:   { mark: '✓', cls: 'text-emerald-600',             title: 'On file' },
  c:   { mark: '✓', cls: 'text-emerald-600 font-bold',   title: 'Entered through microcheck' },
  x:   { mark: '?', cls: 'text-amber-600 font-bold',     title: "Can't find" },
  f:   { mark: '!', cls: 'text-red-600 font-bold',       title: 'Roster flagged for manual review' },
  m:   { mark: '·', cls: 'text-red-500 font-black',      title: 'Missing: click to do next' },
  '-': { mark: '',  cls: 'text-slate-200',               title: 'Does not apply' },
}
const GROUP_STYLE: Record<string, string> = {
  Boys:            'text-blue-700',
  Girls:           'text-rose-700',
  'Both programs': 'text-slate-500',
}

export default function MissingDataPage() {
  const [columns, setColumns] = useState<Column[]>([])
  const [rows,    setRows]    = useState<Row[]>([])
  const [queues,  setQueues]  = useState<Queue[]>([])
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [missingOnly, setMissingOnly] = useState(true)

  useEffect(() => {
    fetch('/api/admin/microcheck/tracker')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setColumns(d.columns); setRows(d.schools); setQueues(d.queues)
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const visible = useMemo(() => rows.filter(r =>
    (!search.trim() || r.name.toLowerCase().includes(search.trim().toLowerCase())) &&
    (!missingOnly || r.cells.includes('m'))
  ), [rows, search, missingOnly])

  async function toggleFocus(row: Row, ci: number) {
    if (row.cells[ci] !== 'm') return
    const on = row.focus[ci] !== '1'
    const res = await fetch('/api/admin/microcheck/focus', {
      method:  on ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ task_key: columns[ci].key, school_id: row.id }),
    })
    if (!res.ok) { setError('Could not update the queue'); return }
    setRows(prev => prev.map(r => r.id !== row.id ? r : { ...r, focus: r.focus.slice(0, ci) + (on ? '1' : '0') + r.focus.slice(ci + 1) }))
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-400 text-sm animate-pulse">Loading…</p></div>

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1400px] mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-4">
          <Link href="/admin/microcheck" className="text-xs text-slate-400 hover:text-slate-600">← Back to Microcheck</Link>
          <Link href="/admin/microcheck/priorities" className="text-xs text-slate-500 hover:text-slate-800 underline">Task order →</Link>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Missing Data</h1>
        <p className="text-sm text-slate-500 mb-4">
          Every active program school and every check. Click a red <span className="text-red-500 font-black">·</span> to push
          that school to the front of the queue (★); click again to undo.
        </p>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex flex-wrap items-center gap-3 mb-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search schools…"
            className="border border-slate-300 rounded px-3 py-1.5 text-sm bg-white w-64" />
          <label className="text-sm text-slate-600 flex items-center gap-1.5">
            <input type="checkbox" checked={missingOnly} onChange={e => setMissingOnly(e.target.checked)} />
            Only schools with missing data
          </label>
          <span className="text-xs text-slate-400">{visible.length} of {rows.length} schools</span>
          {queues.map(q => (
            <span key={q.key} className="text-xs text-slate-500 border border-slate-200 bg-white rounded px-2 py-0.5">{q.label}: {q.open} open</span>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-3">
          {Object.entries(CELL).filter(([k]) => k !== '-').map(([k, v]) => (
            <span key={k}><span className={v.cls}>{v.mark}</span> {v.title}</span>
          ))}
        </div>

        <div className="overflow-auto border border-slate-200 bg-white rounded max-h-[75vh]">
          <table className="text-sm border-collapse">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-1 text-left font-semibold text-slate-600 sticky left-0 bg-white">School</th>
                {columns.map(c => (
                  <th key={c.key} className={`px-3 py-1 text-center font-semibold whitespace-nowrap ${c.enabled ? '' : 'opacity-40'}`}>
                    <div className={`text-[10px] uppercase tracking-wide ${GROUP_STYLE[c.group_label] ?? ''}`}>{c.group_label}</div>
                    <div className="text-slate-700">{c.label}</div>
                    <div className="text-[10px] font-normal text-slate-400 tabular-nums">{c.open ?? 0} / {c.total ?? 0} open</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(r => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-1 whitespace-nowrap sticky left-0 bg-white font-medium text-slate-800">
                    {r.name}
                    <span className="ml-2 text-[10px] text-slate-400">{[r.boys && 'B', r.girls && 'G'].filter(Boolean).join(' · ')}</span>
                  </td>
                  {columns.map((c, ci) => {
                    const code = r.cells[ci]
                    const cell = CELL[code] ?? CELL['-']
                    const focused = r.focus[ci] === '1'
                    return (
                      <td key={c.key}
                        onClick={() => toggleFocus(r, ci)}
                        title={focused ? 'At the front of the queue: click to undo' : cell.title}
                        className={`px-3 py-1 text-center ${code === 'm' ? 'cursor-pointer hover:bg-amber-50' : ''} ${cell.cls}`}>
                        {focused ? <span className="text-amber-500">★</span> : cell.mark}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
