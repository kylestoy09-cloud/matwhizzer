import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { getAllSections, sectionToSlug, getGroupsForSection, groupToSlug } from '@/lib/sections'

export default async function SectionsIndexPage() {
  const { data: schools } = await supabase
    .from('schools')
    .select('section, classification')
    .not('section', 'is', null)
    .eq('is_combined', false)

  // Count by section and section+group
  const sectionCounts = new Map<string, number>()
  const comboCountMap = new Map<string, number>()
  for (const s of (schools ?? [])) {
    const sec = s.section as string
    sectionCounts.set(sec, (sectionCounts.get(sec) ?? 0) + 1)
    if (s.classification) {
      const key = `${sec}|${s.classification}`
      comboCountMap.set(key, (comboCountMap.get(key) ?? 0) + 1)
    }
  }

  const sections = getAllSections().map(s => ({
    ...s,
    count: sectionCounts.get(s.name) ?? 0,
    groups: getGroupsForSection(s.name).map(g => ({
      name: g,
      slug: groupToSlug(g),
      label: isNaN(Number(g)) ? `NP-${g}` : `Group ${g}`,
      count: comboCountMap.get(`${s.name}|${g}`) ?? 0,
    })).filter(g => g.count > 0),
  }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Sections</h1>
      <p className="text-sm text-slate-500 mb-8">NJSIAA wrestling sections and groups</p>

      <div className="space-y-6">
        {sections.map(s => (
          <div key={s.slug} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <Link href={`/sections/${s.slug}`} className="text-lg font-bold text-slate-900 hover:underline">
                {s.name}
              </Link>
              <span className="text-xs text-slate-400">{s.count} schools</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {s.groups.map(g => (
                <Link
                  key={g.slug}
                  href={`/sections/${s.slug}/${g.slug}`}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {g.label} <span className="text-slate-400 text-xs ml-1">{g.count}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
