'use client'

import { useSeasons } from '@/components/SeasonsProvider'
import { workingSeason } from '@/lib/seasons'
import { TournamentRegistryClient } from '@/app/admin/[side]/tournament-registry/TournamentRegistryClient'

// Preseason step: enter this season's tournaments and dates by hand in the Tournament
// Registry. The Tournament Checklist compares the imported tournaments against this list.
export function TournamentScheduleWorkspace() {
  const { seasons } = useSeasons()
  const M = workingSeason(seasons, 'M')?.label
  const F = workingSeason(seasons, 'F')?.label
  if (!M || !F) return <p className="p-4 text-sm text-slate-400">Loading seasons…</p>
  return (
    <div className="p-4">
      <p className="text-sm text-slate-600 mb-4">
        Enter every tournament on this season&apos;s schedule with its dates. The Tournament Checklist
        compares the imported results against this list.
      </p>
      <TournamentRegistryClient seasonByGender={{ M, F }} />
    </div>
  )
}
