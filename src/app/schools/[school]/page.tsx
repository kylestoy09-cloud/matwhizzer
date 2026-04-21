export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getActiveSeason } from '@/lib/get-season'
import { conferenceToSlug } from '@/lib/conferences'
import { sectionToSlug, groupToSlug } from '@/lib/sections'
import { SchoolTabs } from './SchoolTabs'
import { SchoolHeader } from '@/components/SchoolHeader'

// ── Types ─────────────────────────────────────────────────────────────────────

type CoopMembership = {
  coop_school_id: number
  coop_name: string
  season: number
  gender: string
  is_primary: boolean
}

type CoopMember = {
  member_school_id: number
  member_name: string
  is_primary: boolean
  season: number
  gender: string
}

type SchoolProfile = {
  id: number
  display_name: string
  short_name: string | null
  mascot: string | null
  nickname: string | null
  primary_color: string | null
  secondary_color: string | null
  tertiary_color: string | null
  color_primary: string | null
  color_secondary: string | null
  color_tertiary: string | null
  header_background: string | null
  town: string | null
  county: string | null
  section: string | null
  classification: string | null
  founded_year: number | null
  website_url: string | null
  twitter_handle: string | null
  athletic_conference: string | null
  logo_url: string | null
}

type BreakdownRow = {
  tournament_type: string
  total_points: number
  win_count: number
}

type WrestlerRow = {
  wrestler_id: string
  wrestler_name: string
  primary_weight: number
  districts_placement: string | null
  districts_short: string | null
  regions_placement: string | null
  regions_short: string | null
  state_placement: string | null
}

