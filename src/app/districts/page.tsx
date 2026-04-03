import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { districtToSlug } from '@/lib/districts'

export default async function DistrictsIndexPage() {
  const { data: districts } = await supabase
    .from('districts')
    .select('id, name, region_id')
    .order('id')

  const { data: assignments } = await supabase
    .from('school_districts')
    .select('district_id')

  const counts = new Map<number, number>()
  for (const a of (assignments ?? [])) {
    counts.set(a.district_id, (counts.get(a.district_id) ?? 0) + 1)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Districts</h1>
      <p className="text-sm text-slate-500 mb-8">NJSIAA wrestling districts · Boys postseason</p>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {(districts ?? []).map(d => (
          <Link
            key={d.id}
            href={`/districts/${districtToSlug(d.name)}`}
            className="flex flex-col items-center justify-center aspect-square rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm"
          >
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide leading-none mb-0.5">Dist.</span>
            <span className="text-xl font-bold text-slate-800">{d.id}</span>
            <span className="text-[9px] text-slate-400 mt-0.5">{counts.get(d.id) ?? 0} schools</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
