export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getActiveSeason } from '@/lib/get-season'
import { conferenceToSlug } from '@/lib/conferences'
import { sectionToSlug, groupToSlug } from '@/lib/sections'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { FollowSchoolButton } from '@/components/FollowSchoolButton'
import { SchoolTabs } from './SchoolTabs'

// ── Types ─────────────────────────────────────────────────────────────────────

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
  const { school: encoded } = await params
  const school = decodeURIComponent(encoded)
  const { gender: genderParam, tab: tabParam } = await searchParams

  const gender = genderParam === 'girls' ? 'girls' : 'boys'
  const genderCode = gender === 'girls' ? 'F' : 'M'
  const activeTab = tabParam ?? 'overview'

  let season: number
  try {
    season = await getActiveSeason()
  } catch (e) {
    console.error('[SchoolProfile] getActiveSeason failed:', e)
    season = 2
  }

  const TOURNEY_LABEL = gender === 'girls' ? TOURNEY_LABEL_F : TOURNEY_LABEL_M

  // Step 1: Resolve the URL slug to a school name
  // The slug could be an abbreviation (e.g. "BECA") OR a display name (e.g. "Bergen Catholic")
  // Try abbreviation lookup first, then fall back to treating it as a display name
  let schoolName: string
  let schoolAbbrev: string = school

  const { data: nameRow, error: nameError } = await supabase
    .from('school_names')
    .select('abbreviation, school_name')
    .eq('abbreviation', school)
    .maybeSingle()

  if (nameError) {
    console.error('[SchoolProfile] school_names query error:', nameError)
  }

  if (nameRow) {
    // Found by abbreviation
    schoolName = (nameRow as { school_name: string }).school_name
  } else {
    // Not an abbreviation — treat the slug as a display name (old URL format)
    // Try to find the abbreviation for it
    const { data: reverseRow } = await supabase
      .from('school_names')
      .select('abbreviation, school_name')
      .eq('school_name', school)
      .maybeSingle()

    if (reverseRow) {
      schoolName = (reverseRow as { school_name: string }).school_name
      schoolAbbrev = (reverseRow as { abbreviation: string }).abbreviation
    } else {
      // Last resort: use the slug as-is (it might match a schools.display_name directly)
      schoolName = school
    }
  }

  // Step 2: Look up full profile from schools table
  // Try exact match first, then ILIKE prefix match for abbreviated names
  let profileData: SchoolProfile | null = null
  let profileError: { message: string } | null = null

  const { data: profileExact, error: profileErr1 } = await supabase
    .from('schools')
    .select('id, display_name, short_name, mascot, nickname, primary_color, secondary_color, tertiary_color, town, county, section, classification, founded_year, website_url, twitter_handle, athletic_conference, logo_url')
    .eq('display_name', schoolName)
    .maybeSingle()

  if (profileErr1) {
    profileError = profileErr1
  } else if (profileExact) {
    profileData = profileExact as SchoolProfile
  } else {
    // Exact match failed — try ILIKE prefix (handles "Lower Cape May Reg" → "Lower Cape May Regional")
    const { data: profileFuzzy, error: profileErr2 } = await supabase
      .from('schools')
      .select('id, display_name, short_name, mascot, nickname, primary_color, secondary_color, tertiary_color, town, county, section, classification, founded_year, website_url, twitter_handle, athletic_conference, logo_url')
      .ilike('display_name', `${schoolName}%`)
      .limit(1)
      .maybeSingle()

    if (profileErr2) {
      profileError = profileErr2
    } else if (profileFuzzy) {
      profileData = profileFuzzy as SchoolProfile
    }
  }

  if (profileError) {
    console.error('[SchoolProfile] schools query error:', profileError)
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-red-600 mb-2">Error loading school profile</h1>
        <p className="text-sm text-slate-600">schools query failed: {profileError.message}</p>
        <p className="text-xs text-slate-400 mt-1">School name: {schoolName}</p>
      </div>
    )
  }

  const profile: SchoolProfile = profileData ?? {
    id: 0, display_name: schoolName, short_name: null, mascot: null, nickname: null,
    primary_color: '#1a1a2e', secondary_color: '#FFD700', tertiary_color: null,
    town: null, county: null, section: null, classification: null,
    founded_year: null, website_url: null, twitter_handle: null, athletic_conference: null,
    logo_url: null,
  }

  const pc = profile.primary_color ?? '#1a1a2e'
  const sc = profile.secondary_color ?? '#FFD700'

  // Resolve the RPC-compatible school name
  // RPCs use school_context_raw which matches school_names.school_name, not schools.display_name
  // e.g. "Lower Cape May Reg" (school_names) vs "Lower Cape May Regional" (schools.display_name)
  let rpcSchoolName = schoolName
  if (profileData && profile.display_name !== schoolName) {
    // schoolName already came from school_names, should be fine
  } else if (profileData) {
    // schoolName came from display_name fallback — look up the RPC-compatible name
    const { data: snLookup } = await supabase
      .from('school_names')
      .select('school_name')
      .ilike('school_name', `${profile.display_name.substring(0, Math.min(15, profile.display_name.length))}%`)
      .limit(1)
      .maybeSingle()
    if (snLookup) {
      rpcSchoolName = (snLookup as { school_name: string }).school_name
    }
  }

  // Step 3: Fetch wrestling data
  let rows: WrestlerRow[] = []
  let bdRows: BreakdownRow[] = []
  let leaderRows: LeaderRow[] = []
  let teamScoreRows: { tournament_type: string; total_points: number }[] = []

  try {
    const wrestlersPromise = gender === 'girls'
      ? supabase.rpc('girls_school_wrestlers', { p_school: rpcSchoolName, p_season: season })
      : supabase.rpc('school_wrestlers', { p_school: rpcSchoolName, p_gender: genderCode, p_season: season })

    // Query precomputed_team_scores by school_id (reliable) with school_name fallback
    const tsPromise = profile.id > 0
      ? supabase.from('precomputed_team_scores').select('tournament_type, total_points')
          .eq('school_id', profile.id).eq('season_id', season)
      : supabase.from('precomputed_team_scores').select('tournament_type, total_points')
          .eq('school_name', profile.display_name).eq('season_id', season)

    const [bdResult, wrResult, ldResult, tsResult] = await Promise.all([
      supabase.rpc('school_points_breakdown', { p_school: rpcSchoolName, p_gender: genderCode, p_season: season }),
      wrestlersPromise,
      supabase.rpc('school_leaderboard', { p_school: rpcSchoolName, p_gender: genderCode, p_season: season }),
      tsPromise,
    ])

    if (bdResult.error) console.error('[SchoolProfile] breakdown RPC error:', bdResult.error)
    if (wrResult.error) console.error('[SchoolProfile] wrestlers RPC error:', wrResult.error)
    if (ldResult.error) console.error('[SchoolProfile] team scores query error:', ldResult.error)

    rows = (wrResult.data ?? []) as WrestlerRow[]
    bdRows = (bdResult.data ?? []) as BreakdownRow[]
    leaderRows = (ldResult.data ?? []) as LeaderRow[]
    teamScoreRows = (tsResult.data ?? []) as { tournament_type: string; total_points: number }[]

    // Fallback: if school_id query returned nothing, try by name
    if (teamScoreRows.length === 0 && profile.id > 0) {
      const altNames = [profile.display_name, rpcSchoolName, schoolName]
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
        <p className="text-xs text-slate-400 mt-1">School: {school}, Gender: {gender}, Season: {season}</p>
      </div>
    )
  }

  if (rows.length === 0 && bdRows.length === 0) notFound()

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
        href={`/${gender}/schools`}
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
        <div className="bg-white border-b border-slate-200 shadow-sm px-4 py-3" style={{ borderTop: `3px solid ${pc}` }}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 truncate">{profile.display_name}</h1>
              {profile.mascot && <p className="text-xs text-slate-500 truncate">{profile.mascot}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                <Link href={`/schools/${school}?gender=boys${activeTab !== 'overview' ? `&tab=${activeTab}` : ''}`}
                  className={`px-2.5 py-1 font-medium ${gender === 'boys' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`}>B</Link>
                <Link href={`/schools/${school}?gender=girls${activeTab !== 'overview' ? `&tab=${activeTab}` : ''}`}
                  className={`px-2.5 py-1 font-medium ${gender === 'girls' ? 'bg-rose-700 text-white' : 'bg-white text-slate-500'}`}>G</Link>
              </div>
              <FollowSchoolButton schoolAbbreviation={schoolAbbrev} />
            </div>
          </div>
          {(tags.length > 0 || classLabel || conferenceSlug) && (
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
            </div>
          )}
        </div>
      </div>

      {/* Desktop: sticky header with logo left + info right */}
      <div className="hidden md:block sticky top-0 z-20 bg-white border border-slate-200 rounded-xl shadow-sm mb-8" style={{ borderTop: `3px solid ${pc}` }}>
        <div className="flex items-center gap-5 p-4">
          {/* Logo left */}
          <div className="shrink-0">
            {profile.logo_url ? (
              <Image
                src={profile.logo_url}
                alt={profile.display_name}
                width={1079}
                height={647}
                className="w-[240px] h-auto rounded-lg"
              />
            ) : (
              <div
                className="w-[160px] h-[96px] rounded-lg flex items-center justify-center text-4xl font-bold"
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
                {(tags.length > 0 || classLabel || conferenceSlug) && (
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
                <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
                  <Link href={`/schools/${school}?gender=boys${activeTab !== 'overview' ? `&tab=${activeTab}` : ''}`}
                    className={`px-3 py-1.5 font-medium transition-colors ${gender === 'boys' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Boys</Link>
                  <Link href={`/schools/${school}?gender=girls${activeTab !== 'overview' ? `&tab=${activeTab}` : ''}`}
                    className={`px-3 py-1.5 font-medium transition-colors ${gender === 'girls' ? 'bg-rose-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Girls</Link>
                </div>
                <FollowSchoolButton schoolAbbreviation={schoolAbbrev} />
                <div className="flex items-center text-xs text-slate-400">
                  <InlineSeasonPicker activeSeason={season} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <SchoolTabs
        school={school}
        gender={gender}
        activeTab={activeTab}
        primaryColor={pc}
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
