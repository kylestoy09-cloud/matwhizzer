'use client'

import { useAdminGender } from '@/components/admin/AdminGenderContext'

type ColItem = { label: string; done: number; total: number }

export type GenderSeasonData = {
  schoolCount: number     // this gender's NJ programs for the live season
  wrestlerCount: number
  completed: ColItem[]
  today: ColItem[]
  upcoming: ColItem[]
}

function CountBlock({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col px-4 py-2 border-r border-slate-100 last:border-r-0 shrink-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-xl font-bold text-slate-800 tabular-nums">{value}</p>
    </div>
  )
}

function StatusCol({ title, items, accent }: { title: string; items: ColItem[]; accent: string }) {
  return (
    <div className="flex-1 px-3 py-2 border-r border-slate-100 last:border-r-0">
      <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${accent}`}>{title}</p>
      <div className="space-y-1">
        {items.map(item => (
          <div key={item.label} className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">{item.label}</span>
            <span className="text-[11px] font-semibold text-slate-700 tabular-nums">
              {item.done}<span className="text-slate-400 font-normal">/{item.total}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

type Props = {
  seasonLabel: string
  dataM: GenderSeasonData
  dataF: GenderSeasonData
}

export function SeasonHeader({ seasonLabel, dataM, dataF }: Props) {
  const { gender } = useAdminGender()
  const data = gender === 'M' ? dataM : dataF

  return (
    <div>
      {/* Row 1: title + date */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-100">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Season</p>
        <p className="text-sm font-semibold text-slate-700">{seasonLabel}</p>
        <p className="text-xs text-slate-400 ml-auto">
          {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Row 2: school + wrestler counts */}
      <div className="flex border-b border-slate-100 overflow-x-auto">
        <CountBlock label="Schools"   value={data.schoolCount} />
        <CountBlock label="Wrestlers" value={data.wrestlerCount} />
      </div>

      {/* Row 3: completed / today / upcoming */}
      <div className="flex overflow-x-auto">
        <StatusCol title="Completed" items={data.completed} accent="text-green-600" />
        <StatusCol title="Today"     items={data.today}     accent="text-blue-600" />
        <StatusCol title="Upcoming"  items={data.upcoming}  accent="text-slate-500" />
      </div>
    </div>
  )
}
