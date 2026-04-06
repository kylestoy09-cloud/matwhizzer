import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { PageHeader } from '@/components/PageHeader'

export const dynamic = 'force-dynamic'

export default async function BoysRegionsPage() {
  const season = await getActiveSeason()

  const { data: regionRows } = await supabase
    .from('regions')
    .select('id, logo_url')
    .lte('id', 8)
    .order('id')

  const logoMap = new Map<number, string>()
  for (const row of (regionRows ?? [])) {
    if (row.logo_url) logoMap.set(row.id, row.logo_url)
  }

  const regions = Array.from({ length: 8 }, (_, i) => i + 1)

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/boys"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← Boys Search
      </Link>

      <div className="mb-8 text-center">
        <PageHeader title="Boys Region Brackets" />
        <div className="flex items-center justify-center gap-1 text-slate-500 text-sm mt-1">
          <span>NJSIAA</span>
          <InlineSeasonPicker activeSeason={season} />
          <span>· Select a region</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {regions.map(r => {
          const logoUrl = logoMap.get(r) ?? null
          return (
            <Link
              key={r}
              href={`/boys/regions/${r}`}
              className="block bg-white border border-black rounded-none shadow-none hover:border-slate-400 transition-colors overflow-hidden"
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
                <div className="w-full aspect-square flex items-center justify-center font-bold text-3xl bg-slate-900 text-white">
                  {r}
                </div>
              )}
              <div className="border-t border-black px-3 py-2">
                <p className="text-xs font-bold text-slate-900 leading-snug text-center">Region {r}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
