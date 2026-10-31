'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { DualsTab } from './tabs/DualsTab'
import { NjsiaaTab } from './tabs/NjsiaaTab'
import { StandingsTab } from './tabs/StandingsTab'

export type PastSeason = { id: number; year_label: string; end_year: number }

const TABS = [
  { id: 'duals',        label: 'Duals' },
  { id: 'standings',    label: 'Standings' },
  { id: 'schools',      label: 'Schools' },
  { id: 'wrestlers',    label: 'Wrestlers' },
  { id: 'coaches',      label: 'Coaches' },
  { id: 'tournaments',  label: 'Tournaments' },
  { id: 'leaderboards', label: 'Leaderboards' },
  { id: 'playoffs',     label: 'Playoffs' },
  { id: 'njsiaa',       label: 'NJSIAA' },
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
  const tabParam     = (searchParams.get('tab') ?? 'duals') as TabId

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

// ── Tab placeholders — each will be replaced with full implementations ────────

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold text-slate-700 mb-1">{title}</p>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  )
}

function DualsTabWrapper({ season, gender }: { season: PastSeason; gender: 'M' | 'F' }) {
  return <DualsTab season={season} gender={gender} />
}

function SchoolsTab({ season, gender }: { season: PastSeason; gender: 'M' | 'F' }) {
  return (
    <Placeholder
      title={`Schools — ${season.year_label}`}
      description="All schools that participated in this season. Searchable and editable."
    />
  )
}

function WrestlersTab({ season, gender }: { season: PastSeason; gender: 'M' | 'F' }) {
  return (
    <Placeholder
      title={`Wrestlers — ${season.year_label}`}
      description="Everyone who wrestled at least one match this season. Includes grade/class if known."
    />
  )
}

function CoachesTab({ season, gender }: { season: PastSeason; gender: 'M' | 'F' }) {
  return (
    <Placeholder
      title={`Coaches — ${season.year_label}`}
      description="Coach list by school as of this season. Imported from school profiles."
    />
  )
}

function TournamentsTab({ season, gender }: { season: PastSeason; gender: 'M' | 'F' }) {
  return (
    <Placeholder
      title={`Tournaments — ${season.year_label}`}
      description="All tournaments from this season with bout, placement, and team score counts."
    />
  )
}

function LeaderboardsTab({ season, gender }: { season: PastSeason; gender: 'M' | 'F' }) {
  return (
    <Placeholder
      title={`Leaderboards — ${season.year_label}`}
      description="Individual power point rankings, team standings, and stat leaderboards as of season end. Reflects any edits made to underlying data."
    />
  )
}

function PlayoffsTab({ season, gender }: { season: PastSeason; gender: 'M' | 'F' }) {
  return (
    <Placeholder
      title={`Playoffs — ${season.year_label}`}
      description="District, region, and state place finishers by weight class. Team playoff bracket results."
    />
  )
}

export function PastSeasonsClient(props: Props) {
  return (
    <Suspense>
      <PastSeasonsInner {...props} />
    </Suspense>
  )
}
