import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { conferenceFromSlug } from '@/lib/conferences'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { StandingsTable } from '@/components/StandingsTable'
import { buildStandings } from '@/lib/standings'

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ConferencePage({
  params,
  searchParams,
}: {
  params: Promise<{ conference: string }>
  searchParams: Promise<{ gender?: string }>
}) {
  const { conference: slug } = await params
  const { gender: genderParam } = await searchParams
  const gender = genderParam === 'girls' ? 'girls' : 'boys'
  const season = await getActiveSeason()

  const conferenceName = conferenceFromSlug(slug)
  if (!conferenceName) notFound()

  // Fetch schools in this conference
  const { data: schoolsData } = await supabase
    .from('schools')
    .select('id, display_name, mascot, primary_color, logo_url')
    .eq('athletic_conference', conferenceName)
    .eq('is_combined', false)
    .order('display_name')

  const conferenceSchools = (schoolsData ?? []) as {
    id: number
    display_name: string
    mascot: string | null
    primary_color: string | null
    logo_url: string | null
  }[]

  if (conferenceSchools.length === 0) notFound()

  const standings = await buildStandings(conferenceSchools, gender, season)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link
        href={`/conferences?gender=${gender}`}
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← All Conferences
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{conferenceName}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {standings.length} school{standings.length !== 1 ? 's' : ''} ·{' '}
            {gender === 'girls' ? 'Girls' : 'Boys'} Wrestling
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex rounded-none border border-slate-200 overflow-hidden text-sm">
            <Link
              href={`/conferences/${slug}?gender=boys`}
              className={`px-3 py-1.5 font-medium transition-colors ${gender === 'boys' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              Boys
            </Link>
            <Link
              href={`/conferences/${slug}?gender=girls`}
              className={`px-3 py-1.5 font-medium transition-colors ${gender === 'girls' ? 'bg-rose-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              Girls
            </Link>
          </div>
          <div className="text-xs text-slate-400">
            <InlineSeasonPicker activeSeason={season} />
          </div>
        </div>
      </div>

      {/* Standings table */}
      <StandingsTable standings={standings} gender={gender} />
    </div>
  )
}
