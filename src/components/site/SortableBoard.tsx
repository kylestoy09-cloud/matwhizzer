'use client'
// A leader board you can sort (Kyle 2026-11-18: "college leaderboards need to be sortable"): click a column to sort by
// it, again to flip it. "#" is the place in the current order (ties share it). The wrestler column links to his
// profile when `live`, with his high school under the name. Long lists scroll inside the box, header kept.
import { useMemo, useState } from 'react'
import Link from 'next/link'

export type BoardCol = { key: string; label: string; num?: boolean }
// a cell: a plain value, or { v, t } — sorted by v, shown as t ("Best": 1 shown as "1st")
export type BoardCellValue = string | number | null | { v: string | number; t: string }
export type BoardRow = { id: string; name: string; href: string; sub?: string | null; values: Record<string, BoardCellValue> }
const sortVal = (c: BoardCellValue | undefined) => (c != null && typeof c === 'object' ? c.v : c ?? null)
const showVal = (c: BoardCellValue | undefined) => (c != null && typeof c === 'object' ? c.t : c ?? '')

const TH = 'px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap select-none cursor-pointer hover:text-slate-300'

// then: the order inside ties of the sorted column (medals by year: then by place)
export function SortableBoard({ cols, rows, initial, then, live, maxHeight = 480 }: { cols: BoardCol[]; rows: BoardRow[]; initial: { key: string; desc: boolean }; then?: { key: string; desc: boolean }; live: boolean; maxHeight?: number }) {
  const [sort, setSort] = useState(initial)
  const sorted = useMemo(() => {
    const v = (r: BoardRow) => (sort.key === 'name' ? r.name : sortVal(r.values[sort.key]))
    return [...rows].sort((a, b) => {
      const x = v(a), y = v(b)
      if (x == null && y == null) return a.name.localeCompare(b.name)
      if (x == null) return 1
      if (y == null) return -1
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
      if (c) return sort.desc ? -c : c
      if (then && then.key !== sort.key) {
        const p = sortVal(a.values[then.key]), q = sortVal(b.values[then.key])
        const d = p != null && q != null ? (typeof p === 'number' && typeof q === 'number' ? p - q : String(p).localeCompare(String(q))) : 0
        if (d) return then.desc ? -d : d
      }
      return a.name.localeCompare(b.name)
    })
  }, [rows, sort, then])
  const rankOf = (i: number) => {
    const key = (r: BoardRow) => (sort.key === 'name' ? r.name : sortVal(r.values[sort.key]))
    let j = i
    while (j > 0 && key(sorted[j - 1]) === key(sorted[i])) j--
    return j + 1
  }
  const click = (key: string, num?: boolean) => setSort(s => (s.key === key ? { key, desc: !s.desc } : { key, desc: !!num }))
  const arrow = (key: string) => (sort.key === key ? (sort.desc ? ' ▾' : ' ▴') : '')
  return (
    <div className="border border-black rounded-none overflow-auto" style={{ maxHeight }}>
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 z-10">
          <tr className="bg-slate-900 text-white">
            <th className={`${TH} text-left w-10 cursor-default hover:text-white`}>#</th>
            <th className={`${TH} text-left`} onClick={() => click('name')}>Wrestler{arrow('name')}</th>
            {cols.map(c => <th key={c.key} className={`${TH} ${c.num ? 'text-right' : 'text-left'}`} onClick={() => click(c.key, c.num)}>{c.label}{arrow(c.key)}</th>)}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={r.id} className={`border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
              <td className="px-3 py-1 tabular-nums text-slate-500">{rankOf(i)}</td>
              <td className="px-3 py-1 whitespace-nowrap">
                {live ? <Link href={r.href} className="font-semibold text-slate-800 hover:underline">{r.name}</Link> : <span className="font-semibold text-slate-800">{r.name}</span>}
                {r.sub && <span className="block text-[11px] text-slate-500">{r.sub}</span>}
              </td>
              {cols.map(c => <td key={c.key} className={`px-3 py-1 whitespace-nowrap ${c.num ? 'text-right tabular-nums font-semibold' : 'text-slate-600'}`}>{showVal(r.values[c.key])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
