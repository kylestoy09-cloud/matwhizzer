import type { ReactNode } from 'react'

export type StatsColumn = {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  numeric?: boolean
  className?: string
}

export type StatsTableProps = {
  columns: StatsColumn[]
  rows: Record<string, ReactNode>[]
  highlightCondition?: (row: Record<string, ReactNode>) => boolean
  footer?: Record<string, ReactNode>
}

function colAlignClass(col: StatsColumn, isFirst: boolean): string {
  const align = col.align ?? (isFirst ? 'left' : 'center')
  return align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center'
}

export function StatsTable({ columns, rows, highlightCondition, footer }: StatsTableProps) {
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900 text-white">
              {columns.map((col, i) => (
                <th
                  key={col.key}
                  className={`px-3 py-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap ${colAlignClass(col, i === 0)} ${col.className ?? ''}`}
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
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  {columns.map((col, j) => {
                    const isNumeric = col.numeric ?? j > 0
                    return (
                      <td
                        key={col.key}
                        className={`px-3 py-2 border-t border-slate-100 ${colAlignClass(col, j === 0)} ${
                          j === 0 ? 'font-medium text-slate-800' : 'text-slate-700'
                        } ${isNumeric ? 'tabular-nums' : ''} ${highlight ? 'font-bold' : ''} ${col.className ?? ''}`}
                      >
                        {row[col.key] ?? '—'}
                      </td>
                    )
                  })}
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
          {footer && (
            <tfoot>
              <tr className="bg-slate-100 font-bold">
                {columns.map((col, j) => {
                  const isNumeric = col.numeric ?? j > 0
                  return (
                    <td
                      key={col.key}
                      className={`px-3 py-2 border-t-2 border-slate-300 ${colAlignClass(col, j === 0)} ${isNumeric ? 'tabular-nums' : ''} text-slate-800 font-bold ${col.className ?? ''}`}
                    >
                      {footer[col.key] ?? ''}
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
