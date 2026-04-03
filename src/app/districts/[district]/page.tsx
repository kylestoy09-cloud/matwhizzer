import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { districtFromSlug } from '@/lib/districts'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { StandingsTable } from '@/components/StandingsTable'
import { buildStandings } from '@/lib/standings'

export default async function DistrictPage({
  params,
  searchParams,
}: {
  params: Promise<{ district: string }>
  searchParams: Promise<{ gender?: string }>
}) {
  const { district: slug } = await params
  const { gender: genderParam } = await searchParams
  const gender = genderParam === 'girls' ? 'girls' : 'boys'
  const season = await getActiveSeason()

  const district = districtFromSlug(slug)
  if (!district) notFound()

  // Get school IDs in this district
  const { data: assignments } = await supabase
    .from('school_districts')
    .select('school_id')
    .eq('district_id', district.id)

  const schoolIds = (assignments ?? []).map(a => a.school_id)
  if (schoolIds.length === 0) notFound()

  // Fetch school profiles
  const { data: schoolsData } = await supabase
    .from('schools')
    .select('id, display_name, mascot, primary_color, logo_url')
    .in('id', schoolIds)
    .eq('is_combined', false)
    .order('display_name')

  const schools = (schoolsData ?? []) as { id: number; display_name: string; mascot: string | null; primary_color: string | null; logo_url: string | null }[]
  if (schools.length === 0) notFound()

  const standings = await buildStandings(schools, gender, season)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href="/districts" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        ← All Districts
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{district.name}</h1>
          <p className="text-sm text-slate-500 mt-1">{standings.length} schools · {gender === 'girls' ? 'Girls' : 'Boys'} Wrestling</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
            <Link href={`/districts/${slug}?gender=boys`} className={`px-3 py-1.5 font-medium transition-colors ${gender === 'boys' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Boys</Link>
            <Link href={`/districts/${slug}?gender=girls`} className={`px-3 py-1.5 font-medium transition-colors ${gender === 'girls' ? 'bg-rose-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Girls</Link>
          </div>
          <div className="text-xs text-slate-400"><InlineSeasonPicker activeSeason={season} /></div>
        </div>
      </div>

      <StandingsTable standings={standings} gender={gender} />
    </div>
  )
}
