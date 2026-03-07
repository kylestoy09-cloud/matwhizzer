import Link from 'next/link'
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-blue-900">Boys State Championships</h1>
        <div className="flex items-center gap-1 text-slate-500 text-sm mt-1">
          <span>NJSIAA</span>
          <InlineSeasonPicker activeSeason={season} />
          <span>· Atlantic City · 32-man double elimination</span>
        </div>
      </div>
      <StateContent gender="M" season={season} />
    </div>
  )
}
