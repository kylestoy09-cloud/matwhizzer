import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { regionToSlug } from '@/lib/districts'

export default async function RegionsIndexPage() {
  // Boys regions only (ids 1-8)
  const { data: regions } = await supabase
    .from('regions')
    .select('id, name, gender')
    .eq('gender', 'M')
    .order('id')

  const { data: assignments } = await supabase
    .from('school_regions')
    .select('region_id')

  const counts = new Map<number, number>()
  for (const a of (assignments ?? [])) {
    counts.set(a.region_id, (counts.get(a.region_id) ?? 0) + 1)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Regions</h1>
      <p className="text-sm text-slate-500 mb-8">NJSIAA wrestling regions · Boys postseason</p>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {(regions ?? []).map(r => (
          <Link
            key={r.id}
            href={`/regions/${regionToSlug(r.name)}`}
            className="flex flex-col items-center justify-center aspect-square rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50 hover:border-emerald-400 transition-colors shadow-sm"
          >
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide leading-none mb-0.5">Reg.</span>
            <span className="text-xl font-bold text-slate-800">{r.id}</span>
            <span className="text-[9px] text-slate-400 mt-0.5">{counts.get(r.id) ?? 0} schools</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
