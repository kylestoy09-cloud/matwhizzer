import Link from 'next/link'
import { PostseasonHomeLink } from '@/components/site/PostseasonHomeLink'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/public-cached'
import { getPostseasonSeason } from '@/lib/get-season'
import { regionLabels } from '@/lib/postseasonSeason'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { PageHeader } from '@/components/PageHeader'

export const revalidate = 300

export default async function BoysRegionsPage() {
  const { season, options: seasonOptions } = await getPostseasonSeason('M')

  const { data: regionRows } = await supabase
    .from('regions')
    .select('id, logo_url')
    .lte('id', 8)
    .order('id')

  const logoMap = new Map<number, string>()
  for (const row of (regionRows ?? [])) {
    if (row.logo_url) logoMap.set(row.id, row.logo_url)
  }

  // a season with named regions (2020-21: four super regions) lists them by name; otherwise the original tiles
  const rl = await regionLabels('M', season)
  const named = rl.order.length > 0 && rl.order.length < 8
  const regions = rl.order.length ? rl.order : Array.from({ length: 8 }, (_, i) => i + 1)

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/boys"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← Boys Search
      </Link>

      <PostseasonHomeLink side="boys" season={season} options={seasonOptions} />
      <div className="mb-8 text-center">
        <PageHeader title="Boys Region Brackets" />
        <div className="flex items-center justify-center gap-1 text-slate-500 text-sm mt-1">
          <span>NJSIAA</span>
          <InlineSeasonPicker arrows gender="M" activeSeason={season} options={seasonOptions} />
          <span>· Select a region</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {regions.map(r => {
          const logoUrl = named ? null : logoMap.get(r) ?? null
          return (
            <Link
              key={r}
              href={`/boys/regions/${r}`}
              className="block bg-white border border-black rounded-lg shadow-none hover:border-slate-400 transition-colors overflow-hidden"
            >
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={`Region ${r}`}
                  width={1022}
                  height={518}
                  className="w-full h-auto"
                />
              ) : (
                <div className={`w-full aspect-square flex items-center justify-center font-bold bg-slate-900 text-white text-center px-2 ${named ? 'text-lg' : 'text-3xl'}`}>
                  {rl.button(r)}
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
