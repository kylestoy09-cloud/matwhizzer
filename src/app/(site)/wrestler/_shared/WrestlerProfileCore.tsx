import { ROUND_ORDER, ROUND_LABEL, TOURNAMENT_TYPE_LABEL } from '@/lib/supabase'
import { supabase } from '@/lib/supabase/public-cached'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { offseasonBadges, BADGE_LOOK } from '@/lib/offseasonBadges'
import Link from 'next/link'
import { Fragment } from 'react'
import { offseasonFor, offseasonMatches } from '@/lib/offseasonPublic'
import { OffseasonProfileTable } from '@/components/site/OffseasonBoard'
import { personLabel } from '@/lib/personName'
import { SchoolTag } from '@/components/SchoolTag'
import { notFound } from 'next/navigation'
import { WrestlerHeader } from '@/components/WrestlerHeader'
import { StatsTable } from '@/components/StatsTable'
import { conferenceToSlug } from '@/lib/conferences'
import { sectionToSlug, groupToSlug } from '@/lib/sections'
import { getSeasons, getHistorySeasons } from '@/lib/seasons-server'
import { canSeeHiddenHistory } from '@/lib/get-season'
import { preRecordFinishes } from '@/lib/preRecordFinishes'
import { NjwhLink } from '@/components/site/NjwhLink'
import { collegeCareer } from '@/lib/ncaa/stats'
import { CollegeBars, CollegeMedals, CollegeSection } from '@/components/site/CollegeProfile'
import { RATING_NAME, RATING_SHORT } from '@/lib/rating'
import { profileWhizRank } from '@/lib/whizRank'
import { IconHint } from '@/components/site/IconHint'
import { placementHint, badgeHint, terminatorHint, tournamentPlaceHint } from '@/lib/awardHints'
import { wrestlerStatRanks, type StatKey } from '@/lib/wrestlerStatRanks'
import { liveSeasonId, seasonLabel as lookupSeasonLabel, type SeasonInfo } from '@/lib/seasons'

// ── Types ─────────────────────────────────────────────────────────────────────

type TournamentInfo  = { name: string; tournament_type: string; season_id: number }
type WeightClassInfo = { weight: number }

type Match = {
  id: string
  round: string | null
  bracket_side: string | null
  win_type: string | null
  winner_score: number | null
  loser_score: number | null
  fall_time_seconds: number | null
  winner_entry_id: string | null
  loser_entry_id: string | null
  // Supabase may return nested joins as object or array depending on inference
  tournament: TournamentInfo | TournamentInfo[] | null
  weight_class: WeightClassInfo | WeightClassInfo[] | null
}

