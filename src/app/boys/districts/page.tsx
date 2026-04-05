import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { PageHeader } from '@/components/PageHeader'

export const dynamic = 'force-dynamic'

export default async function BoysDistrictsPage() {
  const season = await getActiveSeason()

  const { data: districtRows } = await supabase
    .from('districts')
    .select('id, logo_url')
    .order('id')

  const logoMap = new Map<number, string>()
  for (const row of (districtRows ?? [])) {
    if (row.logo_url) logoMap.set(row.id, row.logo_url)
  }

  const districts = Array.from({ length: 32 }, (_, i) => i + 1)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link
        href="/boys"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← Boys Search
      </Link>

      <div className="mb-8 text-center">
        <PageHeader title="Boys District Brackets" />
        <div className="flex items-center justify-center gap-1 text-slate-500 text-sm mt-1">
          <span>NJSIAA</span>
          <InlineSeasonPicker activeSeason={season} />
          <span>· Select a district</span>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
        {districts.map(d => {
          const logoUrl = logoMap.get(d) ?? null
          return (
            <Link
              key={d}
              href={`/boys/districts/${d}`}
              className="block bg-white border border-black rounded-none shadow-none hover:border-slate-400 transition-colors overflow-hidden"
            >
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={`District ${d}`}
                  width={512}
                  height={512}
                  className="w-full h-auto"
                />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center font-bold text-2xl bg-slate-900 text-white">
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
