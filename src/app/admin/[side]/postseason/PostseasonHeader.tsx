'use client'

import { useState } from 'react'
import { useAdminGender } from '@/components/admin/AdminGenderContext'

type PctRow = { label: string; pct: number }

function CountRow({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-500 w-36 shrink-0">{label}</span>
      <span className="text-[11px] font-semibold text-slate-700 tabular-nums">{count.toLocaleString()}</span>
    </div>
  )
}

function PctBar({ label, pct }: PctRow) {
  const color = pct >= 100 ? 'bg-green-400' : pct >= 50 ? 'bg-blue-400' : 'bg-slate-300'
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-500 w-36 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-semibold text-slate-700 tabular-nums w-8 text-right">{pct}%</span>
    </div>
  )
}

export type TeamStats = {
  bracketsPct: number
  firstRoundPct: number
  playoffMatchesPct: number
}

export type IndividualStats = {
  districtSeedsPct: number
  districtMatchesPct: number
  regionSeedsPct: number
  regionMatchesPct: number
  stateSeedsPct: number
  stateMatchesPct: number
  districtWrestlers: number
  regionWrestlers: number
  stateWrestlers: number
}

type Props = {
  seasonLabel: string
  teamM: TeamStats
  teamF: TeamStats
  individualM: IndividualStats
  individualF: IndividualStats
}

export function PostseasonHeader({ seasonLabel, teamM, teamF, individualM, individualF }: Props) {
  const { gender } = useAdminGender()
  const [mode, setMode] = useState<'team' | 'individual'>('team')

  const team       = gender === 'M' ? teamM : teamF
  const individual = gender === 'M' ? individualM : individualF

  return (
    <div>
      {/* Title row + toggle */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-slate-100">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Postseason</p>
          <p className="text-sm font-semibold text-slate-700">{seasonLabel}</p>
        </div>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden ml-auto">
          <button
            onClick={() => setMode('team')}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              mode === 'team' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Team
          </button>
          <button
            onClick={() => setMode('individual')}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              mode === 'individual' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Individual
          </button>
        </div>
        <p className="text-xs text-slate-400">
          {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats row */}
      <div className="px-4 py-3 space-y-1.5">
        {mode === 'team' ? (
          <>
            <PctBar label="Brackets Created"    pct={team.bracketsPct} />
            <PctBar label="First Round Matches" pct={team.firstRoundPct} />
            <PctBar label="Playoff Matches Set" pct={team.playoffMatchesPct} />
          </>
        ) : (
          <>
            <PctBar label="District Seeds"   pct={individual.districtSeedsPct} />
            <PctBar label="District Matches" pct={individual.districtMatchesPct} />
            <PctBar label="Region Seeds"     pct={individual.regionSeedsPct} />
            <PctBar label="Region Matches"   pct={individual.regionMatchesPct} />
            <PctBar label="State Seeds"      pct={individual.stateSeedsPct} />
            <PctBar label="State Matches"    pct={individual.stateMatchesPct} />
            <div className="pt-1 border-t border-slate-100 space-y-1.5">
              <CountRow label="Wrestlers at Districts" count={individual.districtWrestlers} />
              <CountRow label="Wrestlers at Regions"   count={individual.regionWrestlers} />
              <CountRow label="Wrestlers at State"     count={individual.stateWrestlers} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
