import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { conferenceFromSlug } from '@/lib/conferences'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'

// ── Types ─────────────────────────────────────────────────────────────────────

type SchoolScore = {
  display_name: string
  mascot: string | null
  primary_color: string | null
  logo_url: string | null
  district_points: number
  region_points: number
  state_points: number
  total_points: number
}

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
    .select('display_name, mascot, primary_color, logo_url')
    .eq('athletic_conference', conferenceName)
    .eq('is_combined', false)
    .order('display_name')

  const conferenceSchools = (schoolsData ?? []) as {
    display_name: string
    mascot: string | null
    primary_color: string | null
    logo_url: string | null
  }[]

  if (conferenceSchools.length === 0) notFound()

  // Fetch team scores from precomputed_team_scores for all schools in this conference
  const schoolNames = conferenceSchools.map(s => s.display_name)
  const { data: scoresData } = await supabase
    .from('precomputed_team_scores')
    .select('school_name, tournament_type, total_points')
    .in('school_name', schoolNames)
    .eq('season_id', season)

  // Gender-specific tournament types
  const boysTypes = ['districts', 'regions', 'boys_state']
  const girlsTypes = ['districts', 'girls_regions', 'girls_state']
  const relevantTypes = gender === 'girls' ? girlsTypes : boysTypes
  const regionKey = gender === 'girls' ? 'girls_regions' : 'regions'
  const stateKey = gender === 'girls' ? 'girls_state' : 'boys_state'

  // Aggregate scores per school
  const scoreMap = new Map<string, { district: number; region: number; state: number }>()
  for (const r of (scoresData ?? []) as { school_name: string; tournament_type: string; total_points: number }[]) {
    if (!relevantTypes.includes(r.tournament_type)) continue
    const entry = scoreMap.get(r.school_name) ?? { district: 0, region: 0, state: 0 }
    if (r.tournament_type === 'districts') entry.district += r.total_points
    else if (r.tournament_type === regionKey) entry.region += r.total_points
    else if (r.tournament_type === stateKey) entry.state += r.total_points
    scoreMap.set(r.school_name, entry)
  }

  // Build standings
  const standings: SchoolScore[] = conferenceSchools.map(s => {
    const scores = scoreMap.get(s.display_name)
    return {
      display_name: s.display_name,
      mascot: s.mascot,
      primary_color: s.primary_color,
      logo_url: s.logo_url,
      district_points: scores?.district ?? 0,
      region_points: scores?.region ?? 0,
      state_points: scores?.state ?? 0,
      total_points: (scores?.district ?? 0) + (scores?.region ?? 0) + (scores?.state ?? 0),
    }
  })

  // Sort by total descending
  standings.sort((a, b) => b.total_points - a.total_points)

  // Logo helper: swap /512/ for /64/ in URL
  function smallLogo(url: string | null): string | null {
    if (!url) return null
    return url.replace('/512/', '/64/')
  }

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
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
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
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-center px-3 py-3 font-medium text-slate-500 w-12">#</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">School</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500 w-24">Districts</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500 w-24">Regions</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500 w-24">State</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500 w-24">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {standings.map((s, i) => {
                const logo = smallLogo(s.logo_url)
                return (
                  <tr key={s.display_name} className="hover:bg-slate-50">
                    <td className="text-center px-3 py-3 text-slate-400 tabular-nums">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/schools/${encodeURIComponent(s.display_name)}?gender=${gender}`}
                        className="flex items-center gap-3 group"
                      >
                        {logo ? (
                          <Image
                            src={logo}
                            alt={s.display_name}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded object-cover shrink-0"
                          />
                        ) : s.primary_color ? (
                          <div
                            className="w-8 h-8 rounded flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
                            style={{ backgroundColor: s.primary_color }}
                          >
                            {s.display_name.slice(0, 2).toUpperCase()}
                          </div>
                        ) : null}
                        <div>
                          <span className="font-medium text-slate-800 group-hover:underline">{s.display_name}</span>
                          {s.mascot && <span className="text-xs text-slate-400 ml-1.5">{s.mascot}</span>}
                        </div>
                      </Link>
                    </td>
                    <td className="text-right px-4 py-3 tabular-nums text-slate-700">{s.district_points || '—'}</td>
                    <td className="text-right px-4 py-3 tabular-nums text-slate-700">{s.region_points || '—'}</td>
                    <td className="text-right px-4 py-3 tabular-nums text-slate-700">{s.state_points || '—'}</td>
                    <td className="text-right px-4 py-3 tabular-nums font-semibold text-slate-900">{s.total_points || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