function unwrap<T>(v: T | T[] | null): T | null {
  if (v == null) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

type MatchGroup = {
  tournament_name: string
  tournament_type: string
  weight: number
  season_id: number
  matches: (Match & { result: 'W' | 'L'; opponent: string; opponentSchool: string | null; opponentSchoolId: number | null; opponentId: string | null })[]
}

// Short season tag for badges: season ids are the championship (end) year, e.g. 2026 → '26
function seasonShort(seasonId: number): string {
  return seasonId > 0 ? `'${String(seasonId).slice(-2)}` : ''
}

function placementShortLabel(tournamentName: string, tournamentType: string): string {
  const clean = cleanTournamentName(tournamentName)
  const distMatch = clean.match(/District (\d+)/)
  if (distMatch) return `D${distMatch[1]}`
  const regMatch = clean.match(/Region (\d+)/)
  if (regMatch) return `R${regMatch[1]}`
  if (tournamentType.includes('state')) return 'State'
  return clean
}

// Sort order for tournament types within a season
const TOURNAMENT_TYPE_ORDER: Record<string, number> = {
  districts:    0,
  regions:      1,
  girls_regions: 1,
  boys_state:   2,
  girls_state:  2,
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatScore(m: Match, isWinner: boolean): string {
  if (m.win_type === 'FALL') {
    if (m.fall_time_seconds) {
      const min = Math.floor(m.fall_time_seconds / 60)
      const sec = String(m.fall_time_seconds % 60).padStart(2, '0')
      return `Fall ${min}:${sec}`
    }
    return 'Fall'
  }
  if (m.win_type === 'TF' || m.win_type === 'TF-1.5') {
    const w = m.winner_score ?? '?'
    const l = m.loser_score ?? '?'
    const score = `${m.win_type} ${isWinner ? w : l}-${isWinner ? l : w}`
    if (m.fall_time_seconds) {
      const min = Math.floor(m.fall_time_seconds / 60)
      const sec = String(m.fall_time_seconds % 60).padStart(2, '0')
      return `${score} ${min}:${sec}`
    }
    return score
  }
  if (m.winner_score != null && m.loser_score != null &&
      (m.winner_score > 0 || m.loser_score > 0)) {
    return isWinner
      ? `${m.winner_score}-${m.loser_score}`
      : `${m.loser_score}-${m.winner_score}`
  }
  return m.win_type ?? ''
}

// Maps season text ("2025-26") → season id (the championship/end year, e.g. 2026)
function seasonToId(seasons: SeasonInfo[], season: string | null): number {
  if (!season) return 0
  const startYear = parseInt(season.split('-')[0])
  return seasons.find(s => s.label === season || s.start_year === startYear)?.id ?? 0
}

// Postseason tournament → season_calendar.event_type (dates come from the calendar, per season)
function postseasonEventType(tournamentType: string, gender: string | null): string | null {
  const g = gender === 'F' ? 'girls' : 'boys'
  switch (tournamentType) {
    case 'districts':     return `individual_district_${g}`
    case 'regions':       return 'individual_region_boys'
    case 'girls_regions': return 'individual_region_girls'
    case 'boys_state':    return 'individual_state_boys'
    case 'girls_state':   return 'individual_state_girls'
    default:              return null
  }
}

type CalendarDate = { event_date: string; event_date_end: string | null }

function formatCalendarDate(d: CalendarDate): string {
  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('en-US', opts)
  if (!d.event_date_end || d.event_date_end === d.event_date) {
    return fmt(d.event_date, { month: 'short', day: 'numeric', year: 'numeric' })
  }
  const [y1, m1] = d.event_date.split('-')
  const [y2, m2, d2] = d.event_date_end.split('-')
  const startLabel = fmt(d.event_date, { month: 'short', day: 'numeric' })
  if (y1 === y2 && m1 === m2) return `${startLabel}–${parseInt(d2)}, ${y2}`
  return `${startLabel} – ${fmt(d.event_date_end, { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function matchTypeColor(type: string): string {
  switch (type) {
    case 'Dual':       return 'bg-slate-100 text-slate-700'
    case 'Tournament': return 'bg-indigo-100 text-indigo-800'
    case 'Districts':  return 'bg-amber-100 text-amber-800'
    case 'Regions':    return 'bg-emerald-100 text-emerald-800'
    case 'State':      return 'bg-blue-100 text-blue-800'
    default:           return 'bg-slate-100 text-slate-700'
  }
}

function tournamentTypeColor(tt: string): string {
  switch (tt) {
    case 'districts':    return 'bg-amber-100 text-amber-800'
    case 'regions':      return 'bg-emerald-100 text-emerald-800'
    case 'boys_state':   return 'bg-blue-100 text-blue-800'
    case 'girls_regions':return 'bg-purple-100 text-purple-800'
    case 'girls_state':  return 'bg-pink-100 text-pink-800'
    default:             return 'bg-slate-100 text-slate-700'
  }
}

function cleanTournamentName(raw: string): string {
  let n = raw.replace('Boy_s ', '').replace('Girl_s ', '')
  // "Districts District 2" → "District 2"
  n = n.replace(/^Districts /, '')
  // "Regions r1" → "Region 1", "Regions Region 2" → "Region 2"
  n = n.replace(/^Regions r(\d+)$/i, 'Region $1')
  n = n.replace(/^Regions /, '')
  // "States" → "State"
  n = n.replace(/^States$/, 'State')
  return n
}

function formatMatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m ${secs}s`
}

function formatPinTimeStat(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = String(seconds % 60).padStart(2, '0')
  return `${min}:${sec}`
}

function computeMatchMatTime(winType: string | null, fallTime: number | null, isLoss: boolean = false): number {
  if (!winType || winType === 'BYE') return 0
  if (['FORF', 'FOR', 'INJ', 'DQ', 'FF', 'DEF', 'MFF'].includes(winType)) return 0
  // Loss by fall = full 6:00 period regardless of when the pin occurred
  if (isLoss && winType === 'FALL') return 360
  if (['FALL', 'TF', 'TF-1.5'].includes(winType) && fallTime && fallTime > 0) return fallTime
  if (['DEC', 'MD'].includes(winType)) return 420
  if (['SV-1', 'TB-1'].includes(winType)) return 480
  if (['TB-2', 'UTB', '2-OT'].includes(winType)) return 540
  if (['FALL', 'TF', 'TF-1.5'].includes(winType)) return 420
  return 420
}

// ── Component ──────────────────────────────────────────────────────────────────

// A wrestler's class in a season, from their graduation year (seasons are keyed by end year: class of
// 2027 is a Sophomore in 2024-25, season 2025). Outside high school years: none.
const CLASS_NAMES: Record<number, [string, string]> = { 9: ['Freshman', 'Fr'], 10: ['Sophomore', 'So'], 11: ['Junior', 'Jr'], 12: ['Senior', 'Sr'] }
function classInSeason(graduationYear: number | null | undefined, seasonId: number): [string, string] | null {
  if (!graduationYear) return null
  return CLASS_NAMES[12 - (graduationYear - seasonId)] ?? null
}

// offseason = the offseason table for a wrestler on the Insight Off-Season board; order = tournaments listed final
// first, first round last, and a graduated wrestler's history oldest first (Kyle 2026-11-13; live 2026-11-14 — the site
// routes pass both); fresh = build the board now rather than from the 5-minute cache (the Aesthetic Tool)
export async function WrestlerProfileCore({ wrestlerId, preview }: { wrestlerId: string; preview?: { offseason?: boolean; order?: boolean; fresh?: boolean } }) {
  const [allSeasons, calendarRes] = await Promise.all([
    getSeasons(),
    supabase
      .from('season_calendar')
      .select('season_id, event_type, event_date, event_date_end')
      .like('event_type', 'individual_%'),
  ])
  const id = wrestlerId

  // Postseason dates by `${season_id}|${event_type}`
  const postseasonCalendar = new Map<string, CalendarDate>(
    ((calendarRes.data ?? []) as ({ season_id: number; event_type: string } & CalendarDate)[])
      .map(r => [`${r.season_id}|${r.event_type}`, r])
  )
  const postseasonDate = (tournamentType: string, seasonId: number): CalendarDate | undefined => {
    const eventType = postseasonEventType(tournamentType, wrestler?.gender ?? null)
    return eventType ? postseasonCalendar.get(`${seasonId}|${eventType}`) : undefined
  }
  const postseasonDateLabel = (tournamentType: string, seasonId: number): string | null => {
    const d = postseasonDate(tournamentType, seasonId)
    return d ? formatCalendarDate(d) : null
  }
  // No calendar date → end of that season, in bracket order (districts, regions, state)
  const postseasonSortDate = (tournamentType: string, seasonId: number): string =>
    postseasonDate(tournamentType, seasonId)?.event_date
      ?? `${seasonId}-12-3${TOURNAMENT_TYPE_ORDER[tournamentType] ?? 0}`

  // 1. Wrestler
  const { data: wrestler } = await supabase
    .from('wrestlers')
    .select('id, first_name, last_name, gender, suffix, graduation_year')
    .eq('id', id)
    .single()

  if (!wrestler) notFound()
  // a line set on the admin wrestler page (Status), shown in italics under the name in the header (Kyle 2026-11-17)
  const { data: statusRow } = await supabase.from('wrestlers').select('status, status_note').eq('id', id).maybeSingle()
  const statusNote = (statusRow as { status_note?: string | null } | null)?.status_note ?? null
  // Finishes from before our records tied to this profile (Kyle 2026-11-17: a profile for every pre-2013 place winner;
  // docs/migrations/20261117_history_profiles.sql), and the line Kyle adds when a same-named wrestler elsewhere may
  // be the same person. Nothing before the migration.
  const histDb = createSupabaseAdmin()
  const [{ data: linkedRows }, { data: histMeta }] = await Promise.all([
    histDb.from('history_finishes').select('year, level, region, region_name, weight, place, school, school_id').eq('wrestler_id', id).order('year'),
    histDb.from('wrestlers').select('origin, history_note').eq('id', id).maybeSingle(),
  ])
  const linked = ((linkedRows ?? []) as { year: number; level: string; region: number | null; region_name: string | null; weight: string; place: number; school: string | null; school_id: number | null }[])
    .filter(f => f.level === 'state' || f.place === 1)
  const historyNote = (histMeta as { history_note?: string | null } | null)?.history_note ?? null
  // college years (NCAA championships; src/lib/ncaa/stats.ts): bars under the header, medals, a section after HS —
  // in the Aesthetic Tool mock only until Kyle approves (preview.college)
  // college years (live 2026-11-18): bars under the header, NCAA medals, the College section after high school
  const college = await collegeCareer(histDb, wrestler.gender === 'F' ? 'F' : 'M', id)
  // offseason badges — Super 32 / Fargo podiums, Ironman and world titles (src/lib/offseasonBadges.ts): in the medal
  // case with the season they belong to (live 2026-11-18)
  const badges = (await offseasonBadges(histDb, wrestler.gender === 'F' ? 'F' : 'M', [id])).get(id) ?? []
  // a wrestler who has passed away shows the years he wrestled in place of a grade ("Wrestled 2024-2026")
  const inMemory = (statusRow as { status?: string | null } | null)?.status === 'deceased'

  // Playoff History seasons (2013 on): shown only once switched on (history_public); until then their entries are left
  // out entirely (2026-11-14: a hidden 2023-24 showed on a live girls profile) — except for an admin, who sees them to
  // check before switching them on (Kyle 2026-11-14). The seasons shown get their labels.
  const [historySeasons, seeHidden] = await Promise.all([getHistorySeasons(wrestler.gender === 'F' ? 'F' : 'M'), canSeeHiddenHistory()])
  const hiddenSeasons = new Set(seeHidden ? [] : historySeasons.filter(h => !h.public).map(h => h.id))
  const labelSeasons: SeasonInfo[] = [...allSeasons, ...historySeasons.filter(h => !hiddenSeasons.has(h.id)).map(h => ({ id: h.id, label: h.label, start_year: h.end_year - 1, end_year: h.end_year, public_genders: [], live_genders: [], stages: {} }))]
  const shown = <T,>(rows: T[] | null) => (rows ?? []).filter(r => { const t = (r as { tournament?: { season_id?: number } | { season_id?: number }[] | null }).tournament; const sid = Array.isArray(t) ? t[0]?.season_id : t?.season_id; return sid == null || !hiddenSeasons.has(sid) })

  // 2. All entries for this wrestler (include school, grade, season record, and season via tournament join)
  const { data: entriesAll } = await supabase
    .from('tournament_entries')
    .select('id, school_id, school:schools(id, display_name), grade_label, wins, losses, tournament:tournaments(season_id, tournament_type)')
    .eq('wrestler_id', id)
  const entries = shown(entriesAll)

  const entryIds = (entries ?? []).map((e: { id: string }) => e.id)

  // Determine the current (latest) season this wrestler has entries in
  type EntryRow = {
    id: string
    school_id: number | null
    school: { id: number; display_name: string } | null
    grade_label: string | null
    wins: number | null
    losses: number | null
    tournament: { season_id: number; tournament_type: string } | { season_id: number; tournament_type: string }[] | null
  }
  const typedEntries = (entries ?? []) as unknown as EntryRow[]
  const entrySeasons = typedEntries.map(
    e => (unwrap(e.tournament) as { season_id: number } | null)?.season_id ?? 0
  )
  const currentSeason = entrySeasons.length > 0 ? Math.max(...entrySeasons) : (liveSeasonId(allSeasons, wrestler.gender === 'F' ? 'F' : 'M') ?? 0)

  // School and grade: prefer current season entries, fall back to any
  const currentEntries = typedEntries.filter(
    e => ((unwrap(e.tournament) as { season_id: number } | null)?.season_id ?? 0) === currentSeason
  )
  const primarySchoolEntry =
    currentEntries.find(e => e.school_id) ?? typedEntries.find(e => e.school_id) ?? null
  const primarySchool = primarySchoolEntry?.school?.display_name ?? null
  const primarySchoolId = primarySchoolEntry?.school_id ?? null
  const primaryGrade = inMemory ? null :
    currentEntries.find(e => e.grade_label)?.grade_label ??
    typedEntries.find(e => e.grade_label)?.grade_label ?? null

  // Season record: wins/losses from the earliest tournament the wrestler entered this season
  const currentEntriesWithRecord = currentEntries
    .filter(e => (e.wins ?? 0) > 0 || (e.losses ?? 0) > 0)
    .sort((a, b) => {
      const ttA = TOURNAMENT_TYPE_ORDER[(unwrap(a.tournament) as { tournament_type: string } | null)?.tournament_type ?? ''] ?? 9
      const ttB = TOURNAMENT_TYPE_ORDER[(unwrap(b.tournament) as { tournament_type: string } | null)?.tournament_type ?? ''] ?? 9
      return ttA - ttB
    })
  const seasonRecord = currentEntriesWithRecord.length > 0
    ? { wins: currentEntriesWithRecord[0].wins ?? 0, losses: currentEntriesWithRecord[0].losses ?? 0 }
    : null

  // 3. Matches as winner + matches as loser (parallel), plus school name lookup
  //    Also fetch in-season tournament bouts for this wrestler
  const selectFields = `
    id, round, bracket_side, win_type,
    winner_score, loser_score, fall_time_seconds,
    winner_entry_id, loser_entry_id,
    tournament:tournaments(name, tournament_type, season_id),
    weight_class:weight_classes(weight)
  `

  const [{ data: winMatches }, { data: lossMatches }, { data: boutData }, { data: dualMatchData }] =
    await Promise.all([
      supabase.from('matches').select(selectFields).in('winner_entry_id', entryIds),
      supabase.from('matches').select(selectFields).in('loser_entry_id', entryIds),
      supabase
        .from(wrestler.gender === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts')
        .select(`
          id, weight_class, round, winner,
          result_type, result_detail, fall_time_seconds,
          wrestler1_id, wrestler1_name_raw, wrestler2_id, wrestler2_name_raw,
          w1:wrestlers!wrestler1_id(first_name, last_name),
          w2:wrestlers!wrestler2_id(first_name, last_name),
          wrestler1_school:schools!wrestler1_school_id(id, display_name, is_nj),
          wrestler2_school:schools!wrestler2_school_id(id, display_name, is_nj),
          event:${wrestler.gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'}!in_season_tournament_id(id, name, start_date, season)
        `)
        .or(`wrestler1_id.eq.${id},wrestler2_id.eq.${id}`),
      (supabase as any)
        .from(wrestler.gender === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches')
        .select(`
          id, weight_class, result_type, result_detail, fall_time_seconds,
          is_double_forfeit, is_forfeit_win, wrestler_a_id, wrestler_b_id, winner_id,
          wrestler_a:wrestlers!wrestler_a_id(id, first_name, last_name, is_stub),
          wrestler_b:wrestlers!wrestler_b_id(id, first_name, last_name, is_stub),
          meet:${wrestler.gender === 'F' ? 'dual_meets_girls' : 'dual_meets'}(
            id, meet_date, team1_score, team2_score, season_id,
            school_a:schools!team1_school_id(id, display_name, is_nj),
            school_b:schools!team2_school_id(id, display_name, is_nj)
          )
        `)
        .or(`wrestler_a_id.eq.${id},wrestler_b_id.eq.${id}`),
    ])
  // Extract school ID directly from tournament bouts (FK join to schools, always correct)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boutSchoolId = (() => {
    if (!boutData || boutData.length === 0) return null
    for (const bout of boutData as any[]) {
      if (String(bout.wrestler1_id) === id) return (bout.wrestler1_school as any)?.id ?? null
      if (String(bout.wrestler2_id) === id) return (bout.wrestler2_school as any)?.id ?? null
    }
    return null
  })()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dualSchoolId = (() => {
    if (!dualMatchData || dualMatchData.length === 0) return null
    for (const row of dualMatchData as any[]) {
      if (row.wrestler_a_id === id) return row.meet?.school_a?.id ?? null
      if (row.wrestler_b_id === id) return row.meet?.school_b?.id ?? null
    }
    return null
  })()

  // Fetch school profile (colors, logo, section, conference) and wrestler's weight
  const schoolSelect = 'id, display_name, primary_color, secondary_color, logo_url, section, classification, athletic_conference, mascot, header_background'
  // a profile from the history alone: the school of his latest finish
  const historySchoolId = [...linked].reverse().find(f => f.school_id != null)?.school_id ?? null
  const headSchoolId = primarySchoolId ?? boutSchoolId ?? dualSchoolId ?? historySchoolId
  const [{ data: schoolProfileData }, { data: weightDataAll }] = await Promise.all([
    headSchoolId
      ? supabase.from('schools').select(schoolSelect).eq('id', headSchoolId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('tournament_entries')
      .select('weight_class:weight_classes(weight), tournament:tournaments(tournament_type, season_id)')
      .eq('wrestler_id', wrestler.id)
      .order('tournament_id', { ascending: false })
      .limit(200),
  ])
  // newest season first (tournament ids aren't in season order: Playoff History seasons were loaded later)
  const seasonOf = (r: unknown) => { const t = (r as { tournament?: { season_id?: number } | { season_id?: number }[] | null }).tournament; return (Array.isArray(t) ? t[0]?.season_id : t?.season_id) ?? 0 }
  const weightData = shown(weightDataAll).sort((a, b) => seasonOf(b) - seasonOf(a)).slice(0, 10)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schoolProfile = schoolProfileData as any ?? {
    id: 0, display_name: primarySchool ?? '', primary_color: null, secondary_color: null,
    logo_url: null, section: null, classification: null, athletic_conference: null,
  }

  // Fetch district and region for this school
  let districtLabel: string | null = null
  let regionLabel: string | null = null
  if (schoolProfile.id > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [{ data: distData }, { data: regData }] = await Promise.all([
      supabase.from('school_districts').select('district:districts(name)').eq('school_id', schoolProfile.id),
      supabase.from('school_regions').select('region:regions(name,gender)').eq('school_id', schoolProfile.id),
    ])
    if (distData && distData.length > 0) {
      districtLabel = (distData[0] as any).district?.name ?? null
    }
    if (regData && regData.length > 0) {
      const gCode = wrestler.gender === 'F' ? 'F' : 'M'
      const genderMatch = (regData as any[]).find(r => r.region?.gender === gCode)
      regionLabel = (genderMatch ?? regData[0] as any)?.region?.name ?? null
    }
  }

  // Pick the most advanced tournament's weight (state > regions > districts)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const weightEntries = (weightData ?? []) as any[]
  const typeOrder: Record<string, number> = { boys_state: 3, girls_state: 3, regions: 2, girls_regions: 2, districts: 1 }
  const bestWeight: number | null = weightEntries
    .filter(e => e.weight_class?.weight && e.tournament?.season_id === currentSeason)
    .sort((a, b) => (typeOrder[b.tournament?.tournament_type] ?? 0) - (typeOrder[a.tournament?.tournament_type] ?? 0))
    [0]?.weight_class?.weight
    // Fallback for dual/in-season-only wrestlers who have no postseason entries
    ?? (() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const boutWeights = (boutData as any[] ?? []).map((b: any) => b.weight_class as number | null).filter((w): w is number => w != null && w > 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dualWeights = (dualMatchData as any[] ?? []).map((b: any) => b.weight_class as number | null).filter((w): w is number => w != null && w > 0)
      const all = [...boutWeights, ...dualWeights]
      return all.length > 0 ? Math.min(...all) : null
    })()

  // Fetch ghost championships and revenge wins
  const [{ data: ghostChamps }, { data: revengeWinsData }] = await Promise.all([
    supabase.rpc('get_wrestler_ghost_championships', { p_wrestler_id: id }),
    supabase.rpc('get_wrestler_revenge_wins', { p_wrestler_id: id }),
  ])
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const ghostChampionships = (ghostChamps ?? []) as any[]
  const revengeWinsList = (revengeWinsData ?? []) as any[]
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // Deduplicate revenge wins (same revenge match may appear multiple times if multiple prior losses)
  const seenRevenge = new Set<string>()
  const revengeWins = revengeWinsList.filter((rw: any) => {
    const key = `${rw.opponent_id}||${rw.revenge_tournament_name}||${rw.revenge_round}`
    if (seenRevenge.has(key)) return false
    seenRevenge.add(key)
    return true
  })

  // Deduplicate (a match won't appear in both, but be safe)
  const seen = new Set<string>()
  const allMatches: Match[] = []
  for (const m of [...(winMatches ?? []), ...(lossMatches ?? [])]) {
    if (!seen.has(m.id)) { seen.add(m.id); allMatches.push(m as unknown as Match) }
  }

  // 4. Opponent names — look up the other side's entry → wrestler
  const opponentEntryIds = [
    ...new Set(
      allMatches.flatMap(m => [m.winner_entry_id, m.loser_entry_id])
        .filter((eid): eid is string => eid != null && !entryIds.includes(eid))
    )
  ]

  const opponentMap: Record<string, { name: string; school: string | null; schoolId: number | null; wrestlerId: string | null }> = {}
  if (opponentEntryIds.length > 0) {
    const { data: oppEntries } = await supabase
      .from('tournament_entries')
      .select('id, school_id, school:schools(id, display_name), wrestler:wrestlers(id, first_name, last_name)')
      .in('id', opponentEntryIds)

    type OppEntry = { id: string; school_id: number | null; school: { id: number; display_name: string } | null; wrestler: { id: string; first_name: string; last_name: string } | { id: string; first_name: string; last_name: string }[] | null }
    const typedOppEntries = (oppEntries ?? []) as unknown as OppEntry[]

    // State entries have null school_id — find their school from other entries (district/region)
    const noSchoolWrestlerIds = typedOppEntries
      .filter(e => !e.school_id)
      .map(e => unwrap(e.wrestler)?.id)
      .filter((wid): wid is string => wid != null)

    const fallbackSchoolMap: Record<string, string> = {}  // wrestler_id → display_name
    const fallbackSchoolIdMap: Record<string, number> = {}
    if (noSchoolWrestlerIds.length > 0) {
      const { data: altEntries } = await supabase
        .from('tournament_entries')
        .select('wrestler_id, school_id, school:schools(display_name)')
        .in('wrestler_id', noSchoolWrestlerIds)
        .not('school_id', 'is', null)
      for (const e of (altEntries ?? []) as unknown as { wrestler_id: string; school_id: number | null; school: { display_name: string } | null }[]) {
        if (!fallbackSchoolMap[e.wrestler_id] && e.school_id != null) { fallbackSchoolMap[e.wrestler_id] = e.school?.display_name ?? ''; fallbackSchoolIdMap[e.wrestler_id] = e.school_id }
      }
    }

    // Fetch grades for opponent wrestlers
    const oppWrestlerIds = typedOppEntries.map(e => unwrap(e.wrestler)?.id).filter((id): id is string => id != null)
    const oppGradeMap: Record<string, string> = {}
    if (oppWrestlerIds.length > 0) {
      const { data: oppGrades } = await supabase.rpc('wrestler_grade', { p_wrestler_id: oppWrestlerIds[0] })
      // wrestler_grade is scalar — need to batch. Use tournament_entries instead
      const { data: gradeRows } = await supabase
        .from('tournament_entries')
        .select('wrestler_id, grade_label, tournament:tournaments(season_id)')
        .in('wrestler_id', oppWrestlerIds)
        .not('grade_label', 'is', null)
        .order('tournament_id', { ascending: false })
      for (const gr of (gradeRows ?? []) as { wrestler_id: string; grade_label: string }[]) {
        if (!oppGradeMap[gr.wrestler_id]) oppGradeMap[gr.wrestler_id] = gr.grade_label
      }
    }

    for (const e of typedOppEntries) {
      const w = unwrap(e.wrestler)
      const grade = w?.id ? oppGradeMap[w.id] : null
      const name = w ? `${w.first_name} ${w.last_name}${grade ? `, ${grade}` : ''}`.trim() : '—'
      const oppSchool = e.school?.display_name ?? (w?.id ? fallbackSchoolMap[w.id] : null) ?? null
      const oppSchoolId = e.school_id ?? (w?.id ? fallbackSchoolIdMap[w.id] : null) ?? null
      opponentMap[e.id] = { name, school: oppSchool, schoolId: oppSchoolId, wrestlerId: w?.id ?? null }
    }
  }

  // 5. Annotate each match with result + opponent name
  const entrySet = new Set(entryIds)
  const annotated = allMatches.map(m => {
    const isWinner = m.winner_entry_id != null && entrySet.has(m.winner_entry_id)
    const opponentEntryId = isWinner ? m.loser_entry_id : m.winner_entry_id
    const isBye = m.win_type === 'BYE' || (m.win_type == null && m.loser_entry_id == null) || (m.win_type === 'FORF' && m.loser_entry_id == null)
    const oppData = opponentEntryId ? opponentMap[opponentEntryId] : null
    const opponent = isBye
      ? 'Bye'
      : (oppData?.name ?? '—')
    const opponentSchool = isBye ? null : (oppData?.school ?? null)
    const opponentId = isBye ? null : (oppData?.wrestlerId ?? null)
    const opponentSchoolId = isBye ? null : (oppData?.schoolId ?? null)
    return { ...m, result: (isWinner ? 'W' : 'L') as 'W' | 'L', opponent, opponentSchool, opponentSchoolId, opponentId }
  })

  // 6. Group by season + tournament + weight
  const groups = new Map<string, MatchGroup>()
  for (const m of annotated) {
    const t      = unwrap(m.tournament)
    const wc     = unwrap(m.weight_class)
    const tname  = t?.name ?? 'Unknown'
    const ttype  = t?.tournament_type ?? ''
    const weight = wc?.weight ?? 0
    const seasonId = t?.season_id ?? 0
    const key = `${seasonId}||${tname}||${weight}`
    if (!groups.has(key)) {
      groups.set(key, { tournament_name: tname, tournament_type: ttype, weight, season_id: seasonId, matches: [] })
    }
    groups.get(key)!.matches.push(m)
  }

  // Sort matches within each group by round order
  for (const g of groups.values()) {
    g.matches.sort((a, b) => preview?.order
      ? (ROUND_ORDER[b.round ?? ''] ?? 0) - (ROUND_ORDER[a.round ?? ''] ?? 0)   // final first, first round last
      : (ROUND_ORDER[a.round ?? ''] ?? 99) - (ROUND_ORDER[b.round ?? ''] ?? 99)
    )
  }

  // All groups sorted: districts → regions → state, then by tournament name, then weight
  const allGroupsSorted = [...groups.values()].sort((a, b) => {
    const typeOrder =
      (TOURNAMENT_TYPE_ORDER[a.tournament_type] ?? 9) -
      (TOURNAMENT_TYPE_ORDER[b.tournament_type] ?? 9)
    if (typeOrder !== 0) return typeOrder
    return a.tournament_name.localeCompare(b.tournament_name) || a.weight - b.weight
  })

  // Bucket by season, seasons in descending order (latest first)
  const seasonIds = [...new Set(allGroupsSorted.map(g => g.season_id))].sort((a, b) => b - a)
  const bySeason = new Map<number, MatchGroup[]>()
  for (const g of allGroupsSorted) {
    if (!bySeason.has(g.season_id)) bySeason.set(g.season_id, [])
    bySeason.get(g.season_id)!.push(g)
  }

  // Build school name per season from entries — use school_id → schools.display_name directly
  const schoolBySeason = new Map<number, string>()
  for (const e of typedEntries) {
    const sid = (unwrap(e.tournament) as { season_id: number } | null)?.season_id ?? 0
    const displayName = e.school?.display_name ?? null
    if (sid && displayName && !schoolBySeason.has(sid)) {
      schoolBySeason.set(sid, displayName)
    }
  }

  // ── In-season tournament bouts ────────────────────────────────────────────────
  type TournBout = {
    id: string
    weight_class: number
    round: string
    winner: 1 | 2 | null
    result_type: string | null
    result_detail: string | null
    fall_time_seconds: number | null
    wrestler1_id: string | null
    wrestler1_name_raw: string
    w1: { first_name: string; last_name: string } | null
    wrestler1_school: { id: number; display_name: string; is_nj: boolean } | null
    wrestler2_id: string | null
    wrestler2_name_raw: string
    w2: { first_name: string; last_name: string } | null
    wrestler2_school: { id: number; display_name: string; is_nj: boolean } | null
    event: { id: string; name: string; start_date: string | null; season: string | null } | null
  }
  const allBouts = (boutData ?? []) as unknown as TournBout[]
  // Group bouts by tournament, sorted by start_date desc
  const boutsByTournament = new Map<string, TournBout[]>()
  for (const b of allBouts) {
    const tid = b.event?.id ?? ''
    if (!boutsByTournament.has(tid)) boutsByTournament.set(tid, [])
    boutsByTournament.get(tid)!.push(b)
  }
  const boutTournaments = [...boutsByTournament.entries()]
    .map(([tid, bouts]) => ({ tid, name: bouts[0]?.event?.name ?? '—', startDate: bouts[0]?.event?.start_date ?? null, bouts }))
    .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''))

  // ── Dual meet match history ───────────────────────────────────────────────────
  type DualMeetMatchRow = {
    id: string
    weight_class: number
    result_type: string | null
    result_detail: string | null
    fall_time_seconds: number | null
    is_double_forfeit: boolean
    is_forfeit_win: boolean
    wrestler_a_id: string | null
    wrestler_b_id: string | null
    winner_id: string | null
    wrestler_a: { id: string; first_name: string; last_name: string; is_stub: boolean } | { id: string; first_name: string; last_name: string; is_stub: boolean }[] | null
    wrestler_b: { id: string; first_name: string; last_name: string; is_stub: boolean } | { id: string; first_name: string; last_name: string; is_stub: boolean }[] | null
    meet: {
      id: string
      meet_date: string
      team1_score: number | null
      team2_score: number | null
      season_id: number
      school_a: { id: number; display_name: string; is_nj: boolean } | null
      school_b: { id: number; display_name: string; is_nj: boolean } | null
    } | null
  }

  type DualMeetGroup = {
    meetId: string
    meetDate: string
    seasonId: number
    oppSchoolName: string
    oppSchoolId: number | null
    oppIsNJ: boolean
    myTeamScore: number | null
    oppTeamScore: number | null
    matches: {
      id: string
      weightClass: number
      result: 'W' | 'L' | null
      oppName: string
      oppId: string | null
      oppIsStub: boolean
      resultStr: string
    }[]
  }

  const allDualMatches = (dualMatchData ?? []) as unknown as DualMeetMatchRow[]
  const dualMeetMap = new Map<string, DualMeetGroup>()

  for (const row of allDualMatches) {
    const meet = row.meet
    if (!meet) continue
    const meetId = meet.id
    const isWrestlerA = row.wrestler_a_id === id

    if (!dualMeetMap.has(meetId)) {
      const oppSchool = isWrestlerA ? meet.school_b : meet.school_a
      const myScore   = isWrestlerA ? meet.team1_score : meet.team2_score
      const oppScore  = isWrestlerA ? meet.team2_score : meet.team1_score
      dualMeetMap.set(meetId, {
        meetId,
        meetDate: meet.meet_date,
        seasonId: meet.season_id,
        oppSchoolName: oppSchool?.display_name ?? '—',
        oppSchoolId: oppSchool?.id ?? null,
        oppIsNJ: oppSchool?.is_nj ?? true,
        myTeamScore: myScore,
        oppTeamScore: oppScore,
        matches: [],
      })
    }

    const result: 'W' | 'L' | null = row.is_double_forfeit
      ? null
      : row.winner_id === id ? 'W' : 'L'

    type WrestlerRef = { id: string; first_name: string; last_name: string; is_stub: boolean }
    const oppWrestlerRaw = (isWrestlerA
      ? unwrap(row.wrestler_b as WrestlerRef | WrestlerRef[] | null)
      : unwrap(row.wrestler_a as WrestlerRef | WrestlerRef[] | null)) as WrestlerRef | null
    const oppName = oppWrestlerRaw
      ? `${oppWrestlerRaw.first_name} ${oppWrestlerRaw.last_name}`
      : row.is_forfeit_win ? 'Forfeit' : row.is_double_forfeit ? 'Double Forfeit' : '—'
    const oppId: string | null = oppWrestlerRaw?.id ?? null
    const oppIsStub: boolean = oppWrestlerRaw?.is_stub ?? false

    const rt = row.result_type
    let resultStr = '—'
    if (row.is_double_forfeit) {
      resultStr = 'Double Forfeit'
    } else if (row.is_forfeit_win) {
      resultStr = 'Forfeit'
    } else if (rt) {
      const rtLow = rt.toLowerCase()
      if (rtLow === 'fall') {
        if (row.fall_time_seconds) {
          const min = Math.floor(row.fall_time_seconds / 60)
          const sec = String(row.fall_time_seconds % 60).padStart(2, '0')
          resultStr = `Fall ${min}:${sec}`
        } else {
          resultStr = 'Fall'
        }
      } else if (rtLow.startsWith('tf')) {
        const base = row.result_detail ? `${rt} ${row.result_detail}` : (rt ?? '—')
        if (row.fall_time_seconds) {
          const min = Math.floor(row.fall_time_seconds / 60)
          const sec = String(row.fall_time_seconds % 60).padStart(2, '0')
          resultStr = `${base} ${min}:${sec}`
        } else {
          resultStr = base
        }
      } else {
        resultStr = row.result_detail ? `${rt} ${row.result_detail}` : rt
      }
    }

    dualMeetMap.get(meetId)!.matches.push({
      id: row.id,
      weightClass: row.weight_class,
      result,
      oppName,
      oppId,
      oppIsStub,
      resultStr,
    })
  }

  // Sort meets by date descending; sort matches within each meet by weight ascending
  const dualMeetGroups = [...dualMeetMap.values()]
    .sort((a, b) => b.meetDate.localeCompare(a.meetDate))
  for (const g of dualMeetGroups) {
    g.matches.sort((a, b) => a.weightClass - b.weightClass)
  }

  // ── Unified match history ─────────────────────────────────────────────────────
  type UnifiedRow = {
    id: string; matchType: string; weight: number; round: string | null
    result: 'W' | 'L' | null; opponentName: string; opponentSchool: string | null; opponentSchoolId: number | null
    opponentId: string | null; score: string; isBye: boolean
    date: string | null; eventName: string; opponentSchoolIsNJ: boolean
  }
  type UnifiedEvent = {
    key: string; eventName: string; eventDateDisplay: string | null
    sortDate: string; seasonId: number; rows: UnifiedRow[]
  }
  const unifiedEvents: UnifiedEvent[] = []

  // 1. Postseason — one UnifiedEvent per tournament+weight group
  for (const [key, g] of groups) {
    const tt = g.tournament_type
    let matchType = 'Tournament'
    if (tt === 'districts') matchType = 'Districts'
    else if (tt === 'regions' || tt === 'girls_regions') matchType = 'Regions'
    else if (tt === 'boys_state' || tt === 'girls_state') matchType = 'State'
    unifiedEvents.push({
      key,
      eventName: cleanTournamentName(g.tournament_name),
      eventDateDisplay: postseasonDateLabel(tt, g.season_id),
      sortDate: postseasonSortDate(tt, g.season_id),
      seasonId: g.season_id,
      rows: g.matches.map(m => ({
        id: m.id, matchType, weight: g.weight, round: m.round,
        result: m.opponent === 'Bye' ? null : m.result,
        opponentName: m.opponent, opponentSchool: m.opponentSchool, opponentSchoolId: m.opponentSchoolId, opponentId: m.opponentId,
        score: m.opponent === 'Bye' ? '' : (m.win_type ? formatScore(m, m.result === 'W') : '—'),
        isBye: m.opponent === 'Bye',
        date: postseasonDateLabel(tt, g.season_id),
        eventName: cleanTournamentName(g.tournament_name),
        opponentSchoolIsNJ: true,
      })),
    })
  }

  // 2. In-season tournament bouts — one UnifiedEvent per tournament+weight
  for (const { tid, name, startDate, bouts: tBouts } of boutTournaments) {
    const eventSeasonId = seasonToId(allSeasons, tBouts[0]?.event?.season ?? null)
    const eventDateDisplay = startDate
      ? new Date(startDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null
    const byWeight = new Map<number, TournBout[]>()
    for (const b of tBouts) {
      if (!byWeight.has(b.weight_class)) byWeight.set(b.weight_class, [])
      byWeight.get(b.weight_class)!.push(b)
    }
    for (const [weight, wBouts] of byWeight) {
      const rows: UnifiedRow[] = wBouts.map(bout => {
        const isW1 = bout.wrestler1_id === id
        const result: 'W' | 'L' | null = bout.winner === null ? null
          : (isW1 && bout.winner === 1) || (!isW1 && bout.winner === 2) ? 'W' : 'L'
        // opponent's profile name; never the imported text (an empty side is a forfeit / unknown)
        const oppName = isW1 ? personLabel(bout.w2, bout.wrestler2_name_raw) : personLabel(bout.w1, bout.wrestler1_name_raw)
        const oppId = isW1 ? bout.wrestler2_id : bout.wrestler1_id
        const oppSchoolJoin = isW1 ? bout.wrestler2_school : bout.wrestler1_school
        const oppIsNJ = oppSchoolJoin?.is_nj ?? false
        const oppSchoolName = oppSchoolJoin?.display_name ?? null
        const oppSchoolId = oppSchoolJoin?.id ?? null
        const rt = bout.result_type?.toUpperCase() ?? null
        let scoreStr = '—'
        if (rt === 'FALL') {
          scoreStr = bout.fall_time_seconds
            ? `Fall ${Math.floor(bout.fall_time_seconds / 60)}:${String(bout.fall_time_seconds % 60).padStart(2, '0')}`
            : 'Fall'
        } else if (rt === 'TF' || rt === 'TF-1.5') {
          const base = bout.result_detail ? `${bout.result_type} ${bout.result_detail}` : (bout.result_type ?? '—')
          scoreStr = bout.fall_time_seconds
            ? `${base} ${Math.floor(bout.fall_time_seconds / 60)}:${String(bout.fall_time_seconds % 60).padStart(2, '0')}`
            : base
        } else if (rt === 'FOR' || rt === 'FORF') {
          scoreStr = 'Forfeit'
        } else if (bout.result_type) {
          scoreStr = bout.result_detail ? `${bout.result_type} ${bout.result_detail}` : bout.result_type
        }
        return {
          id: `bout-${bout.id}`, matchType: 'Tournament', weight, round: bout.round, result,
          opponentName: oppName, opponentSchool: oppSchoolName, opponentSchoolId: oppSchoolId,
          opponentId: (oppId && oppIsNJ) ? oppId : null, score: scoreStr, isBye: false,
          date: eventDateDisplay, eventName: name, opponentSchoolIsNJ: oppIsNJ,
        }
      }).sort((a, b) => (ROUND_ORDER[b.round ?? ''] ?? 0) - (ROUND_ORDER[a.round ?? ''] ?? 0))
      unifiedEvents.push({
        key: `tourney-${tid}-${weight}`, eventName: name, eventDateDisplay,
        sortDate: startDate ?? '1900-01-01', seasonId: eventSeasonId, rows,
      })
    }
  }

  // 3. Dual meets — one UnifiedEvent per meet
  for (const dg of dualMeetGroups) {
    const dateDisplay = new Date(dg.meetDate + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
    unifiedEvents.push({
      key: `dual-${dg.meetId}`, eventName: `vs. ${dg.oppSchoolName}`,
      eventDateDisplay: dateDisplay, sortDate: dg.meetDate, seasonId: dg.seasonId,
      rows: dg.matches.map(m => ({
        id: `dual-${m.id}`, matchType: 'Dual', weight: m.weightClass, round: null,
        result: m.result, opponentName: m.oppName, opponentSchool: dg.oppSchoolName, opponentSchoolId: dg.oppSchoolId,
        opponentId: (m.oppId && !m.oppIsStub) ? m.oppId : null, score: m.resultStr, isBye: false,
        date: dateDisplay, eventName: `vs. ${dg.oppSchoolName}`, opponentSchoolIsNJ: dg.oppIsNJ,
      })),
    })
  }

  unifiedEvents.sort((a, b) => b.sortDate.localeCompare(a.sortDate))
  const unifiedBySeason = new Map<number, UnifiedEvent[]>()
  for (const ev of unifiedEvents) {
    if (!unifiedBySeason.has(ev.seasonId)) unifiedBySeason.set(ev.seasonId, [])
    unifiedBySeason.get(ev.seasonId)!.push(ev)
  }
  let unifiedSeasonIds = [...unifiedBySeason.keys()].sort((a, b) => b - a)
  // a graduated wrestler's history reads oldest first: seasons, events and rounds (preview)
  const graduated = !!preview?.order && wrestler.graduation_year != null && wrestler.graduation_year < Math.max(...allSeasons.map(s => s.id))
  if (graduated) {
    unifiedSeasonIds = [...unifiedSeasonIds].reverse()
    for (const evs of unifiedBySeason.values()) {
      evs.reverse()
      for (const ev of evs) ev.rows.reverse()
    }
  }
  // the offseason table (preview): on the Off-Season board → their offseason results, placed in time order
  const offseason = preview?.offseason ? await offseasonFor(id, wrestler.gender === 'F' ? 'F' : 'M', !!preview?.fresh) : null
  // their matches at offseason events with no placement (duals): the record and every match (Kyle 2026-11-21)
  const offseasonBouts = offseason && offseason.entry.wrestled.length
    ? Object.fromEntries(await offseasonMatches(wrestler.gender === 'F' ? 'F' : 'M', offseason.entry.prospect_id, offseason.entry.wrestled.map(w => w.event_id)))
    : {}

  // Revenge win keys for row-level pill detection
  const revengeWinKeys = new Set<string>(
    revengeWins.map((rw: any) =>
      `${rw.opponent_id}||${cleanTournamentName(rw.revenge_tournament_name)}||${rw.revenge_round}`)
  )

  // Hammer scores for upset win detection (opponent score - own score > 9)
  const allOpponentIds = [...new Set(
    unifiedEvents.flatMap(ev => ev.rows.map(r => r.opponentId)).filter((x): x is string => x != null)
  )]
  // the visitor's key can't read wrestler_hammer_scores (its formula columns stay private), so the server reads
  // only the score itself: the WRR on the stats board and the upset-win marks
  const ratingDb = createSupabaseAdmin()
  // Whiz Rank box (Kyle 2026-11-19): the highest group ranking in the latest published week of the live season
  const whizSeason = liveSeasonId(allSeasons, wrestler.gender === 'F' ? 'F' : 'M')
  const whizP = whizSeason ? profileWhizRank(ratingDb, wrestler.gender === 'F' ? 'F' : 'M', whizSeason, id).catch(() => null) : Promise.resolve(null)
  const [ownHammerRes, oppHammerRes] = await Promise.all([
    ratingDb.from('wrestler_hammer_scores').select('season, hammer_score').eq('wrestler_id', id),
    allOpponentIds.length > 0
      ? ratingDb.from('wrestler_hammer_scores').select('wrestler_id, season, hammer_score').in('wrestler_id', allOpponentIds)
      : Promise.resolve({ data: [] }),
  ])
  const whiz = await whizP
  const ownHammerBySeason = new Map<string, number>(
    ((ownHammerRes.data ?? []) as { season: string; hammer_score: number }[]).map(r => [r.season, Number(r.hammer_score)])
  )
  const oppHammerMap = new Map<string, number>()
  for (const r of ((oppHammerRes.data ?? []) as { wrestler_id: string; season: string; hammer_score: number }[])) {
    oppHammerMap.set(`${r.wrestler_id}|${r.season}`, Number(r.hammer_score))
  }

  // Current-season stats for the profile header
  const currentGroups = bySeason.get(currentSeason) ?? []
  const currentAnnotated = annotated.filter(
    m => (unwrap(m.tournament)?.season_id ?? 0) === currentSeason
  )
  const nonBye = currentAnnotated.filter(m => m.opponent !== 'Bye')
  const wins   = nonBye.filter(m => m.result === 'W').length
  const losses = nonBye.filter(m => m.result === 'L').length

  // The first season on file and every Playoff History season before it have postseason results only (★ on
  // profiles; Kyle 2026-11-17); a wrestler who was a sophomore or older then has earlier seasons we have no records for
  const firstSeasonId = Math.min(...allSeasons.map(s => s.id))   // getSeasons(): Playoff History seasons are left out
  const gradYear = (wrestler as { graduation_year?: number | null }).graduation_year ?? null
  const firstSeasonClass = classInSeason(gradYear, firstSeasonId)
  const olderThanRecords = !!firstSeasonClass && firstSeasonClass[1] !== 'Fr'
  const postseasonOnly = (seasonId: number) => seasonId <= firstSeasonId
  const star = (seasonId: number) => (postseasonOnly(seasonId) ? ' ★' : '')

  // Career stats computation
  type SeasonStat = {
    seasonId: number; wins: number; losses: number; pins: number; tfs: number; mds: number
    bonusPct: number; pinTimeSecs: number; tfTimeSecs: number; consolationWins: number
    forfeitWins: number; forfeitLosses: number
  }
  const seasonStatsMap = new Map<number, SeasonStat>()
  for (const m of annotated) {
    if (m.opponent === 'Bye') continue
    const sid = unwrap(m.tournament)?.season_id ?? 0
    if (!seasonStatsMap.has(sid)) {
      seasonStatsMap.set(sid, {
        seasonId: sid, wins: 0, losses: 0, pins: 0, tfs: 0, mds: 0,
        bonusPct: 0, pinTimeSecs: 0, tfTimeSecs: 0, consolationWins: 0, forfeitWins: 0, forfeitLosses: 0,
      })
    }
    const s = seasonStatsMap.get(sid)!
    const wt = m.win_type ?? ''
    if (m.result === 'W') {
      s.wins++
      if (wt.toUpperCase() === 'FORFEIT') { s.forfeitWins++ }
      else if (wt === 'FALL') { s.pins++; s.pinTimeSecs += m.fall_time_seconds ?? 0 }
      else if (wt === 'TF' || wt === 'TF-1.5') { s.tfs++; s.tfTimeSecs += m.fall_time_seconds ?? 0 }
      else if (wt === 'MD') s.mds++
      if (m.bracket_side === 'consolation') s.consolationWins++
    } else {
      s.losses++
      if (wt.toUpperCase() === 'FORFEIT') s.forfeitLosses++
    }
  }
  // Add in-season bout stats
  for (const bout of allBouts) {
    const isW1 = bout.wrestler1_id === id
    const boutResult: 'W' | 'L' | null = bout.winner === null ? null
      : (isW1 && bout.winner === 1) || (!isW1 && bout.winner === 2) ? 'W' : 'L'
    if (boutResult === null) continue
    const sid = seasonToId(allSeasons, bout.event?.season ?? null)
    if (!seasonStatsMap.has(sid)) {
      seasonStatsMap.set(sid, { seasonId: sid, wins: 0, losses: 0, pins: 0, tfs: 0, mds: 0, bonusPct: 0, pinTimeSecs: 0, tfTimeSecs: 0, consolationWins: 0, forfeitWins: 0, forfeitLosses: 0 })
    }
    const s = seasonStatsMap.get(sid)!
    const rt = bout.result_type?.toUpperCase() ?? ''
    if (boutResult === 'W') {
      s.wins++
      if (rt === 'FORFEIT') { s.forfeitWins++ }
      else if (rt === 'FALL') { s.pins++; s.pinTimeSecs += bout.fall_time_seconds ?? 0 }
      else if (rt === 'TF' || rt === 'TF-1.5') { s.tfs++; s.tfTimeSecs += bout.fall_time_seconds ?? 0 }
      else if (rt === 'MD') s.mds++
    } else { s.losses++; if (rt === 'FORFEIT') s.forfeitLosses++ }
  }

  // Add dual meet stats
  for (const row of allDualMatches) {
    if (!row.meet || row.is_double_forfeit) continue
    const sid = row.meet.season_id
    if (!seasonStatsMap.has(sid)) {
      seasonStatsMap.set(sid, { seasonId: sid, wins: 0, losses: 0, pins: 0, tfs: 0, mds: 0, bonusPct: 0, pinTimeSecs: 0, tfTimeSecs: 0, consolationWins: 0, forfeitWins: 0, forfeitLosses: 0 })
    }
    const s = seasonStatsMap.get(sid)!
    const dualResult: 'W' | 'L' = row.winner_id === id ? 'W' : 'L'
    const rt = (row.result_type ?? '').toUpperCase()
    if (dualResult === 'W') {
      s.wins++
      if (rt === 'FORFEIT') { s.forfeitWins++ }
      else if (rt === 'FALL') { s.pins++; s.pinTimeSecs += row.fall_time_seconds ?? 0 }
      else if (rt === 'TF' || rt === 'TF-1.5') { s.tfs++; s.tfTimeSecs += row.fall_time_seconds ?? 0 }
      else if (rt === 'MD') s.mds++
    } else { s.losses++; if (rt === 'FORFEIT') s.forfeitLosses++ }
  }

  for (const s of seasonStatsMap.values()) {
    const contestedMatches = (s.wins - s.forfeitWins) + (s.losses - s.forfeitLosses)
    s.bonusPct = contestedMatches > 0 ? Math.round(((s.pins + s.tfs + s.mds) / contestedMatches) * 100) : 0
  }
  const seasonStats = [...seasonStatsMap.values()].sort((a, b) => b.seasonId - a.seasonId)
  // the stats board's leaderboard ranks: top 25 in the state, else top 25 in the section
  const statRanks = seasonStats[0] ? await wrestlerStatRanks(wrestler.gender === 'F' ? 'F' : 'M', seasonStats[0].seasonId, id) : {}
  const careerTotals = seasonStats.reduce((acc, s) => ({
    wins: acc.wins + s.wins, losses: acc.losses + s.losses,
    pins: acc.pins + s.pins, tfs: acc.tfs + s.tfs, mds: acc.mds + s.mds,
    bonusPct: 0,
    pinTimeSecs: acc.pinTimeSecs + s.pinTimeSecs,
    tfTimeSecs: acc.tfTimeSecs + s.tfTimeSecs,
    consolationWins: acc.consolationWins + s.consolationWins,
    forfeitWins: acc.forfeitWins + s.forfeitWins,
    forfeitLosses: acc.forfeitLosses + s.forfeitLosses,
  }), { wins: 0, losses: 0, pins: 0, tfs: 0, mds: 0, bonusPct: 0, pinTimeSecs: 0, tfTimeSecs: 0, consolationWins: 0, forfeitWins: 0, forfeitLosses: 0 })
  const careerContested = (careerTotals.wins - careerTotals.forfeitWins) + (careerTotals.losses - careerTotals.forfeitLosses)
  careerTotals.bonusPct = careerContested > 0 ? Math.round(((careerTotals.pins + careerTotals.tfs + careerTotals.mds) / careerContested) * 100) : 0

  // Detect placements (champion = won Finals on championship side)
  type PlacementInfo = { tournament: string; place: number; tournamentType: string; seasonId: number }
  const placements: PlacementInfo[] = []
  for (const g of allGroupsSorted) {
    const finals = g.matches.find(
      m => m.round === 'F' && (m.bracket_side === 'championship' || !m.bracket_side)
    )
    if (finals) {
      if (finals.result === 'W') {
        placements.push({ tournament: g.tournament_name, place: 1, tournamentType: g.tournament_type, seasonId: g.season_id })
      } else if (finals.result === 'L') {
        placements.push({ tournament: g.tournament_name, place: 2, tournamentType: g.tournament_type, seasonId: g.season_id })
      }
    }
    const thirdPlace = g.matches.find(
      m => m.round === '3rd_Place' && m.bracket_side === 'consolation'
    )
    if (thirdPlace) {
      if (thirdPlace.result === 'W') {
        placements.push({ tournament: g.tournament_name, place: 3, tournamentType: g.tournament_type, seasonId: g.season_id })
      } else if (thirdPlace.result === 'L') {
        placements.push({ tournament: g.tournament_name, place: 4, tournamentType: g.tournament_type, seasonId: g.season_id })
      }
    }
    const fifthPlace = g.matches.find(
      m => m.round === '5th_Place' && m.bracket_side === 'consolation'
    )
    if (fifthPlace) {
      if (fifthPlace.result === 'W') {
        placements.push({ tournament: g.tournament_name, place: 5, tournamentType: g.tournament_type, seasonId: g.season_id })
      } else if (fifthPlace.result === 'L') {
        placements.push({ tournament: g.tournament_name, place: 6, tournamentType: g.tournament_type, seasonId: g.season_id })
      }
    }
    const seventhPlace = g.matches.find(
      m => m.round === '7th_Place' && m.bracket_side === 'consolation'
    )
    if (seventhPlace) {
      if (seventhPlace.result === 'W') {
        placements.push({ tournament: g.tournament_name, place: 7, tournamentType: g.tournament_type, seasonId: g.season_id })
      } else if (seventhPlace.result === 'L') {
        placements.push({ tournament: g.tournament_name, place: 8, tournamentType: g.tournament_type, seasonId: g.season_id })
      }
    }
  }

  // A postseason finish with no bracket on file (history_podiums: e.g. the 2012-13 boys District 24 podium from the Shore
  // Conference archives, Kyle 2026-11-14) — same chips as a bracket finish
  {
    const { data: pods } = await supabase.from('history_podiums').select('place, tournament:tournaments(name, tournament_type, season_id)').eq('wrestler_id', id).not('weight', 'is', null)
    for (const p of shown((pods ?? []) as unknown as { place: number; tournament: { name: string; tournament_type: string; season_id: number } | null }[])) {
      if (!p.tournament || placements.some(x => x.tournament === p.tournament!.name && x.seasonId === p.tournament!.season_id)) continue
      placements.push({ tournament: p.tournament.name, place: p.place, tournamentType: p.tournament.tournament_type, seasonId: p.tournament.season_id })
    }
  }

  // Medals from before our postseason records begin (Kyle 2026-11-14): state places and region titles on file only in
  // history_finishes (njwrestlinghistory.info), matched by school and name (src/lib/preRecordFinishes.ts)
  const recordsFrom = historySeasons.length ? Math.min(...historySeasons.map(h => h.id)) : null
  // finishes tied to the profile (2026-11-17) are used as they are; the name match is only for a profile without them
  const preRecord = linked.length ? linked.filter(f => recordsFrom == null || f.year < recordsFrom).map(f => ({ year: f.year, level: f.level as 'state' | 'region', region: f.region, weight: f.weight, place: f.place }))
    : recordsFrom == null ? [] : await preRecordFinishes(wrestler.gender === 'F' ? 'F' : 'M', recordsFrom, wrestler,
      typedEntries.map(e => ({ season: (unwrap(e.tournament) as { season_id: number } | null)?.season_id ?? 0, school_id: e.school_id })).filter(x => x.season > 0))
  for (const f of preRecord) {
    placements.push({ tournament: f.level === 'state' ? 'State' : `Region ${f.region}`, place: f.place, tournamentType: f.level === 'state' ? (wrestler.gender === 'F' ? 'girls_state' : 'boys_state') : 'regions', seasonId: f.year })
  }
  const inFirstRecords = recordsFrom != null && entrySeasons.includes(recordsFrom)   // their postseason may have begun before our records

  // Primary weight from current season
  const currentWeights = currentGroups.map(g => g.weight).filter(w => w > 0)
  const primaryWeight = currentWeights.length > 0 ? Math.min(...currentWeights) : null

  // District and region labels from current season
  const districtNames = [...new Set(
    currentGroups
      .filter(g => g.tournament_type === 'districts')
      .map(g => { const m = g.tournament_name.match(/District (\d+)$/); return m ? `D${m[1]}` : null })
      .filter((x): x is string => x !== null)
  )].sort()

  const regionNames = [...new Set(
    currentGroups
      .filter(g => g.tournament_type === 'regions' || g.tournament_type === 'girls_regions')
      .map(g => {
        const mBoys = g.tournament_name.match(/Regions r(\d+)$/i)
        if (mBoys) return `R${mBoys[1]}`
        const mGirls = g.tournament_name.match(/Regions (.+)$/)
        if (mGirls) return mGirls[1]
        return null
      })
      .filter((x): x is string => x !== null)
  )].sort()

  // Detect Terminator awards (fastest total mat time) across all seasons
  type AwardInfo = { type: 'terminator'; label: string; seasonId: number }
  const awards: AwardInfo[] = []

  // Build list of tournaments to check: { seasonId, level, num } for each district/region/state
  type TournCheck = { seasonId: number; level: 'district' | 'region' | 'state'; num: number | null }
  const tournChecks: TournCheck[] = []
  for (const g of allGroupsSorted) {
    if (g.tournament_type === 'districts') {
      const m = g.tournament_name.match(/District (\d+)$/)
      if (m) tournChecks.push({ seasonId: g.season_id, level: 'district', num: parseInt(m[1]) })
    } else if (g.tournament_type === 'regions' || g.tournament_type === 'girls_regions') {
      const m = g.tournament_name.match(/r(\d+)$/i)
      if (m) tournChecks.push({ seasonId: g.season_id, level: 'region', num: parseInt(m[1]) })
    } else if (g.tournament_type === 'boys_state' || g.tournament_type === 'girls_state') {
      tournChecks.push({ seasonId: g.season_id, level: 'state', num: null })
    }
  }
  // Deduplicate
  const checkKey = (c: TournCheck) => `${c.seasonId}|${c.level}|${c.num}`
  const uniqueChecks = [...new Map(tournChecks.map(c => [checkKey(c), c])).values()]

  const genderType = wrestler.gender === 'F' ? 'F' : 'M'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AwardCall = { check: TournCheck; kind: 'terminator'; promise: PromiseLike<{ data: any }> }
  // Build RPC calls for each tournament check
  const awardPromises = uniqueChecks.flatMap(c => {
    const calls: AwardCall[] = []
    if (c.level === 'district') {
      calls.push({ check: c, kind: 'terminator', promise: supabase.rpc('district_mat_time', { p_district: c.num, p_gender: genderType, p_season: c.seasonId }) })
    } else if (c.level === 'region') {
      if (genderType === 'M') {
        calls.push({ check: c, kind: 'terminator', promise: supabase.rpc('region_mat_time', { p_region: c.num, p_gender: genderType, p_season: c.seasonId }) })
      } else {
        calls.push({ check: c, kind: 'terminator', promise: supabase.rpc('girls_region_mat_time', { p_region: c.num, p_season: c.seasonId }) })
      }
    } else if (c.level === 'state') {
      calls.push({ check: c, kind: 'terminator', promise: supabase.rpc('state_mat_time', { p_gender: genderType, p_season: c.seasonId }) })
    }
    return calls
  })

  const awardResults = await Promise.all(awardPromises.map(a => a.promise))
  for (let i = 0; i < awardPromises.length; i++) {
    const { check, kind } = awardPromises[i]
    const rows = (awardResults[i].data ?? []) as { wrestler_id: string }[]
    if (rows.length > 0 && rows[0].wrestler_id === wrestler.id) {
      const label = check.level === 'district' ? `D${check.num}`
        : check.level === 'region' ? `R${check.num}`
        : 'State'
      awards.push({ type: kind, label, seasonId: check.seasonId })
    }
  }

  // Section config (graceful fallback to default order if table not yet migrated)
  const DEFAULT_WRESTLER_SECTIONS = ['placements', 'ghost_champion', 'career_stats', 'match_history']
  const { data: sectionConfigData } = await supabase
    .from('page_sections')
    .select('section_key, is_visible')
    .eq('page_type', 'wrestler_profile')
    .order('display_order')
  const activeSectionKeys: string[] = sectionConfigData && sectionConfigData.length > 0
    ? (sectionConfigData as { section_key: string; is_visible: boolean }[])
        .filter(s => s.is_visible).map(s => s.section_key)
    : DEFAULT_WRESTLER_SECTIONS

  if (unifiedEvents.length === 0 && !linked.length) {   // a history profile has finishes but no bouts: it renders below
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <BackLink gender={wrestler.gender} />
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          {wrestler.first_name} {wrestler.last_name}
        </h2>
        <p className="text-slate-500">No match records found.</p>
      </div>
    )
  }

  const baseName = [wrestler.first_name, wrestler.last_name, wrestler.suffix]
    .filter(Boolean).join(' ')
  const displayName = primaryGrade ? `${baseName}, ${primaryGrade}` : baseName

  // Years active (Kyle 2026-11-14), for a wrestler with no grade on file (Playoff History, graduated): first season to last —
  // every season he has a medal or award in counts too (Kyle 2026-11-17: a 4-time placer whose bout records begin in
  // his senior year was "Active 2012-13" only)
  const activeIds = [...new Set([...entrySeasons, ...seasonStats.map(x => x.seasonId)].filter(Boolean))].sort((a, b) => a - b)
  const histYears = [...new Set(linked.map(f => f.year))].sort((a, b) => a - b)
  const spanYears = [...new Set([...activeIds, ...histYears, ...placements.map(p => p.seasonId), ...awards.map(a => a.seasonId)].filter(y => y > 0))].sort((a, b) => a - b)
  // as calendar years, first fall to last spring (Kyle 2026-11-19: "2014-2018", not "2014-15-2017-18")
  const activeYears = primaryGrade || !spanYears.length ? null : `${spanYears[0] - 1}–${spanYears[spanYears.length - 1]}`

  const totalTournaments = groups.size
  const pc = schoolProfile.primary_color ?? '#1a1a2e'
  const gender = wrestler.gender === 'F' ? 'girls' : 'boys'
  const genderBase = `/${gender}`

  // Build info pills
  const secSlug = schoolProfile.section ? sectionToSlug(schoolProfile.section) : null
  const grpSlug = schoolProfile.classification ? groupToSlug(schoolProfile.classification) : null
  const confSlug = schoolProfile.athletic_conference ? conferenceToSlug(schoolProfile.athletic_conference) : null
  const classLabel = schoolProfile.section && schoolProfile.classification
    ? (schoolProfile.section === 'Non-Public' ? `Non-Public ${schoolProfile.classification}` : `${schoolProfile.section} Group ${schoolProfile.classification}`)
    : null
  const districtNum = districtLabel?.match(/\d+/)?.[0] ?? null
  const regionNum = regionLabel?.match(/\d+/)?.[0] ?? null

  // Mascot name (strip "Wrestling" suffix, same transform as SchoolHeader)
  const mascotName = (schoolProfile.mascot as string | null)?.replace(/\s*Wrestling\.?\s*$/i, '').trim() || null
  const headerBackground = (schoolProfile.header_background as string | null) ?? null
  const schoolLink = schoolProfile.id > 0 ? `/${gender}/schools/${schoolProfile.id}` : null

  return (
    <>
      <WrestlerHeader
        schoolName={primarySchool ?? (schoolProfile.id > 0 ? (schoolProfile.display_name as string | null) : null)}
        mascotName={mascotName}
        logoUrl={schoolProfile.logo_url as string | null}
        primaryColor={schoolProfile.primary_color as string | null}
        secondaryColor={schoolProfile.secondary_color as string | null}
        headerBackground={headerBackground}
        wrestlerName={baseName}
        grade={primaryGrade}
        active={activeYears}
        primaryWeight={bestWeight ?? (linked.length ? (/^h/i.test(linked[linked.length - 1].weight) ? null : Number(linked[linked.length - 1].weight) || null) : null)}
        schoolLink={schoolLink}
        note={statusNote}
        activeText={inMemory && activeIds.length ? `Wrestled ${activeIds[0] - 1}–${activeIds[activeIds.length - 1]}` : null}
      />
      <CollegeBars years={college} linkBase={wrestler.gender === 'F' ? '/girls/college' : '/boys/college'} />

      <div className="max-w-3xl mx-auto px-4 py-6">
      <BackLink gender={wrestler.gender} />
      {historyNote && <p className="mb-3 text-sm text-slate-600">★ {historyNote}</p>}
      {linked.length > 0 && !typedEntries.length && (
        <p className="mb-4 text-xs text-slate-500">Finishes from <NjwhLink />{recordsFrom != null && lookupSeasonLabel(labelSeasons, recordsFrom) ? <>; our bout-by-bout records begin in {lookupSeasonLabel(labelSeasons, recordsFrom)}</> : null}.</p>
      )}

      {/* the high school part gets its own header when a college part follows (Kyle 2026-11-17; mock only for now) */}
      {college.length > 0 && <h2 className="mb-2 text-lg font-bold text-slate-900">NJSIAA</h2>}
      {/* Stats board (Kyle 2026-11-16), like the school page's: the latest season on file */}
      {(() => {
        const s = seasonStats[0]
        if (!s) return null
        const label = lookupSeasonLabel(labelSeasons, s.seasonId) ?? ''
        // the WRR carries from season to season: the newest on file is the wrestler's rating now
        const wrr = [...ownHammerBySeason.entries()].sort((x, y) => y[0].localeCompare(x[0]))[0]?.[1]
        const chips: [string, string, StatKey?][] = [
          ['Record', `${s.wins}-${s.losses}`],
          // the rating written out (Kyle 2026-11-19), and the Whiz Rank beside it
          [RATING_NAME, wrr != null ? wrr.toFixed(1) : '—', 'wrr'],
          ['Whiz Rank', whiz === null ? '—' : whiz === 'unranked' ? 'Unranked' : whiz.text],
          ['Pins', String(s.pins), 'pins'],
          ['Tech Falls', String(s.tfs), 'techs'],
          ['Bonus %', `${s.bonusPct}%`, 'bonus'],
        ]
        return (
          <div className="mb-6">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-px bg-slate-200 border border-slate-200 overflow-hidden rounded-lg">
              {chips.map(([k, v, rk]) => {
                const r = rk ? statRanks[rk] : undefined
                return (
                  <div key={k} className="bg-white px-2 py-3 text-center min-w-0">
                    <div className={`${v.length > 8 ? 'text-sm py-0.5' : 'text-lg'} font-bold tabular-nums text-slate-900 leading-tight`}>{v}</div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5 leading-tight" title={k === RATING_NAME ? RATING_SHORT : undefined}>{k}</div>
                    {r ? <div className="text-[10px] font-semibold text-emerald-600 mt-0.5 leading-tight">#{r.rank} {r.where}</div> : <div className="h-3 mt-0.5" />}
                  </div>
                )
              })}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">{label}{postseasonOnly(s.seasonId) || !allSeasons.some(x => x.id === s.seasonId) ? ' · postseason only' : ''}</p>
          </div>
        )
      })()}

      {activeSectionKeys.map(key => {
        switch (key) {
          case 'placements':
            return (placements.length > 0 || awards.length > 0 || college.length > 0 || badges.length > 0) ? (
              // One row per season, newest first; districts, regions, State, then awards (Kyle 2026-11-17).
              // District light gray, region navy, State gold. In the college mock: oldest first, NCAA after NJSIAA in
              // the college's colors (Kyle 2026-11-17).
              // Medal Bin (Kyle 2026-11-19): the medals in a table, a row per season — NJSIAA medals, offseason
              // badges, awards, then that year's college finish
              <div key="placements" className="mb-8">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Medal Bin</h3>
                <div className="border border-black overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead><tr className="bg-slate-900 text-white"><th className="px-3 py-1 text-left text-xs font-bold uppercase tracking-wide w-24">Season</th><th className="px-3 py-1 text-left text-xs font-bold uppercase tracking-wide">Medals</th></tr></thead>
                  <tbody>
                {[...new Set([...placements.map(p => p.seasonId), ...awards.map(a => a.seasonId), ...badges.map(b => b.season), ...college.map(y => y.year)])].sort((x, y) => (college.length > 0 ? x - y : y - x)).map((seasonId, row) => (
                  <tr key={seasonId} className={`border-t border-slate-100 ${row % 2 ? 'bg-slate-50' : 'bg-white'}`}>
                  <td className="px-3 py-1.5 align-top whitespace-nowrap font-semibold tabular-nums text-slate-600">{seasonId - 1}–{String(seasonId).slice(2)}</td>
                  <td className="px-2 py-1.5">
                  <div className="flex flex-wrap gap-1.5">
                    {placements.filter(p => p.seasonId === seasonId)
                      .sort((a, b) => (TOURNAMENT_TYPE_ORDER[a.tournamentType] ?? 9) - (TOURNAMENT_TYPE_ORDER[b.tournamentType] ?? 9) || a.place - b.place)
                      .map((p, i) => {
                        const short = placementShortLabel(p.tournament, p.tournamentType)
                        const yr = seasonShort(p.seasonId)
                        const medal = p.place === 1 ? '\u{1F947}' : p.place === 2 ? '\u{1F948}' : p.place === 3 ? '\u{1F949}' : null
                        const level = TOURNAMENT_TYPE_ORDER[p.tournamentType]
                        const look = level === 0 ? 'bg-slate-50 border-slate-200 text-slate-700'
                          : level === 1 ? 'bg-[#16284A] border-[#16284A] text-white'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                        const lvl = p.tournamentType.includes('state') ? 'state' : level === 1 ? 'region' : 'district'
                        const num = Number(short.slice(1)) || null
                        return (
                          <IconHint key={i} hint={level == null ? tournamentPlaceHint(p.place, cleanTournamentName(p.tournament), p.seasonId) : placementHint(p.place, lvl, num, p.seasonId)}>
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${look}`}>
                            {medal ? <span>{medal}</span> : <span className="opacity-75">{p.place}th</span>}
                            <span>{short}</span>
                            {yr && <span className="opacity-60">{yr}</span>}
                          </span>
                          </IconHint>
                        )
                      })}
                    {badges.filter(b => b.season === seasonId).map((b, i) => {
                      const medal = b.place === 1 ? '\u{1F947}' : b.place === 2 ? '\u{1F948}' : b.place === 3 ? '\u{1F949}' : null
                      return (
                        <IconHint key={`badge-${i}`} hint={badgeHint(b.kind, b.label, b.place, b.year)}>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${BADGE_LOOK[b.kind]}`}>
                          {medal ? <span>{medal}</span> : <span className="opacity-75">{b.place}th</span>}
                          <span>{b.label}</span>
                          <span className="opacity-60">{`'${String(b.year).slice(2)}`}</span>
                        </span>
                        </IconHint>
                      )
                    })}
                    {awards.filter(a => a.seasonId === seasonId).map((a, i) => {
                      const yr = seasonShort(a.seasonId)
                      const icon = '\u{26A1}'
                      return (
                        <IconHint key={`award-${i}`} hint={terminatorHint(a.label, a.seasonId)}>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700">
                          <span>{icon}</span>
                          <span>{a.label}</span>
                          {yr && <span className="opacity-60">{yr}</span>}
                        </span>
                        </IconHint>
                      )
                    })}
                    <CollegeMedals years={college.filter(y => y.year === seasonId)} />
                  </div>
                  </td>
                  </tr>
                ))}
                  </tbody>
                </table>
                </div>
              </div>
            ) : null

          case 'ghost_champion':
            return ghostChampionships.length > 0 ? (
              <div key="ghost_champion" className="mb-4 space-y-2">
                {ghostChampionships.map((gc: any, i: number) => (
                  <div key={i} className="bg-slate-900 text-white rounded-none px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{'\u{1F47B}'}</span>
                      <span className="font-bold text-sm uppercase tracking-wide">Ghost Champion</span>
                      <span className="text-xs text-slate-400">
                        #{gc.seed} seed &middot; {cleanTournamentName(gc.tournament_name)} &middot; {gc.weight}lb
                        {seasonIds.length > 1 && ` · ${lookupSeasonLabel(labelSeasons, gc.season_id as number) ?? ''}`}
                      </span>
                    </div>
                    {gc.wins_on_path && gc.wins_on_path.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        <span className="text-slate-400">Path:</span>
                        {(gc.wins_on_path as any[]).map((w: any, j: number) => (
                          <span key={j} className="bg-slate-800 px-2 py-0.5 rounded">
                            {ROUND_LABEL[w.round] ?? w.round}: {w.opponent}
                            {w.opponent_seed && <span className="text-slate-400"> (#{w.opponent_seed})</span>}
                            {' '}
                            <span className="text-emerald-400">
                              {w.win_type}
                              {w.fall_time ? ` ${Math.floor(w.fall_time / 60)}:${String(w.fall_time % 60).padStart(2, '0')}` : ''}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null

          case 'career_stats':
            return seasonStats.length > 0 ? (
              <div key="career_stats" className="mb-8">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Career Stats</h3>
                <StatsTable
                  columns={[
                    { key: 'season',    label: 'Season',   align: 'left',   numeric: false },
                    { key: 'wl',        label: 'W-L',      align: 'center', numeric: false },
                    { key: 'pins',      label: 'Pins',     align: 'center' },
                    { key: 'tfs',       label: 'TFs',      align: 'center' },
                    { key: 'bonus',     label: 'Bonus%',   align: 'center', numeric: false },
                    { key: 'avgPin',    label: 'Avg Pin',  align: 'center', numeric: false },
                    { key: 'avgTf',     label: 'Avg TF',   align: 'center', numeric: false },
                  ]}
                  rows={seasonStats.map(s => ({
                    season:    `${lookupSeasonLabel(labelSeasons, s.seasonId) ?? `S${s.seasonId}`}${classInSeason(gradYear, s.seasonId) ? ` · ${classInSeason(gradYear, s.seasonId)![1]}` : ''}${star(s.seasonId)}`,
                    wl:        `${s.wins}-${s.losses}`,
                    pins:      s.pins,
                    tfs:       s.tfs,
                    bonus:     `${s.bonusPct}%`,
                    avgPin:    s.pins > 0 ? formatPinTimeStat(Math.round(s.pinTimeSecs / s.pins)) : '—',
                    avgTf:     s.tfs  > 0 ? formatPinTimeStat(Math.round(s.tfTimeSecs  / s.tfs))  : '—',
                  }))}
                  footer={seasonStats.length > 1 ? {
                    season:    'Career',
                    wl:        `${careerTotals.wins}-${careerTotals.losses}`,
                    pins:      careerTotals.pins,
                    tfs:       careerTotals.tfs,
                    bonus:     `${careerTotals.bonusPct}%`,
                    avgPin:    careerTotals.pins > 0 ? formatPinTimeStat(Math.round(careerTotals.pinTimeSecs / careerTotals.pins)) : '—',
                    avgTf:     careerTotals.tfs  > 0 ? formatPinTimeStat(Math.round(careerTotals.tfTimeSecs  / careerTotals.tfs))  : '—',
                  } : undefined}
                />
                {(seasonStats.some(s => postseasonOnly(s.seasonId)) || (olderThanRecords && recordsFrom == null) || inFirstRecords) && (
                  <div className="mt-2 space-y-0.5 text-xs text-slate-500">
                    {inFirstRecords && (
                      <p>Postseason data only goes back to {lookupSeasonLabel(labelSeasons, recordsFrom!)}{preRecord.length > 0 && <>; earlier medals are from <NjwhLink /></>}.</p>
                    )}
                    {seasonStats.some(s => postseasonOnly(s.seasonId)) && (() => {
                      const ids = seasonStats.map(s => s.seasonId).filter(postseasonOnly)
                      const lo = Math.min(...ids), hi = Math.max(...ids)
                      return <p>★ {lookupSeasonLabel(labelSeasons, lo)}{hi !== lo ? ` to ${lookupSeasonLabel(labelSeasons, hi)}` : ''}: postseason results only.</p>
                    })()}
                    {olderThanRecords && recordsFrom == null && (
                      <p>Records begin with the {lookupSeasonLabel(labelSeasons, firstSeasonId)} season; earlier seasons aren&apos;t included.</p>
                    )}
                  </div>
                )}
              </div>
            ) : null


          case 'match_history': {
            // the offseason of year Y sits between season Y+1 (above, newest first) and season Y (below)
            const offAt = offseason ? (graduated
              ? unifiedSeasonIds.filter(sid => sid <= offseason.season).length
              : unifiedSeasonIds.filter(sid => sid > offseason.season).length) : -1
            const offTable = offseason ? <OffseasonProfileTable key="offseason" entry={offseason.entry} season={offseason.season} matches={offseasonBouts} /> : null
            return unifiedSeasonIds.length > 0 || offTable ? (
              // the college mock: the NJSIAA season tables joined into one stack (Kyle 2026-11-18)
              <div key="match_history" className={college.length > 0 ? '' : 'space-y-8'}>
                {offAt === unifiedSeasonIds.length && offTable}
                {unifiedSeasonIds.map((seasonId, si) => {
                  const seasonEvents = unifiedBySeason.get(seasonId) ?? []
                  const label = lookupSeasonLabel(labelSeasons, seasonId) ?? `Season ${seasonId}`
                  const seasonWins   = seasonEvents.flatMap(e => e.rows).filter(r => !r.isBye && r.result === 'W').length
                  const seasonLosses = seasonEvents.flatMap(e => e.rows).filter(r => !r.isBye && r.result === 'L').length
                  return (
                    <Fragment key={seasonId}>
                    {si === offAt && offTable}
                    <div className={college.length > 0 ? `border border-slate-300 overflow-hidden ${si > 0 ? '-mt-px' : ''}` : 'rounded-lg border border-slate-200 overflow-hidden'}>
                      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700 uppercase tracking-widest">{label}{star(seasonId)}</span>
                        {schoolBySeason.get(seasonId) && (
                          <span className="text-xs text-slate-400 font-medium">— {schoolBySeason.get(seasonId)}</span>
                        )}
                        {classInSeason(gradYear, seasonId) && (
                          <span className="text-xs text-slate-400 font-medium">— {classInSeason(gradYear, seasonId)![0]}</span>
                        )}
                        <span className="ml-auto text-xs text-slate-500 font-medium">{seasonWins}W – {seasonLosses}L</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-max w-full text-[13px]">
                          <thead>
                            <tr className="bg-slate-900 text-white">
                              <th className="text-left px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Date</th>
                              <th className="text-left px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Match</th>
                              <th className="text-center px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Wt</th>
                              <th className="text-left px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Round</th>
                              <th className="text-center px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Res</th>
                              <th className="text-left px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Opponent</th>
                              <th className="text-left px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap">School</th>
                              <th className="text-right px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Score</th>
                              <th className="text-left px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {seasonEvents.flatMap(ev => ev.rows).map((r, ri) => {
                              const seasonLabel = lookupSeasonLabel(labelSeasons, seasonId) ?? ''
                              const isRevengeWin = !r.isBye && r.result === 'W' && r.opponentId != null &&
                                revengeWinKeys.has(`${r.opponentId}||${r.eventName}||${r.round}`)
                              const isUpsetWin = !r.isBye && r.result === 'W' && r.opponentId != null && (() => {
                                const oppScore = oppHammerMap.get(`${r.opponentId}|${seasonLabel}`)
                                const ownScore = ownHammerBySeason.get(seasonLabel)
                                return oppScore != null && ownScore != null && (oppScore - ownScore) > 9
                              })()
                              const hasNote = isRevengeWin || isUpsetWin
                              const rowBg = hasNote
                                ? 'bg-emerald-50'
                                : ri % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                              return (
                              <tr key={r.id} className={`border-t border-slate-100 ${r.isBye ? 'opacity-40' : ''} ${rowBg}`}>
                                <td className="px-3 py-1 text-slate-400 text-xs whitespace-nowrap">
                                  {r.date ?? '—'}
                                </td>
                                <td className="px-3 py-1 whitespace-nowrap">
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${matchTypeColor(r.matchType)}`}>
                              {r.matchType === 'Dual' ? 'Dual' : r.eventName}
                            </span>
                          </td>
                          <td className="px-3 py-1 text-center text-slate-500 font-mono text-xs tabular-nums whitespace-nowrap">
                            {r.weight > 0 ? r.weight : '—'}
                          </td>
                          <td className="px-3 py-1 text-slate-500 text-xs whitespace-nowrap">
                            {r.round ? (ROUND_LABEL[r.round] ?? r.round) : '—'}
                          </td>
                          <td className="px-3 py-1 text-center whitespace-nowrap">
                            {r.isBye ? (
                              <span className="text-xs text-slate-400 italic">Bye</span>
                            ) : r.result !== null ? (
                              <span className={`font-bold text-xs ${r.result === 'W' ? 'text-emerald-600' : 'text-red-500'}`}>
                                {r.result}
                              </span>
                            ) : <span className="text-xs text-slate-400">—</span>}
                          </td>
                          <td className="px-3 py-1 text-slate-800 font-medium text-xs whitespace-nowrap">
                            {r.opponentId ? (
                              <Link href={`/wrestler/${r.opponentId}`} className="hover:text-blue-600 transition-colors">
                                {r.opponentName}
                              </Link>
                            ) : r.opponentName}
                          </td>
                          <td className="px-3 py-1 text-slate-500 text-xs whitespace-nowrap">
                            {r.isBye || !r.opponentName || r.opponentName === '—' || r.opponentName === 'Forfeit' || r.opponentName === 'Unknown' ? '—'
                              : <SchoolTag id={r.opponentSchoolId} name={r.opponentSchool} className="text-xs text-slate-500" />}
                          </td>
                          <td className="px-3 py-1 text-right text-slate-500 font-mono text-xs tabular-nums whitespace-nowrap">
                            {r.score}
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap">
                            {hasNote && (
                              <span className="inline-flex items-center gap-1">
                                {isRevengeWin && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 whitespace-nowrap">
                                    Avenged Loss
                                  </span>
                                )}
                                {isUpsetWin && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 whitespace-nowrap">
                                    Upset Win
                                  </span>
                                )}
                              </span>
                            )}
                          </td>
                        </tr>
                              )
                            })}
                    </tbody>
                  </table>
                </div>
              </div>
                    </Fragment>
            )
          })}
        </div>
      ) : null
          }

          default:
            return null
        }
      })}
      <CollegeSection years={college} />
      </div>
    </>
  )
}


function BackLink({ gender }: { gender: string }) {
  const href = gender === 'F' ? '/girls' : '/boys'
  return (
    <Link href={href} className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
      ← Back to search
    </Link>
  )
}
