'use client'

// State picker for a new out-of-state school in import review (Kyle 2026-11-10: the review settles the state).
import { US_STATES } from '@/lib/usStates'

export function StateSelect({ value, onChange, className = '' }: { value: string; onChange: (st: string) => void; className?: string }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label="State"
      className={`text-xs border border-amber-400 px-1 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 ${className}`}
    >
      <option value="">State…</option>
      {US_STATES.map(st => <option key={st} value={st}>{st}</option>)}
    </select>
  )
}
