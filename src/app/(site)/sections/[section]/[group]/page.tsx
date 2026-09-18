import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { sectionFromSlug, groupFromSlugRaw, formatSectionGroup } from '@/lib/sections'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { PowerPointTable } from '@/components/StandingsTable'
import { buildPowerPointStandings } from '@/lib/standings'
import { GenderSync } from '../../GenderSync'

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
    .select('id, display_name, mascot, primary_color, logo_url, header_background')
    .eq('section', sectionName)
    .eq('classification', groupName)
    .eq('is_combined', false)
    .order('display_name')

  const schools = (schoolsData ?? []) as { display_name: string; mascot: string | null; primary_color: string | null; logo_url: string | null; header_background: string | null }[]
  if (schools.length === 0) notFound()

  const standings = await buildPowerPointStandings(schools, gender, season)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Suspense><GenderSync /></Suspense>

      <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-6">
        <Link href="/sections" className="hover:text-slate-800 transition-colors">Sections</Link>
        <span>›</span>
        <Link href={`/sections/${secSlug}`} className="hover:text-slate-800 transition-colors">{sectionName}</Link>
        <span>›</span>
        <span className="text-slate-800 font-medium">{isNaN(Number(groupName)) ? `NP-${groupName}` : `Group ${groupName}`}</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500 mt-1">{standings.length} schools</p>
        </div>
        <div className="shrink-0">
          <div className="text-xs text-slate-400"><InlineSeasonPicker activeSeason={season} /></div>
        </div>
      </div>

      <PowerPointTable standings={standings} gender={gender} />
    </div>
  )
}
