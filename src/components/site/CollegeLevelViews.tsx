'use client'
// A college level's two views (Kyle 2026-11-18): Colleges — the colleges NJ wrestlers competed for — and Leaders —
// national champions, medals by year, back side warriors. Both arrive drawn from the server; this switches them.
import { useState, type ReactNode } from 'react'

export function CollegeLevelViews({ colleges, leaders }: { colleges: ReactNode; leaders: ReactNode }) {
  const [view, setView] = useState<'colleges' | 'leaders'>('colleges')
  const btn = (k: 'colleges' | 'leaders', label: string) => (
    <button onClick={() => setView(k)} className={`px-4 py-1.5 text-sm font-semibold border ${view === k ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-500 hover:text-slate-900'}`}>{label}</button>
  )
  return (
    <div>
      <div className="mb-4 inline-flex">{btn('colleges', 'Colleges')}{btn('leaders', 'Leaders')}</div>
      {view === 'colleges' ? colleges : leaders}
    </div>
  )
}
