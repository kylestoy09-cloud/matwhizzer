'use client'
// The college list on the Collegiate page (Kyle 2026-11-21: "make it so that you can sort to most all americans, most
// titles and earliest year"): click a column to sort by it, again to flip it. Opens on most NJSIAA wrestlers.
import Link from 'next/link'
import { useMemo, useState } from 'react'

export type CollegeListRow = { id: number; name: string; color: string; href: string | null; wrestlers: number; aa: number; titles: number; first: number; last: number }
type Key = 'name' | 'wrestlers' | 'aa' | 'titles' | 'first'

const TH = 'text-left px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap'
const COLS: { key: Key; label: string; desc: boolean }[] = [
  { key: 'name', label: 'College', desc: false }, { key: 'wrestlers', label: 'NJSIAA Wrestlers', desc: true },
  { key: 'aa', label: 'All-Americans', desc: true }, { key: 'titles', label: 'Titles', desc: true }, { key: 'first', label: 'Years', desc: false },
]

export function CollegeListTable({ rows }: { rows: CollegeListRow[] }) {
  const [sort, setSort] = useState<{ key: Key; desc: boolean }>({ key: 'wrestlers', desc: true })
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const d = sort.key === 'name' ? a.name.localeCompare(b.name) : a[sort.key] - b[sort.key]
    return (sort.desc ? -d : d) || b.wrestlers - a.wrestlers || a.name.localeCompare(b.name)
  }), [rows, sort])
  return (
    <div className="border border-black rounded-none overflow-x-auto">
      <table className="min-w-max w-full text-[13px]">
        <thead><tr className="bg-slate-900 text-white">{COLS.map(c => (
          <th key={c.key} className={TH}>
            <button onClick={() => setSort(s => (s.key === c.key ? { key: c.key, desc: !s.desc } : { key: c.key, desc: c.desc }))} className="uppercase hover:underline">
              {c.label}{sort.key === c.key ? (sort.desc ? ' ▼' : ' ▲') : ''}
            </button>
          </th>))}</tr></thead>
        <tbody>
          {sorted.map((c, i) => {
            const inner = <><span className="inline-block h-3 w-3 border border-slate-300" style={{ background: c.color }} />{c.name}</>
            return (
              <tr key={c.id} className={`border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <td className="px-3 py-1 whitespace-nowrap">
                  {c.href ? <Link href={c.href} className="inline-flex items-center gap-2 font-semibold text-slate-800 hover:underline">{inner}</Link>
                    : <span className="inline-flex items-center gap-2 font-semibold text-slate-800">{inner}</span>}
                </td>
                <td className="px-3 py-1 tabular-nums">{c.wrestlers}</td>
                <td className="px-3 py-1 tabular-nums">{c.aa || ''}</td>
                <td className="px-3 py-1 tabular-nums">{c.titles || ''}</td>
                <td className="px-3 py-1 tabular-nums text-slate-500">{c.first === c.last ? c.first : `${c.first}–${c.last}`}</td>
              </tr>)
          })}
        </tbody>
      </table>
    </div>
  )
}
