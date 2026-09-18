'use client'

import { useState } from 'react'
import { RankingsClientGirls } from '../rankings/RankingsClientGirls'
import { HammerScoresPageClientGirls } from '../hammer-scores/HammerScoresPageClientGirls'
import { IndividualRankingsShellGirls } from '../rankings/individual/IndividualRankingsShellGirls'
import { TeamRankingsClientGirls } from '../rankings/team/TeamRankingsClientGirls'
import { ArchiveClient } from '../rankings/archive/ArchiveClient'

type Tool = 'hammer' | 'individual' | 'team' | 'archive'

const TABS: { id: Tool; label: string }[] = [
  { id: 'hammer',     label: 'Hammer Scores' },
  { id: 'individual', label: 'Individual Rankings' },
  { id: 'team',       label: 'Team Rankings' },
  { id: 'archive',    label: 'Archive' },
]

export function RankingsHubClientGirls({ currentSeason }: { currentSeason: string }) {
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
            <RankingsClientGirls />
            <HammerScoresPageClientGirls />
          </div>
        )}
        {tool === 'individual' && <IndividualRankingsShellGirls currentSeason={currentSeason} />}
        {tool === 'team' && <TeamRankingsClientGirls />}
        {tool === 'archive' && <ArchiveClient />}
      </div>
    </div>
  )
}
