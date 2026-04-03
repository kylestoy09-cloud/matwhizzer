import Link from 'next/link'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { PageHeader } from '@/components/PageHeader'

export default async function GirlsDistrictsPage() {
  // Girls districts only exist from season 2 onward
  const season = Math.max(await getActiveSeason(), 2)
  const districts = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/girls"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← Girls Search
      </Link>

      <div className="mb-8 text-center">
        <PageHeader title="Girls District Brackets" />
        <div className="flex items-center justify-center gap-1 text-slate-500 text-sm mt-1">
          <span>NJSIAA</span>
          <InlineSeasonPicker activeSeason={season} seasons={[2]} />
          <span>· Select a district</span>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {districts.map(d => (
          <Link
            key={d}
            href={`/girls/districts/${d}`}
            className="flex flex-col items-center justify-center aspect-square rounded-none border border-black bg-white hover:bg-rose-50 hover:border-rose-400 transition-colors shadow-none"
          >
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide leading-none mb-0.5">Dist.</span>
            <span className="text-xl font-bold text-slate-800">{d}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
