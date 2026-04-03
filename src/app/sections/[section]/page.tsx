import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sectionFromSlug, getGroupsForSection, groupToSlug, sectionToSlug } from '@/lib/sections'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { StandingsTable } from '@/components/StandingsTable'
import { buildStandings } from '@/lib/standings'

export default async function SectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>
  searchParams: Promise<{ gender?: string }>
}) {
  const { section: slug } = await params
  const { gender: genderParam } = await searchParams
  const gender = genderParam === 'girls' ? 'girls' : 'boys'
  const season = await getActiveSeason()

  const sectionName = sectionFromSlug(slug)
  if (!sectionName) notFound()

  const { data: schoolsData } = await supabase
    .from('schools')
    .select('id, display_name, mascot, primary_color, logo_url, classification')
    .eq('section', sectionName)
    .eq('is_combined', false)
    .order('display_name')

  const schools = (schoolsData ?? []) as { display_name: string; mascot: string | null; primary_color: string | null; logo_url: string | null; classification: string | null }[]
  if (schools.length === 0) notFound()

  const standings = await buildStandings(schools, gender, season)

  const groups = getGroupsForSection(sectionName)
    .map(g => ({ name: g, slug: groupToSlug(g), label: isNaN(Number(g)) ? `NP-${g}` : `Group ${g}` }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href="/sections" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        ← All Sections
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{sectionName}</h1>
          <p className="text-sm text-slate-500 mt-1">{standings.length} schools · {gender === 'girls' ? 'Girls' : 'Boys'} Wrestling</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex rounded-none border border-slate-200 overflow-hidden text-sm">
            <Link href={`/sections/${slug}?gender=boys`} className={`px-3 py-1.5 font-medium transition-colors ${gender === 'boys' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Boys</Link>
            <Link href={`/sections/${slug}?gender=girls`} className={`px-3 py-1.5 font-medium transition-colors ${gender === 'girls' ? 'bg-rose-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Girls</Link>
          </div>
          <div className="text-xs text-slate-400"><InlineSeasonPicker activeSeason={season} /></div>
        </div>
      </div>

      {/* Group links */}
      <div className="flex flex-wrap gap-2 mb-6">
        {groups.map(g => (
          <Link key={g.slug} href={`/sections/${slug}/${g.slug}?gender=${gender}`}
            className="px-3 py-1.5 rounded-none border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
            {g.label}
          </Link>
        ))}
      </div>

      <StandingsTable standings={standings} gender={gender} />
    </div>
  )
}
