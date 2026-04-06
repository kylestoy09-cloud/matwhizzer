import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { PageHeader } from '@/components/PageHeader'

export const dynamic = 'force-dynamic'

export default async function GirlsDistrictsPage() {
  const season = Math.max(await getActiveSeason(), 2)

  const { data: districtRows } = await supabase
    .from('districts')
    .select('id, logo_url')
    .lte('id', 12)
    .order('id')

  const logoMap = new Map<number, string>()
  for (const row of (districtRows ?? [])) {
    if (row.logo_url) logoMap.set(row.id, row.logo_url)
  }

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

      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {districts.map(d => {
          const logoUrl = logoMap.get(d) ?? null
          return (
            <Link
              key={d}
              href={`/girls/districts/${d}`}
              className="block bg-white border border-black rounded-none shadow-none hover:border-rose-400 transition-colors overflow-hidden"
            >
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={`District ${d}`}
                  width={1022}
                  height={518}
                  className="w-full h-auto"
                />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center font-bold text-2xl bg-rose-900 text-white">
                  {d}
                </div>
              )}
              <div className="border-t border-black px-2 py-1.5">
                <p className="text-[11px] font-bold text-slate-900 leading-snug text-center">D{d}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
