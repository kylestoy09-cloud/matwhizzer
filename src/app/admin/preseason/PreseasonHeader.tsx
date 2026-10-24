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
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}

export type GenderPreseasonStats = {
  pctCoaches: number
  pctAds: number
  pctCoachEmail: number
  pctSchedules: number
  pctRosters: number
  pctCompleted: number
}

type Props = {
  seasonLabelM: string
  seasonLabelF: string
  total: number
  pctGrades:   number
  pctGradeReviews: number
  pctAddress:  number
  pctWebsite:  number
  pctTwitter:  number
  pctFacebook: number
  pctAdName:   number
  pctAdEmail:  number
  statsM: GenderPreseasonStats
  statsF: GenderPreseasonStats
}

export function PreseasonHeader({ seasonLabelM, seasonLabelF, total, pctGrades, pctGradeReviews, pctAddress, pctWebsite, pctTwitter, pctFacebook, pctAdName, pctAdEmail, statsM, statsF }: Props) {
  const { gender } = useAdminGender()
  const stats = gender === 'M' ? statsM : statsF
  const seasonLabel = gender === 'M' ? seasonLabelM : seasonLabelF

  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-base font-bold text-slate-800">Preseason Dashboard</p>
        <p className="text-sm text-slate-500 font-medium">{seasonLabel}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Pill label="Schools"      value={total} />
        <Pill label="Grades"       value={`${pctGrades}%`}             pct={pctGrades} />
        <Pill label="Grade Reviews" value={`${pctGradeReviews}%`}      pct={pctGradeReviews} />
        <Pill label="Addresses"    value={`${pctAddress}%`}            pct={pctAddress} />
        <Pill label="Websites"     value={`${pctWebsite}%`}            pct={pctWebsite} />
        <Pill label="Twitter"      value={`${pctTwitter}%`}            pct={pctTwitter} />
        <Pill label="Facebook"     value={`${pctFacebook}%`}           pct={pctFacebook} />
        <Pill label="Coaches"      value={`${stats.pctCoaches}%`}      pct={stats.pctCoaches} />
        <Pill label="Coach Email"  value={`${stats.pctCoachEmail}%`}   pct={stats.pctCoachEmail} />
        <Pill label="AD Name"      value={`${pctAdName}%`}             pct={pctAdName} />
        <Pill label="AD Email"     value={`${pctAdEmail}%`}            pct={pctAdEmail} />
        <Pill label="Schedules"    value={`${stats.pctSchedules}%`}    pct={stats.pctSchedules} />
        <Pill label="Rosters"      value={`${stats.pctRosters}%`}      pct={stats.pctRosters} />
        <Pill label="Completed"    value={`${stats.pctCompleted}%`}    pct={stats.pctCompleted} />
      </div>
    </div>
  )
}
