// Leaderboard building blocks, all server-rendered: tab rows, the table (sortable headers and
// "load next 25" are plain links, so every view has its own URL), and the name cells.

import Link from 'next/link'
import { SchoolLogoBadge } from '@/components/SchoolLogoBadge'
import type { School } from '@/lib/leaderboards/data'

export function TabRow({ items, active, level = 1 }: {
  items: { key: string; label: string; href: string }[]
  active: string
  level?: 1 | 2 | 3
}) {
  const row = level === 1 ? 'border-b border-slate-200' : level === 2 ? 'border-b border-slate-100 bg-slate-50' : ''
  return (
    <div className={`flex items-center gap-0 overflow-x-auto ${row} ${level === 3 ? 'flex-wrap gap-1.5 py-2' : ''}`}>
      {items.map(it => {
        const on = it.key === active
        if (level === 3) {
          return (
            <Link key={it.key} href={it.href} scroll={false}
              className={`px-3 py-1 text-xs font-semibold border transition-colors ${on ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-900'}`}>
              {it.label}
            </Link>
          )
        }
        return (
          <Link key={it.key} href={it.href} scroll={false}
            className={`px-4 ${level === 1 ? 'py-2.5 font-semibold' : 'py-2 font-medium'} text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${on ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}>
            {it.label}
          </Link>
        )
      })}
    </div>
  )
}

export type Col<T> = {
  label: string
  align?: 'left' | 'right'
  render: (r: T) => React.ReactNode
  sort?: { key: string; href: string }   // a header link that re-sorts the table
}

export function LbTable<T>({ title, description, rows, cols, activeSort, moreHref, empty, error }: {
  title: string
  description?: string
  rows: T[]
  cols: Col<T>[]
  activeSort?: string
  moreHref?: string | null
  empty?: string
  error?: string | null
}) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <div className="border border-black overflow-x-auto bg-white">
        <table className="w-full text-sm min-w-[380px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-3 py-1 font-medium text-slate-500 w-8">#</th>
              {cols.map(c => (
                <th key={c.label} className={`px-3 py-1 font-medium select-none ${c.align === 'right' ? 'text-right' : 'text-left'} ${c.sort && c.sort.key === activeSort ? 'text-slate-900' : 'text-slate-500'}`}>
                  {c.sort ? (
                    <Link href={c.sort.href} scroll={false} className="hover:text-slate-900">
                      {c.label}<span className="ml-1 text-[10px] opacity-60">{c.sort.key === activeSort ? '▼' : '⇅'}</span>
                    </Link>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {error ? (
              <tr><td colSpan={cols.length + 1} className="px-3 py-4 text-center text-red-600 text-xs">Could not load this table.</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={cols.length + 1} className="px-3 py-4 text-center text-slate-400 text-xs">{empty ?? 'No data'}</td></tr>
            ) : rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-3 py-1 text-slate-400 text-xs tabular-nums">{i + 1}</td>
                {cols.map(c => (
                  <td key={c.label} className={`px-3 py-1 ${c.align === 'right' ? 'text-right' : ''}`}>{c.render(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {moreHref && (
        <div className="mt-2 text-center">
          <Link href={moreHref} scroll={false} className="inline-block px-4 py-1.5 text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:border-slate-900">
            Load next 25
          </Link>
        </div>
      )}
    </section>
  )
}

export function WrestlerCell({ base, id, name, school }: { base: string; id: string; name: string; school: School | null }) {
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      <SchoolLogoBadge logoUrl={school?.logo_url} bgColor={school?.header_background} placeholder />
      <Link href={`${base}/wrestler/${id}`} className="font-medium text-slate-800 hover:text-slate-600 truncate">{name}</Link>
      {school && <span className="text-slate-400 text-xs shrink-0">{school.display_name}</span>}
    </span>
  )
}

export function SchoolCell({ base, school }: { base: string; school: School | null }) {
  if (!school) return <span className="text-slate-400">TBD</span>
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      <SchoolLogoBadge logoUrl={school.logo_url} bgColor={school.header_background} placeholder />
      <Link href={`${base}/schools/${school.id}`} className="font-medium text-slate-800 hover:text-slate-600 truncate">{school.display_name}</Link>
    </span>
  )
}

export const num = (v: number | null | undefined, digits = 0) =>
  v == null ? '—' : Number(v).toFixed(digits)

export function fmtTime(secs: number | null | undefined): string {
  if (secs == null) return '—'
  const s = Math.round(Number(secs))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
