'use client'

import { useState } from 'react'
import { RankingsClientBoys } from '../rankings/RankingsClientBoys'
import { HammerScoresPageClientBoys } from '../hammer-scores/HammerScoresPageClientBoys'
import { IndividualRankingsShellBoys } from '../rankings/individual/IndividualRankingsShellBoys'
import { TeamRankingsClientBoys } from '../rankings/team/TeamRankingsClientBoys'
import { ArchiveClient } from '../rankings/archive/ArchiveClient'
import { RATING_NAME } from '@/lib/rating'

type Tool = 'hammer' | 'individual' | 'team' | 'archive'

const TABS: { id: Tool; label: string }[] = [
  { id: 'hammer',     label: RATING_NAME },
  { id: 'individual', label: 'Individual Rankings' },
  { id: 'team',       label: 'Team Rankings' },
  { id: 'archive',    label: 'Archive' },
]

export function RankingsHubClientBoys({ currentSeason }: { currentSeason: string }) {
  const [tool, setTool] = useState<Tool>('hammer')

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-slate-200 overflow-x-auto shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap -mb-px border-b-2 transition-colors ${
              tool === t.id
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tool === 'hammer' && (
          <div className="space-y-6">
            <RankingsClientBoys />
            <HammerScoresPageClientBoys />
          </div>
        )}
        {tool === 'individual' && <IndividualRankingsShellBoys currentSeason={currentSeason} />}
        {tool === 'team' && <TeamRankingsClientBoys />}
        {tool === 'archive' && <ArchiveClient />}
      </div>
    </div>
  )
}
