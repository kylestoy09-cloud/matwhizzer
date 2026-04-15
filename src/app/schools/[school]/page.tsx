export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getActiveSeason } from '@/lib/get-season'
import { conferenceToSlug } from '@/lib/conferences'
import { sectionToSlug, groupToSlug } from '@/lib/sections'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { FollowSchoolButton } from '@/components/FollowSchoolButton'
import { SchoolTabs } from './SchoolTabs'
import { WrestlerAvatar } from '@/components/WrestlerAvatar'

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
    .select('id, display_name, short_name, mascot, nickname, primary_color, secondary_color, tertiary_color, town, county, section, classification, founded_year, website_url, twitter_handle, athletic_conference, logo_url')
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
    if (ldResult.error) console.error('[SchoolProfile] team scores query error:', ldResult.error)

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

  // Don't 404 if this school is a co-op member (data lives on the co-op's ID)
  // or if it IS a co-op school with registered members.
  if (rows.length === 0 && bdRows.length === 0 && !activeCoop && coopMembers.length === 0) notFound()

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
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Back link */}
      <Link
        href={`/schools?gender=${gender}`}
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← School Directory
      </Link>

      {/* ── HEADER ── */}

      {/* Mobile: logo banner + sticky info bar */}
      <div className="md:hidden sticky top-0 z-20">
        {/* Logo banner */}
        {profile.logo_url ? (
          <Image
            src={profile.logo_url}
            alt={profile.display_name}
            width={1079}
            height={647}
            className="w-full h-auto"
          />
        ) : (
          <div
            className="w-full aspect-video flex items-center justify-center text-6xl font-bold"
            style={{ backgroundColor: pc, color: sc }}
          >
            {schoolInitials(profile)}
          </div>
        )}

        {/* Info bar */}
        <div className="bg-white border-b border-black shadow-none px-4 py-3" style={{ borderTop: `3px solid ${pc}` }}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 truncate">{profile.display_name}</h1>
              {profile.mascot && <p className="text-xs text-slate-500 truncate">{profile.mascot}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex rounded-none border border-slate-200 overflow-hidden text-xs">
                <Link href={`/schools/${schoolId}?gender=boys${activeTab !== 'overview' ? `&tab=${activeTab}` : ''}`}
                  className={`px-2.5 py-1 font-medium ${gender === 'boys' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`}>B</Link>
                <Link href={`/schools/${schoolId}?gender=girls${activeTab !== 'overview' ? `&tab=${activeTab}` : ''}`}
                  className={`px-2.5 py-1 font-medium ${gender === 'girls' ? 'bg-rose-700 text-white' : 'bg-white text-slate-500'}`}>G</Link>
              </div>
              <FollowSchoolButton schoolId={profile.id} />
            </div>
          </div>
          {(tags.length > 0 || classLabel || conferenceSlug || profile.athletic_conference === 'Independent') && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{tag}</span>
              ))}
              {districtLabel && districtNum && (
                <Link href={`${genderBase}/districts/${districtNum}`} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{districtLabel}</Link>
              )}
              {regionLabel && regionNum && (
                <Link href={`${genderBase}/regions/${regionNum}`} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{regionLabel}</Link>
              )}
              {classLabel && secSlug && grpSlug && (
                <Link href={`/sections/${secSlug}/${grpSlug}?gender=${gender}`} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{classLabel}</Link>
              )}
              {profile.athletic_conference && conferenceSlug && (
                <Link href={`/conferences/${conferenceSlug}?gender=${gender}`} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{profile.athletic_conference}</Link>
              )}
              {profile.athletic_conference === 'Independent' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">Independent</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Desktop: sticky header with logo left + info right */}
      <div className="hidden md:block sticky top-0 z-20 bg-white border border-black rounded-none shadow-none mb-8" style={{ borderTop: `3px solid ${pc}` }}>
        <div className="flex items-center gap-5 p-4">
          {/* Logo left */}
          <div className="shrink-0">
            {profile.logo_url ? (
              <Image
                src={profile.logo_url}
                alt={profile.display_name}
                width={1079}
                height={647}
                className="w-[240px] h-auto rounded-none"
              />
            ) : (
              <div
                className="w-[160px] h-[96px] rounded-none flex items-center justify-center text-4xl font-bold"
                style={{ backgroundColor: pc, color: sc }}
              >
                {schoolInitials(profile)}
              </div>
            )}
          </div>

          {/* Info right */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-slate-900 truncate">{profile.display_name}</h1>
                {(profile.mascot || profile.nickname) && (
                  <p className="text-sm text-slate-500 mt-0.5">
                    {[profile.mascot, profile.nickname ? `"${profile.nickname}"` : null].filter(Boolean).join(' · ')}
                  </p>
                )}
                {(tags.length > 0 || classLabel || conferenceSlug || profile.athletic_conference === 'Independent') && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tags.map(tag => (
                      <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{tag}</span>
                    ))}
                    {districtLabel && districtNum && (
                      <Link href={`${genderBase}/districts/${districtNum}`} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                        {districtLabel}
                      </Link>
                    )}
                    {regionLabel && regionNum && (
                      <Link href={`${genderBase}/regions/${regionNum}`} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                        {regionLabel}
                      </Link>
                    )}
                    {classLabel && secSlug && grpSlug && (
                      <Link href={`/sections/${secSlug}/${grpSlug}?gender=${gender}`} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                        {classLabel}
                      </Link>
                    )}
                    {profile.athletic_conference && conferenceSlug && (
                      <Link href={`/conferences/${conferenceSlug}?gender=${gender}`} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                        {profile.athletic_conference}
                      </Link>
                    )}
                    {profile.athletic_conference === 'Independent' && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">Independent</span>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                  {profile.founded_year && <span>Est. {profile.founded_year}</span>}
                  {profile.website_url && (
                    <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 inline-flex items-center gap-0.5">
                      Website <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5-6H21m0 0v7.5m0-7.5l-9 9" /></svg>
                    </a>
                  )}
                  {profile.twitter_handle && (
                    <a href={`https://x.com/${profile.twitter_handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-slate-600">
                      {profile.twitter_handle}
                    </a>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex rounded-none border border-slate-200 overflow-hidden text-sm">
                  <Link href={`/schools/${schoolId}?gender=boys${activeTab !== 'overview' ? `&tab=${activeTab}` : ''}`}
                    className={`px-3 py-1.5 font-medium transition-colors ${gender === 'boys' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Boys</Link>
                  <Link href={`/schools/${schoolId}?gender=girls${activeTab !== 'overview' ? `&tab=${activeTab}` : ''}`}
                    className={`px-3 py-1.5 font-medium transition-colors ${gender === 'girls' ? 'bg-rose-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Girls</Link>
                </div>
                <FollowSchoolButton schoolId={profile.id} />
                <div className="flex items-center text-xs text-slate-400">
                  <InlineSeasonPicker activeSeason={season} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CO-OP MEMBER BANNER ─────────────────────────────────────────────────
           Shown on member school pages (e.g. Lodi) when the school participated
           in a co-op for the current season + gender. Data is mirrored from the
           co-op school record — nothing is duplicated in the DB.              */}
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

      {/* ── CO-OP MEMBERS PANEL ──────────────────────────────────────────────────
           Shown on co-op school pages (e.g. Lodi/Saddle Brook) listing the
           individual member schools with links to their profiles.             */}
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
  )
}
