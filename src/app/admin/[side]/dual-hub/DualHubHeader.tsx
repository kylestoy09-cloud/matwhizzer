'use client'

import { useAdminGender } from '@/components/admin/AdminGenderContext'

type StatPill = { label: string; value: string | number; pct?: number }

function Pill({ label, value, pct }: StatPill) {
  const color = pct === undefined ? 'text-slate-800'
    : pct >= 80 ? 'text-green-600' : pct >= 40 ? 'text-amber-600' : 'text-slate-500'
  const bar = pct === undefined ? null
    : pct >= 80 ? 'bg-green-400' : pct >= 40 ? 'bg-amber-400' : 'bg-slate-300'

  return (
    <div className="flex flex-col gap-1.5 px-4 py-3 border border-slate-100 rounded-lg bg-slate-50 min-w-[110px]">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`text-2xl font-bold tabular-nums leading-none ${color}`}>{value}</p>
      {bar && (
        <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(pct!, 100)}%` }} />
        </div>
      )}
    </div>
  )
}

type Props = {
  totalM: number
  completedM: number
  totalF: number
  completedF: number
}

export function DualHubHeader({ totalM, completedM, totalF, completedF }: Props) {
  const { gender } = useAdminGender()
  const total     = gender === 'M' ? totalM : totalF
  const completed = gender === 'M' ? completedM : completedF
  const pct       = total > 0 ? Math.round(completed / total * 100) : 0

  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-base font-bold text-slate-800">Dual Hub</p>
        <p className="text-sm text-slate-500 font-medium">Dual Meets</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Pill label="Total Duals"  value={total} />
        <Pill label="With Results" value={`${pct}%`} pct={pct} />
        <Pill label="Completed"    value={completed} />
        <Pill label="Pending"      value={total - completed} />
      </div>
    </div>
  )
}
