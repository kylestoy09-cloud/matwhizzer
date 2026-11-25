'use client'
// The long lists on a History tab (Kyle 2026-11-16): the first rows, then a button for the next batch; the
// multi-time champions under 4x / 3x / 2x tabs. Rows come rendered from the server.
import { useState, type ReactNode } from 'react'
import { SiteTabs } from '@/components/site/SiteTabs'

const th = 'px-3 py-1 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap'

export function MoreTable({ head, rows, first = 10, step = 10, empty = 'None' }: { head: string[]; rows: ReactNode[]; first?: number; step?: number; empty?: string }) {
  const [shown, setShown] = useState(first)
  const left = rows.length - shown
  return (
    <div>
      <div className="overflow-x-auto border border-black">
        <table className="w-full text-[13px]">
          <thead><tr className="bg-slate-900 text-white">{head.map((h, i) => <th key={i} className={th}>{h}</th>)}</tr></thead>
          <tbody>{rows.length ? rows.slice(0, shown) : <tr><td className="px-3 py-1 text-slate-400" colSpan={head.length}>{empty}</td></tr>}</tbody>
        </table>
      </div>
      {left > 0 && (
        <button onClick={() => setShown(s => s + step)}
          className="mt-3 w-full py-2 text-sm font-medium text-slate-500 hover:text-slate-800 border border-slate-200 rounded-none hover:bg-slate-50 transition-colors">
          Show more ({Math.min(step, left)} more)
        </button>
      )}
    </div>
  )
}

export function MultiChampTabs({ groups }: { groups: { key: string; label: string; rows: ReactNode[] }[] }) {
  const [tab, setTab] = useState(groups[0]?.key ?? '')
  const g = groups.find(x => x.key === tab)
  return (
    <div>
      <SiteTabs level={2} active={tab} items={groups.map(x => ({ key: x.key, label: `${x.label} (${x.rows.length})`, onClick: () => setTab(x.key) }))} />
      <div className="mt-2"><MoreTable key={tab} head={['#', 'Wrestler', 'Years']} rows={g?.rows ?? []} /></div>
    </div>
  )
}
