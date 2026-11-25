'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminGender } from '@/components/admin/AdminGenderContext'

type StatPill = { label: string; value: string | number; pct?: number; note?: string }

function Pill({ label, value, pct, note }: StatPill) {
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
      {note && <p className="text-[10px] text-slate-400 leading-tight">{note}</p>}
    </div>
  )
}

export type GenderPreseasonStats = {
  total: number          // this gender's NJ programs
  pctGrades: number
  pctGradeReviews: number
  pctAddress: number
  pctWebsite: number
  pctTwitter: number
  pctFacebook: number
  pctAdName: number
  pctAdEmail: number
  pctCoaches: number
  pctAds: number
  pctCoachEmail: number
  pctSchedules: number
  pctRosters: number
  pctHudl: number
  pctNfhs: number
  pctTransfers: number            // 0 or 100: the preseason task Complete Transfers, done this preseason
  pctTournamentRollover: number
}

type Props = {
  seasonLabelM: string
  seasonLabelF: string
  statsM: GenderPreseasonStats
  statsF: GenderPreseasonStats
}

// Kyle 2026-11-11: the bar at the top is the average of the essential categories, so it reaches 100% only
// when every one of them does. Twitter, Facebook, coach email, AD name, AD email and streaming links are
// collected too but left out of it.
function essential(s: GenderPreseasonStats): { label: string; pct: number; note?: string }[] {
  return [
    { label: 'Grades',              pct: s.pctGrades },
    { label: 'Grade Reviews',       pct: s.pctGradeReviews },
    { label: 'Addresses',           pct: s.pctAddress },
    { label: 'Websites',            pct: s.pctWebsite },
    { label: 'Coaches',             pct: s.pctCoaches },
    { label: 'Schedules',           pct: s.pctSchedules },
    { label: 'Rosters',             pct: s.pctRosters },
    { label: 'Transfers',           pct: s.pctTransfers, note: s.pctTransfers === 100 ? 'marked complete' : 'task: Complete Transfers' },
    { label: 'Tournament Rollover', pct: s.pctTournamentRollover, note: s.pctTournamentRollover === 100 ? 'all of last season\'s handled' : 'last season\'s rolled over or not returning (Hub)' },
  ]
}

export function PreseasonHeader({ seasonLabelM, seasonLabelF, statsM, statsF }: Props) {
  const { gender } = useAdminGender()
  const router = useRouter()
  const stats = gender === 'M' ? statsM : statsF
  const seasonLabel = gender === 'M' ? seasonLabelM : seasonLabelF

  // Live: recount after a save in the directory or a tool below, and when the tab comes back into view
  useEffect(() => {
    const refresh = () => router.refresh()
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('preseason-data-changed', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => { window.removeEventListener('preseason-data-changed', refresh); document.removeEventListener('visibilitychange', onVisible) }
  }, [router])

  const cats = essential(stats)
  const overall = Math.round(cats.reduce((n, c) => n + c.pct, 0) / cats.length)
  const overallBar = overall === 100 ? 'bg-green-500' : overall >= 40 ? 'bg-amber-400' : 'bg-slate-400'

  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-base font-bold text-slate-800">Preseason Dashboard</p>
        <p className="text-sm text-slate-500 font-medium">{seasonLabel} · {stats.total} schools</p>
      </div>

      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Preseason complete</p>
          <p className={`text-xl font-bold tabular-nums ${overall === 100 ? 'text-green-600' : 'text-slate-800'}`}>{overall}%</p>
        </div>
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow={overall} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full rounded-full transition-all ${overallBar}`} style={{ width: `${overall}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {cats.map(c => <Pill key={c.label} label={c.label} value={`${c.pct}%`} pct={c.pct} note={c.note} />)}
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        <Pill label="Twitter"     value={`${stats.pctTwitter}%`}    pct={stats.pctTwitter} />
        <Pill label="Facebook"    value={`${stats.pctFacebook}%`}   pct={stats.pctFacebook} />
        <Pill label="Coach Email" value={`${stats.pctCoachEmail}%`} pct={stats.pctCoachEmail} />
        <Pill label="AD Name"     value={`${stats.pctAdName}%`}     pct={stats.pctAdName} />
        <Pill label="AD Email"    value={`${stats.pctAdEmail}%`}    pct={stats.pctAdEmail} />
        <Pill label="Hudl"        value={`${stats.pctHudl}%`}       pct={stats.pctHudl} />
        <Pill label="NFHS"        value={`${stats.pctNfhs}%`}       pct={stats.pctNfhs} />
      </div>
    </div>
  )
}
