import Link from 'next/link'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { PageHeader } from '@/components/PageHeader'

const REGIONS = [
  { slug: '1', label: 'Region 1' },
  { slug: '2', label: 'Region 2' },
  { slug: '3', label: 'Region 3' },
  { slug: '4', label: 'Region 4' },
]

export default async function GirlsRegionsPage() {
  const season = await getActiveSeason()

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/girls"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← Girls Search
      </Link>

      <div className="mb-8 text-center">
        <PageHeader title="Girls Region Brackets" />
        <div className="flex items-center justify-center gap-1 text-slate-500 text-sm mt-1">
          <span>NJSIAA</span>
          <InlineSeasonPicker activeSeason={season} />
          <span>· Select a region</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {REGIONS.map(r => (
          <Link
            key={r.slug}
            href={`/girls/regions/${r.slug}`}
            className="flex flex-col items-center justify-center py-8 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 transition-colors shadow-sm"
          >
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide leading-none mb-1">Region</span>
            <span className="text-xl font-bold text-slate-800">{r.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
