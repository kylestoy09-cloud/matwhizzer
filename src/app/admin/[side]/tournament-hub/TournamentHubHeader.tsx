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
  seasonLabel: string
  totalM: number
  importedM: number
  totalF: number
  importedF: number
}

export function TournamentHubHeader({ seasonLabel, totalM, importedM, totalF, importedF }: Props) {
  const { gender } = useAdminGender()
  const total    = gender === 'M' ? totalM : totalF
  const imported = gender === 'M' ? importedM : importedF
  const pct      = total > 0 ? Math.round(imported / total * 100) : 0

  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-base font-bold text-slate-800">Tournament Hub</p>
        <p className="text-sm text-slate-500 font-medium">{seasonLabel}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Pill label="Tournaments" value={total} />
        <Pill label="Imported"    value={`${pct}%`} pct={pct} />
        <Pill label="Done"        value={imported} />
        <Pill label="Pending"     value={total - imported} />
      </div>
    </div>
  )
}
