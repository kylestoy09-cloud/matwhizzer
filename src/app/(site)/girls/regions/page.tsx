import Link from 'next/link'
import { PostseasonHomeLink } from '@/components/site/PostseasonHomeLink'
import { getPostseasonSeason } from '@/lib/get-season'
import { regionLabels } from '@/lib/postseasonSeason'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { PageHeader } from '@/components/PageHeader'

const REGIONS = [
  { slug: '1', label: 'Region 1' },
  { slug: '2', label: 'Region 2' },
  { slug: '3', label: 'Region 3' },
  { slug: '4', label: 'Region 4' },
]

export default async function GirlsRegionsPage() {
  const { season, options: seasonOptions } = await getPostseasonSeason('F')
  // the season's regions by name, in one order (North I, North II, Central, South; 2018-19 to 2021-22 North, South)
  const rl = await regionLabels('F', season)
  const regions = rl.order.length ? rl.order.map(n => ({ slug: String(n), label: REGIONS.find(x => x.slug === String(n) && rl.button(n) === String(n))?.label ?? rl.button(n) })) : REGIONS

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/girls"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← Girls Search
      </Link>

      <PostseasonHomeLink side="girls" season={season} options={seasonOptions} />
      <div className="mb-8 text-center">
        <PageHeader title="Girls Region Brackets" />
        <div className="flex items-center justify-center gap-1 text-slate-500 text-sm mt-1">
          <span>NJSIAA</span>
          <InlineSeasonPicker arrows gender="F" activeSeason={season} options={seasonOptions} />
          <span>· Select a region</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {regions.map(r => (
          <Link
            key={r.slug}
            href={`/girls/regions/${r.slug}`}
            className="flex flex-col items-center justify-center py-8 rounded-none border border-black bg-white hover:bg-rose-50 hover:border-rose-300 transition-colors shadow-none"
          >
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide leading-none mb-1">Region</span>
            <span className="text-xl font-bold text-slate-800">{r.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
