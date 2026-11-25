'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { DualsTab } from './tabs/DualsTab'
import { NjsiaaTab } from './tabs/NjsiaaTab'
import { StandingsTab } from './tabs/StandingsTab'
import { DirectoryTab, SchoolsTab, WrestlersTab, CoachesTab, TournamentsTab, LeaderboardsTab, PlayoffsTab, EndOfSeasonTab } from './tabs/SeasonTabs'

export type PastSeason = { id: number; year_label: string; end_year: number }

// Directory first: the preseason dashboard's spreadsheet with that season's own data (Kyle 2026-11-12)
const TABS = [
  { id: 'directory',    label: 'Directory' },
  { id: 'duals',        label: 'Duals' },
  { id: 'standings',    label: 'Standings' },
  { id: 'schools',      label: 'Schools' },
  { id: 'wrestlers',    label: 'Wrestlers' },
  { id: 'coaches',      label: 'Coaches' },
  { id: 'tournaments',  label: 'Tournaments' },
  { id: 'leaderboards', label: 'Leaderboards' },
  { id: 'playoffs',     label: 'Playoffs' },
  { id: 'njsiaa',       label: 'NJSIAA' },
  { id: 'end-of-season', label: 'End of Season' },
] as const

type TabId = typeof TABS[number]['id']

type Props = {
  seasons: PastSeason[]
  gender: 'M' | 'F'
}

function PastSeasonsInner({ seasons, gender }: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const seasonParam  = searchParams.get('season') ?? seasons[0]?.year_label ?? ''
  const tabParam     = (searchParams.get('tab') ?? 'directory') as TabId

  const genderLabel = gender === 'M' ? 'Boys' : 'Girls'

  function navigate(season: string, tab: TabId) {
    const params = new URLSearchParams({ season, tab })
    router.replace(`?${params.toString()}`)
  }

  const selectedSeason = seasons.find(s => s.year_label === seasonParam) ?? seasons[0] ?? null

  if (seasons.length === 0) {
    return (
      <div className="p-8 max-w-3xl">
        <h1 className="text-xl font-bold text-slate-800 mb-2">Past Seasons — {genderLabel}</h1>
        <p className="text-slate-500 text-sm">No past seasons found. Past seasons appear here after a season is finalized and you roll over to the next one.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full">

      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center gap-4">
        <h1 className="text-sm font-bold text-slate-800 shrink-0">Past Seasons — {genderLabel}</h1>
        <select
          value={seasonParam}
          onChange={e => navigate(e.target.value, tabParam)}
          className="border border-slate-200 rounded px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
        >
          {seasons.map(s => (
            <option key={s.id} value={s.year_label}>{s.year_label}</option>
          ))}
        </select>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-100 bg-white px-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(seasonParam, tab.id)}
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
              tabParam === tab.id
                ? 'border-slate-800 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 p-6">
        {selectedSeason && (
          <TabContent tab={tabParam} season={selectedSeason} gender={gender} />
        )}
      </div>

    </div>
  )
}

function TabContent({ tab, season, gender }: { tab: TabId; season: PastSeason; gender: 'M' | 'F' }) {
  switch (tab) {
    case 'directory':
      return <DirectoryTab season={season} gender={gender} />
    case 'end-of-season':
      return <EndOfSeasonTab season={season} gender={gender} />
    case 'duals':
      return <DualsTabWrapper season={season} gender={gender} />
    case 'standings':
      return <StandingsTab season={season} gender={gender} />
    case 'schools':
      return <SchoolsTab season={season} gender={gender} />
    case 'wrestlers':
      return <WrestlersTab season={season} gender={gender} />
    case 'coaches':
      return <CoachesTab season={season} gender={gender} />
    case 'tournaments':
      return <TournamentsTab season={season} gender={gender} />
    case 'leaderboards':
      return <LeaderboardsTab season={season} gender={gender} />
    case 'playoffs':
      return <PlayoffsTab season={season} gender={gender} />
    case 'njsiaa':
      return <NjsiaaTab season={season} gender={gender} />
  }
}

function DualsTabWrapper({ season, gender }: { season: PastSeason; gender: 'M' | 'F' }) {
  return <DualsTab season={season} gender={gender} />
}

export function PastSeasonsClient(props: Props) {
  return (
    <Suspense>
      <PastSeasonsInner {...props} />
    </Suspense>
  )
}
