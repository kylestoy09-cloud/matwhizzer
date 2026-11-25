import { TournamentHistoryView, HistoryTabs } from '@/components/site/TournamentHistory'
import { PostseasonHomeLink } from '@/components/site/PostseasonHomeLink'
import { StateContent } from '@/components/StateContent'
import { loadGirlsState } from '@/lib/stateData/girls'
import { StdHeader } from '@/components/site/StdPage'
import { getPostseasonSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'

export default async function GirlsStatePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const view = (await searchParams).view === 'history' ? 'history' : 'brackets'   // History tab (Kyle 2026-11-14)
  const { season, options: seasonOptions } = await getPostseasonSeason('F')
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <PostseasonHomeLink side="girls" season={season} options={seasonOptions} />
      <StdHeader title="Girls State Tournament" summaryKey="state"
        picker={view === 'history' ? undefined : <InlineSeasonPicker arrows gender="F" activeSeason={season} options={seasonOptions} />}
        tabs={<HistoryTabs base="/girls/state" view={view} />} />
      {view === 'history'
        ? <TournamentHistoryView gender="F" level="state" num={null} seasons={seasonOptions.map(o => o.id)} />
        : <StateContent gender="F" season={season} data={await loadGirlsState(season)} />}
    </div>
  )
}
