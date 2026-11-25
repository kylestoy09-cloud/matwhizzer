import { TournamentHistoryView, HistoryTabs } from '@/components/site/TournamentHistory'
import { PostseasonHomeLink } from '@/components/site/PostseasonHomeLink'
import { StateContent } from '@/components/StateContent'
import { loadBoysState } from '@/lib/stateData/boys'
import { StdHeader } from '@/components/site/StdPage'
import { getPostseasonSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'

export default async function StateBoysPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const view = (await searchParams).view === 'history' ? 'history' : 'brackets'   // History tab (Kyle 2026-11-14)
  const { season, options: seasonOptions } = await getPostseasonSeason('M')
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <PostseasonHomeLink side="boys" season={season} options={seasonOptions} />
      <StdHeader title="Boys State Tournament" summaryKey="state"
        picker={view === 'history' ? undefined : <InlineSeasonPicker arrows gender="M" activeSeason={season} options={seasonOptions} />}
        tabs={<HistoryTabs base="/boys/state" view={view} />} />
      {view === 'history'
        ? <TournamentHistoryView gender="M" level="state" num={null} seasons={seasonOptions.map(o => o.id)} />
        : <StateContent gender="M" season={season} data={await loadBoysState(season)} />}
    </div>
  )
}
