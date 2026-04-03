import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { getAllGroups, getSectionsForGroup, sectionToSlug, groupToSlug } from '@/lib/sections'

export default async function GroupsIndexPage() {
  const { data: schools } = await supabase
    .from('schools')
    .select('classification')
    .not('classification', 'is', null)
    .eq('is_combined', false)

  const counts = new Map<string, number>()
  for (const s of (schools ?? [])) {
    const g = s.classification as string
    counts.set(g, (counts.get(g) ?? 0) + 1)
  }

  const groups = getAllGroups().map(g => ({
    ...g,
    count: counts.get(g.name) ?? 0,
    sections: getSectionsForGroup(g.name),
  })).filter(g => g.count > 0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Groups</h1>
      <p className="text-sm text-slate-500 mb-8">NJSIAA wrestling classification groups</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(g => (
          <div key={g.slug} className="bg-white border border-black rounded-none shadow-none p-5">
            <div className="flex items-center justify-between mb-3">
              <Link href={`/groups/${g.slug}`} className="text-lg font-bold text-slate-900 hover:underline">{g.label}</Link>
              <span className="text-xs text-slate-400">{g.count} schools</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {g.sections.map(sec => (
                <Link key={sec} href={`/sections/${sectionToSlug(sec)}/${g.slug}`}
                  className="px-3 py-1.5 rounded-none border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
                  {sec}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
