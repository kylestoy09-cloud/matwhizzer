// The stats board (Kyle 2026-11-18, Aesthetic mock until he approves): a row of boxes, each category in a navy header
// two lines tall (so two-word names like "Power Rankings" sit inside it), the number bold under it, a note below
// (a state rank). Boxes the size of the old white ones. Used by the school profile and the college page.
import type { ReactNode } from 'react'

export const BOARD_NAVY = '#16284A'

/** The board's frame: navy hairlines between the boxes. cols = classes for the grid's columns */
export function StatBoard({ cols, children, className = 'mb-4' }: { cols: string; children: ReactNode; className?: string }) {
  return (
    <div className={`grid ${cols} gap-px border overflow-hidden rounded-lg ${className}`} style={{ backgroundColor: BOARD_NAVY, borderColor: BOARD_NAVY }}>
      {children}
    </div>
  )
}

export function BoardCell({ label, children, sub }: { label: string; children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="bg-white min-w-0 flex flex-col">
      <div className="h-8 px-1.5 flex items-center justify-center text-center text-[10px] font-bold uppercase tracking-wide text-white leading-[1.15]" style={{ backgroundColor: BOARD_NAVY }}>{label}</div>
      <div className="px-2 py-2 text-center">
        <div className="text-xl font-black tabular-nums text-slate-900 leading-tight">{children}</div>
        <div className="mt-0.5 min-h-3 text-[10px] font-semibold text-emerald-600 leading-tight">{sub}</div>
      </div>
    </div>
  )
}
