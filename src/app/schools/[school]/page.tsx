import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getActiveSeason } from '@/lib/get-season'
import { SEASONS } from '@/lib/seasons'
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
  const season = await getActiveSeason()
  const TOURNEY_LABEL = gender === 'girls' ? TOURNEY_LABEL_F : TOURNEY_LABEL_M

  // Fetch school profile from schools table (matched by abbreviation via school_names)
  const { data: nameRow } = await supabase
    .from('school_names')
    .select('abbreviation, school_name')
    .eq('abbreviation', school)
    .maybeSingle()

  if (!nameRow) notFound()
  const schoolName = (nameRow as { school_name: string }).school_name

  // Fetch full profile from schools table by matching display_name
  const { data: profileData } = await supabase
    .from('schools')
    .select('id, display_name, short_name, mascot, nickname, primary_color, secondary_color, tertiary_color, town, county, section, classification, founded_year, website_url, twitter_handle, athletic_conference')
    .eq('display_name', schoolName)
    .maybeSingle()

  const profile = (profileData as SchoolProfile | null) ?? {
    id: 0, display_name: schoolName, short_name: null, mascot: null, nickname: null,
    primary_color: '#1a1a2e', secondary_color: '#FFD700', tertiary_color: null,
    town: null, county: null, section: null, classification: null,
    founded_year: null, website_url: null, twitter_handle: null, athletic_conference: null,
  }

  const pc = profile.primary_color ?? '#1a1a2e'
  const sc = profile.secondary_color ?? '#FFD700'

  // Fetch wrestling data
  const rpcWrestlers = gender === 'girls' ? 'girls_school_wrestlers' : 'school_wrestlers'
  const [{ data: breakdown }, { data: wrestlers }, { data: leaders }] = await Promise.all([
    supabase.rpc('school_points_breakdown', { p_school: school, p_gender: genderCode, p_season: season }),
    supabase.rpc(rpcWrestlers, { p_school: school, p_gender: genderCode, p_season: season }),
    supabase.rpc('school_leaderboard', { p_school: school, p_gender: genderCode, p_season: season }),
  ])

  const rows = (wrestlers ?? []) as WrestlerRow[]
  const bdRows = (breakdown ?? []) as BreakdownRow[]
  const leaderRows = (leaders ?? []) as LeaderRow[]

  if (rows.length === 0 && bdRows.length === 0) notFound()

  const totalPts = bdRows.reduce((sum, r) => sum + Number(r.total_points), 0)
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
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-8" style={{ borderTop: `3px solid ${pc}` }}>
        <div className="px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            {/* Left: avatar + info */}
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 text-lg font-bold"
                style={{ backgroundColor: pc, color: sc }}
              >
                {schoolInitials(profile)}
              </div>
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
              <FollowSchoolButton schoolAbbreviation={school} />
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
        totalPts={totalPts}
        totalWins={totalWins}
        stateMedalists={stateMedalists}
        tourneyLabel={TOURNEY_LABEL}
      />
    </div>
  )
}
