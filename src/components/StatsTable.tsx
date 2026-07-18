import type { ReactNode } from 'react'

export type StatsColumn = {
  key: string
  label: string
}

export type StatsTableProps = {
  columns: StatsColumn[]
  rows: Record<string, ReactNode>[]
  highlightCondition?: (row: Record<string, ReactNode>) => boolean
}

export function StatsTable({ columns, rows, highlightCondition }: StatsTableProps) {
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900 text-white">
              {columns.map((col, i) => (
                <th
                  key={col.key}
                  className={`px-3 py-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap ${
                    i === 0 ? 'text-left' : 'text-center'
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const highlight = highlightCondition?.(row) ?? false
              return (
                <tr
                  key={i}
                  className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                >
                  {columns.map((col, j) => (
                    <td
                      key={col.key}
                      className={`px-3 py-2 border-t border-slate-100 ${
                        j === 0
                          ? 'text-left font-medium text-slate-800'
                          : 'text-center text-slate-700 tabular-nums'
                      } ${highlight ? 'font-bold' : ''}`}
                    >
                      {row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-6 text-center text-sm text-slate-400 border-t border-slate-100"
                >
                  No data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
