import { StateContent } from '@/components/StateContent'
import { loadBoysState } from '@/lib/stateData/boys'
import { StdHeader } from '@/components/site/StdPage'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'

export default async function StateBoysPage() {
  const season = await getActiveSeason('M')
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <StdHeader title="Boys State Tournament" summaryKey="state"
        picker={<InlineSeasonPicker gender="M" activeSeason={season} />} />
      <StateContent gender="M" season={season} data={await loadBoysState(season)} />
    </div>
  )
}
