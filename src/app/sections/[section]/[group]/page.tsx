import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sectionFromSlug, groupFromSlugRaw, formatSectionGroup, sectionToSlug } from '@/lib/sections'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { StandingsTable } from '@/components/StandingsTable'
import { buildStandings } from '@/lib/standings'

export default async function SectionGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string; group: string }>
  searchParams: Promise<{ gender?: string }>
}) {
  const { section: secSlug, group: grpSlug } = await params
  const { gender: genderParam } = await searchParams
  const gender = genderParam === 'girls' ? 'girls' : 'boys'
  const season = await getActiveSeason()

  const sectionName = sectionFromSlug(secSlug)
  const groupName = groupFromSlugRaw(grpSlug)
  if (!sectionName || !groupName) notFound()

  const title = formatSectionGroup(sectionName, groupName) ?? `${sectionName} ${groupName}`

  const { data: schoolsData } = await supabase
    .from('schools')
    .select('display_name, mascot, primary_color, logo_url')
    .eq('section', sectionName)
    .eq('classification', groupName)
    .eq('is_combined', false)
    .order('display_name')

  const schools = (schoolsData ?? []) as { display_name: string; mascot: string | null; primary_color: string | null; logo_url: string | null }[]
  if (schools.length === 0) notFound()

  const standings = await buildStandings(schools, gender, season)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-6">
        <Link href="/sections" className="hover:text-slate-800 transition-colors">Sections</Link>
        <span>›</span>
        <Link href={`/sections/${secSlug}?gender=${gender}`} className="hover:text-slate-800 transition-colors">{sectionName}</Link>
        <span>›</span>
        <span className="text-slate-800 font-medium">{isNaN(Number(groupName)) ? `NP-${groupName}` : `Group ${groupName}`}</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500 mt-1">{standings.length} schools · {gender === 'girls' ? 'Girls' : 'Boys'} Wrestling</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
            <Link href={`/sections/${secSlug}/${grpSlug}?gender=boys`} className={`px-3 py-1.5 font-medium transition-colors ${gender === 'boys' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Boys</Link>
            <Link href={`/sections/${secSlug}/${grpSlug}?gender=girls`} className={`px-3 py-1.5 font-medium transition-colors ${gender === 'girls' ? 'bg-rose-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Girls</Link>
          </div>
          <div className="text-xs text-slate-400"><InlineSeasonPicker activeSeason={season} /></div>
        </div>
      </div>

      <StandingsTable standings={standings} gender={gender} />
    </div>
  )
}
