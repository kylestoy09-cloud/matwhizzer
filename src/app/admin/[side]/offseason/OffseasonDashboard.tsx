'use client'

import { DashboardShell } from '../dashboards/DashboardShell'

function OffseasonHeader({ seasonLabel }: { seasonLabel: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Off Season</p>
        <p className="text-sm font-semibold text-slate-700">{seasonLabel}</p>
      </div>
      <p className="text-xs text-slate-400 ml-auto">
        {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>
      <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
        Off-Season header stats — coming soon
      </span>
    </div>
  )
}

export function OffseasonDashboard({ seasonLabel }: { seasonLabel: string }) {
  return (
    <DashboardShell
      dashboard="offseason"
      header={<OffseasonHeader seasonLabel={seasonLabel} />}
    />
  )
}
