import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { groupFromSlugRaw, getSectionsForGroup, sectionToSlug } from '@/lib/sections'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { StandingsTable } from '@/components/StandingsTable'
import { buildStandings } from '@/lib/standings'

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ group: string }>
  searchParams: Promise<{ gender?: string }>
}) {
  const { group: slug } = await params
  const { gender: genderParam } = await searchParams
  const gender = genderParam === 'girls' ? 'girls' : 'boys'
  const season = await getActiveSeason()

  const groupName = groupFromSlugRaw(slug)
  if (!groupName) notFound()

  const label = isNaN(Number(groupName)) ? `Non-Public ${groupName}` : `Group ${groupName}`

  const { data: schoolsData } = await supabase
    .from('schools')
    .select('id, display_name, mascot, primary_color, logo_url, section')
    .eq('classification', groupName)
    .eq('is_combined', false)
    .order('display_name')

  const schools = (schoolsData ?? []) as { display_name: string; mascot: string | null; primary_color: string | null; logo_url: string | null; section: string | null }[]
  if (schools.length === 0) notFound()

  const standings = await buildStandings(schools, gender, season)

  const sections = getSectionsForGroup(groupName)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href="/groups" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        ← All Groups
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{label}</h1>
          <p className="text-sm text-slate-500 mt-1">{standings.length} schools statewide · {gender === 'girls' ? 'Girls' : 'Boys'} Wrestling</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex rounded-none border border-slate-200 overflow-hidden text-sm">
            <Link href={`/groups/${slug}?gender=boys`} className={`px-3 py-1.5 font-medium transition-colors ${gender === 'boys' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Boys</Link>
            <Link href={`/groups/${slug}?gender=girls`} className={`px-3 py-1.5 font-medium transition-colors ${gender === 'girls' ? 'bg-rose-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Girls</Link>
          </div>
          <div className="text-xs text-slate-400"><InlineSeasonPicker activeSeason={season} /></div>
        </div>
      </div>

      {/* Section links */}
      <div className="flex flex-wrap gap-2 mb-6">
        {sections.map(sec => (
          <Link key={sec} href={`/sections/${sectionToSlug(sec)}/${slug}?gender=${gender}`}
            className="px-3 py-1.5 rounded-none border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
            {sec}
          </Link>
        ))}
      </div>

      <StandingsTable standings={standings} gender={gender} />
    </div>
  )
}
