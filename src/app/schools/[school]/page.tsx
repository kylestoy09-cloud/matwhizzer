import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getActiveSeason } from '@/lib/get-season'
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
  const { data: profileData, error: profileError } = await supabase
    .from('schools')
    .select('id, display_name, short_name, mascot, nickname, primary_color, secondary_color, tertiary_color, town, county, section, classification, founded_year, website_url, twitter_handle, athletic_conference, logo_url')
    .eq('display_name', schoolName)
    .maybeSingle()

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

  const profile: SchoolProfile = (profileData as SchoolProfile | null) ?? {
    id: 0, display_name: schoolName, short_name: null, mascot: null, nickname: null,
    primary_color: '#1a1a2e', secondary_color: '#FFD700', tertiary_color: null,
    town: null, county: null, section: null, classification: null,
    founded_year: null, website_url: null, twitter_handle: null, athletic_conference: null,
    logo_url: null,
  }

  const pc = profile.primary_color ?? '#1a1a2e'
  const sc = profile.secondary_color ?? '#FFD700'

  // Step 3: Fetch wrestling data
  let rows: WrestlerRow[] = []
  let bdRows: BreakdownRow[] = []
  let leaderRows: LeaderRow[] = []
  let teamScore: { district_points: number; region_points: number; state_points: number; total_points: number } | null = null

  try {
    const wrestlersPromise = gender === 'girls'
      ? supabase.rpc('girls_school_wrestlers', { p_school: schoolName, p_season: season })
      : supabase.rpc('school_wrestlers', { p_school: schoolName, p_gender: genderCode, p_season: season })

    const [bdResult, wrResult, ldResult, tsResult] = await Promise.all([
      supabase.rpc('school_points_breakdown', { p_school: schoolName, p_gender: genderCode, p_season: season }),
      wrestlersPromise,
      supabase.rpc('school_leaderboard', { p_school: schoolName, p_gender: genderCode, p_season: season }),
      supabase.rpc('top_postseason_team_scores', { p_gender: genderCode, p_season: season, p_limit: 500 }),
    ])

    if (bdResult.error) console.error('[SchoolProfile] breakdown RPC error:', bdResult.error)
    if (wrResult.error) console.error('[SchoolProfile] wrestlers RPC error:', wrResult.error)
    if (ldResult.error) console.error('[SchoolProfile] leaderboard RPC error:', ldResult.error)

    rows = (wrResult.data ?? []) as WrestlerRow[]
    bdRows = (bdResult.data ?? []) as BreakdownRow[]
    leaderRows = (ldResult.data ?? []) as LeaderRow[]

    // Find this school's team score from the full ranked list
    const allTeamScores = (tsResult.data ?? []) as { school: string; district_points: number; region_points: number; state_points: number; total_points: number }[]
    teamScore = allTeamScores.find(r => r.school === schoolName) ?? null
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

  const totalPts = teamScore?.total_points ?? bdRows.reduce((sum, r) => sum + Number(r.total_points), 0)
  const totalWins = bdRows.reduce((sum, r) => sum + Number(r.win_count), 0)

  // Build pill tags
  const tags: string[] = []
  if (profile.town) tags.push(profile.town)
  if (profile.county) tags.push(`${profile.county} County`)
  const classLabel = classificationLabel(profile)
  if (classLabel) tags.push(classLabel)
  if (profile.athletic_conference) tags.push(profile.athletic_conference)

  // Sort wrestlers by weight
  rows.sort((a, b) => a.primary_weight - b.primary_weight)

  // State medalists
  const stateMedalists = rows.filter(w => w.state_placement).length

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
      <div className="relative mb-14">
        {/* Square logo — overflows the header card */}
        <div className="absolute left-5 -top-4 z-10">
          {profile.logo_url ? (
            <Image
              src={profile.logo_url}
              alt={profile.display_name}
              width={120}
              height={120}
              className="w-[120px] h-[120px] rounded-xl object-cover shadow-lg border-2 border-white"
            />
          ) : (
            <div
              className="w-[120px] h-[120px] rounded-xl flex items-center justify-center shadow-lg border-2 border-white text-3xl font-bold"
              style={{ backgroundColor: pc, color: sc }}
            >
              {schoolInitials(profile)}
            </div>
          )}
        </div>

        {/* Header card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm pt-4 pb-5 pl-[160px] pr-5" style={{ borderTop: `3px solid ${pc}` }}>
          <div className="flex items-start justify-between gap-4">
            {/* Left: school info */}
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{profile.display_name}</h1>
              {(profile.mascot || profile.nickname) && (
                <p className="text-sm text-slate-500 mt-0.5">
                  {[profile.mascot, profile.nickname ? `"${profile.nickname}"` : null].filter(Boolean).join(' · ')}
                </p>
              )}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map(tag => (
                    <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{tag}</span>
                  ))}
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

            {/* Right: gender toggle + follow */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
                <Link
                  href={`/schools/${school}?gender=boys${activeTab !== 'overview' ? `&tab=${activeTab}` : ''}`}
                  className={`px-3 py-1.5 font-medium transition-colors ${gender === 'boys' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                >
                  Boys
                </Link>
                <Link
                  href={`/schools/${school}?gender=girls${activeTab !== 'overview' ? `&tab=${activeTab}` : ''}`}
                  className={`px-3 py-1.5 font-medium transition-colors ${gender === 'girls' ? 'bg-rose-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                >
                  Girls
                </Link>
              </div>
              <FollowSchoolButton schoolAbbreviation={schoolAbbrev} />
              <div className="flex items-center text-xs text-slate-400">
                <InlineSeasonPicker activeSeason={season} />
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
