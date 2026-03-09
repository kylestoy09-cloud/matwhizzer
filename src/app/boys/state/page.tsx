import Link from 'next/link'
import Image from 'next/image'
import { StateContent } from '@/components/StateContent'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'

export default async function StateBoysPage() {
  const season = await getActiveSeason()
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/boys" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        ← Boys Search
      </Link>
      <div className="mb-8 text-center">
        <Image src="/boys-state-header.jpg" alt="NJSIAA Boy's Wrestling State Tournament 2026" width={600} height={338} className="mx-auto" priority />
        <div className="flex items-center justify-center gap-1 text-slate-500 text-sm mt-2">
          <InlineSeasonPicker activeSeason={season} />
          <span>· Atlantic City · 32-man double elimination</span>
        </div>
      </div>
      <StateContent gender="M" season={season} />
    </div>
  )
}
