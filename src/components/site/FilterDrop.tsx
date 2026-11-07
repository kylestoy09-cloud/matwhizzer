'use client'
// The standard filter dropdown (2026-11-07, Kyle): a label, what's picked under it ("All" when nothing
// is), and a dropdown of checkboxes. Used by the Leaders "Filter by" box and the Scores controls, where
// Conference and Section / Group switch each other off (disabled shows "Off").
import { useEffect, useRef } from 'react'

export type FilterOption = { value: string; label: string }

export function FilterDrop({ label, options, picked, onChange, disabled = false, open, setOpen }: {
  label: string; options: FilterOption[]; picked: Set<string>; onChange: (v: Set<string>) => void
  disabled?: boolean; open: boolean; setOpen: (v: boolean) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  // a click outside closes it
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open, setOpen])
  const names = options.filter(o => picked.has(o.value)).map(o => o.label)
  const shown = names.length === 0 ? 'All' : names.join(', ')
  return (
    <div ref={ref} className={`relative flex-1 min-w-[160px] ${disabled ? 'opacity-40' : ''}`}>
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      <div className="mb-1 truncate text-xs font-semibold text-slate-800" title={shown}>{disabled ? 'Off' : shown}</div>
      <button type="button" disabled={disabled} onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 disabled:cursor-not-allowed">
        <span>{names.length === 0 ? 'All' : `${names.length} selected`}</span><span className="text-slate-400">{open ? '▴' : '▾'}</span>
      </button>
      {open && !disabled && (
        <div className="absolute left-0 right-0 z-20 border border-t-0 border-slate-200 bg-white max-h-56 overflow-y-auto divide-y divide-slate-100 shadow-sm">
          {options.map(o => (
            <label key={o.value} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" checked={picked.has(o.value)} className="accent-slate-800 shrink-0"
                onChange={() => { const n = new Set(picked); if (n.has(o.value)) n.delete(o.value); else n.add(o.value); onChange(n) }} />
              <span className="text-xs text-slate-700">{o.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
