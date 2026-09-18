import Link from 'next/link'
import { StateContent } from '@/components/StateContent'
import { StateHeader } from '@/components/StateHeader'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'

export default async function GirlsStatePage() {
  const season = await getActiveSeason()
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/girls" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        ← Girls Search
      </Link>
      <div className="mb-8 text-center">
        <StateHeader gender="F" />
        <div className="flex items-center justify-center gap-1 text-slate-500 text-sm mt-2">
          <InlineSeasonPicker activeSeason={season} />
          <span>· Boardwalk Hall · double elimination</span>
        </div>
      </div>
      <StateContent gender="F" season={season} />
    </div>
  )
}
