import { StateContent } from '@/components/StateContent'
import { loadGirlsState } from '@/lib/stateData/girls'
import { StdHeader } from '@/components/site/StdPage'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'

export default async function GirlsStatePage() {
  const season = await getActiveSeason('F')
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <StdHeader title="Girls State Tournament" summaryKey="state"
        picker={<InlineSeasonPicker gender="F" activeSeason={season} />} />
      <StateContent gender="F" season={season} data={await loadGirlsState(season)} />
    </div>
  )
}
