import Link from 'next/link'
import Image from 'next/image'
import { StateContent } from '@/components/StateContent'
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
        <Image src="/girls-state-header.jpg" alt="NJSIAA Girl's Wrestling State Tournament 2026" width={600} height={338} className="mx-auto" priority />
        <div className="flex items-center justify-center gap-1 text-slate-500 text-sm mt-2">
          <InlineSeasonPicker activeSeason={season} />
          <span>· Boardwalk Hall · double elimination</span>
        </div>
      </div>
      <StateContent gender="F" season={season} />
    </div>
  )
}