type LeaderRow = {
  wrestler_id: string
  wrestler_name: string
  primary_weight: number
  win_count: number
  fall_count: number
  fastest_fall_sec: number | null
  bonus_pct: number
  district_points: number
  region_points: number
  state_points: number
  total_points: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function schoolInitials(profile: SchoolProfile) {
  if (profile.short_name) return profile.short_name.slice(0, 3)
  const words = profile.display_name.split(/[\s-]+/).filter(w => !['of', 'at', 'the'].includes(w.toLowerCase()))
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return profile.display_name.slice(0, 2).toUpperCase()
}

function classificationLabel(s: SchoolProfile) {
  if (!s.section || !s.classification) return null
  if (s.section === 'Non-Public') return `Non-Public ${s.classification}`
  return `${s.section} Group ${s.classification}`
}

const TOURNEY_LABEL_M: Record<string, string> = { districts: 'Districts', regions: 'Regions', boys_state: 'State' }
const TOURNEY_LABEL_F: Record<string, string> = { districts: 'Districts', girls_regions: 'Regions', girls_state: 'State' }

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SchoolProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ school: string }>
  searchParams: Promise<{ gender?: string; tab?: string }>
}) {
  const { school: schoolParam } = await params
  const schoolId = parseInt(schoolParam, 10)
  if (!schoolId) notFound()

  const { gender: genderParam, tab: tabParam } = await searchParams

  let gender = genderParam === 'girls' ? 'girls' : 'boys'
  let genderCode = gender === 'girls' ? 'F' : 'M'
  const activeTab = tabParam ?? 'overview'
  const schoolAbbrev = schoolParam

  let season: number
  try {
    season = await getActiveSeason()
  } catch (e) {
    console.error('[SchoolProfile] getActiveSeason failed:', e)
    season = 2
  }

  const { data: profileData, error: profileError } = await supabase
    .from('schools')
    .select('id, display_name, short_name, mascot, nickname, primary_color, secondary_color, tertiary_color, color_primary, color_secondary, color_tertiary, header_background, town, county, section, classification, founded_year, website_url, twitter_handle, athletic_conference, logo_url')
    .eq('id', schoolId)
    .maybeSingle()

  if (profileError) {
    console.error('[SchoolProfile] schools query error:', profileError)
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-red-600 mb-2">Error loading school profile</h1>
        <p className="text-sm text-slate-600">schools query failed: {profileError.message}</p>
      </div>
    )
  }

  if (!profileData) notFound()

  const profile = profileData as SchoolProfile
  const schoolName = profile.display_name

  const pc = profile.primary_color ?? '#1a1a2e'
  const sc = profile.secondary_color ?? '#FFD700'

  // ── Co-op data ──────────────────────────────────────────────────────────────
  // Runs in parallel: check if this school is a member of a co-op, and whether
  // it has co-op members of its own (i.e. it IS the co-op school).
  const [{ data: coopMemberships }, { data: coopMemberData }] = await Promise.all([
    supabase.rpc('get_coop_membership', { p_school_id: schoolId }),
    supabase.rpc('get_coop_members', { p_coop_school_id: schoolId }),
  ])

  const memberships = (coopMemberships ?? []) as CoopMembership[]
  const coopMembers = (coopMemberData ?? []) as CoopMember[]

  // If no explicit gender param and this school is a co-op with only girls data,
  // default to girls view instead of boys to avoid empty/broken page.
  if (!genderParam && coopMembers.length > 0) {
    const hasBoysData = coopMembers.some(m => m.gender === 'M' || m.gender === 'B')
    if (!hasBoysData) {
      gender = 'girls'
      genderCode = 'F'
    }
  }

  const TOURNEY_LABEL = gender === 'girls' ? TOURNEY_LABEL_F : TOURNEY_LABEL_M

  // Find the active co-op for the current season + gender view.
  // gender 'B' (both) matches either boys or girls views.
  const activeCoop = memberships.find(
    r => r.season === season && (r.gender === genderCode || r.gender === 'B')
  )

  // When this school is a member, fetch all wrestling data from the co-op
  // school's ID instead — the data lives there, not on the member school.
  const dataSchoolId = activeCoop ? activeCoop.coop_school_id : schoolId

  const seasonLabel = season === 1 ? '2024–25' : '2025–26'
  const coopGenderLabel =
    activeCoop?.gender === 'M' ? 'Boys' :
    activeCoop?.gender === 'F' ? 'Girls' : 'Boys & Girls'

  // Step 3: Fetch wrestling data
  let rows: WrestlerRow[] = []
  let bdRows: BreakdownRow[] = []
  let leaderRows: LeaderRow[] = []
  let teamScoreRows: { tournament_type: string; total_points: number }[] = []

  try {
    const wrestlersPromise = gender === 'girls'
      ? supabase.rpc('girls_school_wrestlers', { p_school_id: dataSchoolId, p_season: season })
      : supabase.rpc('school_wrestlers', { p_school_id: dataSchoolId, p_gender: genderCode, p_season: season })

    // Query precomputed_team_scores by school_id.
    // When viewing via a co-op membership, dataSchoolId is the co-op's ID.
    const tsPromise = supabase.from('precomputed_team_scores')
      .select('tournament_type, total_points')
      .eq('school_id', dataSchoolId).eq('season_id', season)

    const [bdResult, wrResult, ldResult, tsResult] = await Promise.all([
      supabase.rpc('school_points_breakdown', { p_school_id: dataSchoolId, p_gender: genderCode, p_season: season }),
      wrestlersPromise,
      supabase.rpc('school_leaderboard', { p_school_id: dataSchoolId, p_gender: genderCode, p_season: season }),
      tsPromise,
    ])

    if (bdResult.error) console.error('[SchoolProfile] breakdown RPC error:', bdResult.error)
    if (wrResult.error) console.error('[SchoolProfile] wrestlers RPC error:', wrResult.error)
    if (ldResult.error) console.error('[SchoolProfile] leaderboard RPC error:', ldResult.error)
    if (tsResult.error) console.error('[SchoolProfile] team scores query error:', tsResult.error)

    rows = (wrResult.data ?? []) as WrestlerRow[]
    bdRows = (bdResult.data ?? []) as BreakdownRow[]
    leaderRows = (ldResult.data ?? []) as LeaderRow[]
    teamScoreRows = (tsResult.data ?? []) as { tournament_type: string; total_points: number }[]

    // Fallback: if school_id query returned nothing and we're not using co-op data, try by name.
    // Skip fallback when activeCoop is set — data lives on the co-op school_id, not by name.
    if (teamScoreRows.length === 0 && !activeCoop) {
      const altNames = [profile.display_name, schoolAbbrev, schoolName]
      for (const altName of new Set(altNames)) {
        const { data: tsRetry } = await supabase
          .from('precomputed_team_scores')
          .select('tournament_type, total_points')
          .eq('school_name', altName)
          .eq('season_id', season)
        if (tsRetry && tsRetry.length > 0) {
          teamScoreRows = tsRetry as { tournament_type: string; total_points: number }[]
          break
        }
      }
    }
  } catch (e) {
    console.error('[SchoolProfile] RPC fetch error:', e)
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-red-600 mb-2">Error loading wrestling data</h1>
        <p className="text-sm text-slate-600">{e instanceof Error ? e.message : 'Unknown error'}</p>
        <p className="text-xs text-slate-400 mt-1">School: {schoolParam}, Gender: {gender}, Season: {season}</p>
      </div>
    )
  }

  // If boys was the default (no explicit genderParam) and returned no data,
  // redirect to girls before 404-ing. Handles girls-only schools and co-ops
  // where school_coops rows haven't been seeded yet.
  if (!genderParam && gender === 'boys' && rows.length === 0 && bdRows.length === 0 && !activeCoop && coopMembers.length === 0) {
    redirect(`/schools/${schoolParam}?gender=girls`)
  }

  // School existence is already validated above (line 147). Do not 404 here
  // just because the selected gender has no wrestling data — render empty state
  // instead so boys-only schools with ?gender=girls don't produce error pages.

  // Build team score from precomputed rows, filtered by gender
  const boysTypes = ['boys_districts', 'regions', 'boys_state']
  const girlsTypes = ['girls_districts', 'girls_regions', 'girls_state']
  const relevantTypes = gender === 'girls' ? girlsTypes : boysTypes

  const tsMap = new Map<string, number>()
  for (const r of teamScoreRows) {
    if (relevantTypes.includes(r.tournament_type)) {
      tsMap.set(r.tournament_type, (tsMap.get(r.tournament_type) ?? 0) + Number(r.total_points))
    }
  }

  const districtKey = gender === 'girls' ? 'girls_districts' : 'boys_districts'
  const regionKey = gender === 'girls' ? 'girls_regions' : 'regions'
  const stateKey = gender === 'girls' ? 'girls_state' : 'boys_state'


  const teamScore = tsMap.size > 0 ? {
    district_points: tsMap.get(districtKey) ?? 0,
    region_points: tsMap.get(regionKey) ?? 0,
    state_points: tsMap.get(stateKey) ?? 0,
    total_points: [...tsMap.values()].reduce((a, b) => a + b, 0),
  } : null

  const totalPts = teamScore?.total_points ?? bdRows.reduce((sum, r) => sum + Number(r.total_points), 0)
  const totalWins = bdRows.reduce((sum, r) => sum + Number(r.win_count), 0)

  // Fetch district and region assignments for this school
  let districtLabel: string | null = null
  let regionLabel: string | null = null

  if (profile.id > 0) {
    const [{ data: distData }, { data: regData }] = await Promise.all([
      supabase.from('school_districts').select('district:districts(name)').eq('school_id', profile.id),
      supabase.from('school_regions').select('region:regions(name,gender)').eq('school_id', profile.id),
    ])
    if (distData && distData.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = distData[0] as any
      districtLabel = d.district?.name ?? null
    }
    if (regData && regData.length > 0) {
      // Pick the region matching the selected gender, or the first one
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const regions = regData as any[]
      const genderMatch = regions.find(r => r.region?.gender === genderCode)
      regionLabel = (genderMatch ?? regions[0])?.region?.name ?? null
    }
  }

  // Build pill tags
  const tags: string[] = []
  if (profile.town) tags.push(profile.town)
  if (profile.county) tags.push(`${profile.county} County`)
  // Extract number from "District 25" → "25", "Region 7" → "7"
  const districtNum = districtLabel?.match(/\d+/)?.[0] ?? null
  const regionNum = regionLabel?.match(/\d+/)?.[0] ?? null
  const genderBase = gender === 'girls' ? '/girls' : '/boys'
  const conferenceSlug = profile.athletic_conference ? conferenceToSlug(profile.athletic_conference) : null
  const secSlug = profile.section ? sectionToSlug(profile.section) : null
  const grpSlug = profile.classification ? groupToSlug(profile.classification) : null
  const classLabel = profile.section && profile.classification
    ? (profile.section === 'Non-Public' ? `Non-Public ${profile.classification}` : `${profile.section} Group ${profile.classification}`)
    : null

  // Sort wrestlers by weight
  rows.sort((a, b) => a.primary_weight - b.primary_weight)

  // State medalists
  // State medalists = places 1st through 8th only (not round codes like R1, C4)
  const medalPlaces = new Set(['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'])
  const stateMedalists = rows.filter(w => w.state_placement && medalPlaces.has(w.state_placement)).length

  return (
    <>
      {/* SchoolHeader is full-width — outside the max-w-4xl container */}
      <SchoolHeader
        schoolId={profile.id}
        schoolParam={schoolParam}
        schoolName={profile.display_name}
        mascot={profile.mascot}
        nickname={profile.nickname}
        colorPrimary={profile.color_primary}
        colorSecondary={profile.color_secondary}
        colorTertiary={profile.color_tertiary}
        headerBackground={profile.header_background}
        gender={gender as 'boys' | 'girls'}
        activeTab={activeTab}
        activeSeason={season}
        tags={tags}
        districtLabel={districtLabel}
        districtNum={districtNum}
        regionLabel={regionLabel}
        regionNum={regionNum}
        classLabel={classLabel}
        secSlug={secSlug}
        grpSlug={grpSlug}
        conferenceSlug={conferenceSlug}
        athleticConference={profile.athletic_conference}
        websiteUrl={profile.website_url}
        twitterHandle={profile.twitter_handle}
      />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back link */}
        <Link
          href={`/schools?gender=${gender}`}
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
        >
          ← School Directory
        </Link>

        {/* ── CO-OP MEMBER BANNER ───────────────────────────────────────────────
             Shown on member school pages (e.g. Lodi) when the school participated
             in a co-op for the current season + gender.                        */}
        {activeCoop && (
          <div className="mb-6 border border-amber-300 bg-amber-50 rounded-none px-4 py-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {seasonLabel} {coopGenderLabel}: Competed as{' '}
                <Link href={`/schools/${activeCoop.coop_school_id}?gender=${gender}`} className="underline hover:text-amber-700">
                  {activeCoop.coop_name}
                </Link>
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Results below reflect the combined co-op program.
              </p>
            </div>
            <Link
              href={`/schools/${activeCoop.coop_school_id}?gender=${gender}`}
              className="shrink-0 text-xs font-medium text-amber-800 border border-amber-300 bg-white px-3 py-1.5 hover:bg-amber-100 transition-colors whitespace-nowrap"
            >
              Co-op page →
            </Link>
          </div>
        )}

        {/* ── CO-OP MEMBERS PANEL ───────────────────────────────────────────────
             Shown on co-op school pages listing individual member schools.    */}
        {coopMembers.length > 0 && (
          <div className="mb-6 border border-black rounded-none bg-white overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Co-op Program</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500">
                {seasonLabel}
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {coopMembers.map(m => (
                <Link
                  key={m.member_school_id}
                  href={`/schools/${m.member_school_id}?gender=${gender}`}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors group"
                >
                  <span className="text-sm font-medium text-slate-800 group-hover:underline">{m.member_name}</span>
                  <div className="flex items-center gap-2">
                    {m.is_primary && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">Primary</span>
                    )}
                    <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── TABS ── */}
        <SchoolTabs
          school={schoolParam}
          gender={gender}
          activeTab={activeTab}
          primaryColor={pc}
          schoolData={{
            display_name: profile.display_name,
            primary_color: profile.primary_color,
            secondary_color: profile.secondary_color,
            logo_url: profile.logo_url,
          }}
          wrestlers={rows}
          breakdown={bdRows}
          leaders={leaderRows}
          teamScore={teamScore}
          totalPts={totalPts}
          totalWins={totalWins}
          stateMedalists={stateMedalists}
          tourneyLabel={TOURNEY_LABEL}
        />
      </div>
    </>
  )
}
