import { supabase, ROUND_ORDER, ROUND_LABEL, TOURNAMENT_TYPE_LABEL } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { WrestlerHeader } from '@/components/WrestlerHeader'
import { StatsTable } from '@/components/StatsTable'
import { conferenceToSlug } from '@/lib/conferences'
import { sectionToSlug, groupToSlug } from '@/lib/sections'

export const dynamic = 'force-dynamic'

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
  winner_context_raw: string | null
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
  matches: (Match & { result: 'W' | 'L'; opponent: string; opponentSchool: string | null; opponentId: string | null })[]
}

const SEASON_LABELS: Record<number, string> = {
  1: '2024–25',
  2: '2025–26',
}

const SEASON_SHORT: Record<number, string> = { 1: "\u201925", 2: "\u201926" }

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
  if (['FORF', 'INJ', 'DQ', 'FF', 'DEF', 'MFF'].includes(winType)) return 0
  // Loss by fall = full 6:00 period regardless of when the pin occurred
  if (isLoss && winType === 'FALL') return 360
  if (['FALL', 'TF', 'TF-1.5'].includes(winType) && fallTime && fallTime > 0) return fallTime
  if (['DEC', 'MD'].includes(winType)) return 420
  if (['SV-1', 'TB-1'].includes(winType)) return 480
  if (['TB-2', 'UTB', '2-OT'].includes(winType)) return 540
  if (['FALL', 'TF', 'TF-1.5'].includes(winType)) return 420
  return 420
}

function computeDomMatchScore(winType: string | null, fallTime: number | null): number {
  if (!winType) return 0
  if (['FALL', 'TF', 'TF-1.5'].includes(winType)) {
    return Math.max(9 - (fallTime ?? 0) / 60, 0)
  }
  if (winType === 'MD') return 2
  if (['DEC', 'SV-1', '2-OT', 'UTB'].includes(winType)) return 1
  return 0
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function WrestlerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // 1. Wrestler
  const { data: wrestler } = await supabase
    .from('wrestlers')
    .select('id, first_name, last_name, gender, suffix')
    .eq('id', id)
    .single()

  if (!wrestler) notFound()

  // 2. All entries for this wrestler (include school, grade, season record, and season via tournament join)
  const { data: entries } = await supabase
    .from('tournament_entries')
    .select('id, school_context_raw, grade_label, wins, losses, tournament:tournaments(season_id, tournament_type)')
    .eq('wrestler_id', id)

  const entryIds = (entries ?? []).map((e: { id: string }) => e.id)

  if (entryIds.length === 0) {
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

  // Determine the current (latest) season this wrestler has entries in
  type EntryRow = {
    id: string
    school_context_raw: string | null
    grade_label: string | null
    wins: number | null
    losses: number | null
    tournament: { season_id: number; tournament_type: string } | { season_id: number; tournament_type: string }[] | null
  }
  const typedEntries = (entries ?? []) as unknown as EntryRow[]
  const entrySeasons = typedEntries.map(
    e => (unwrap(e.tournament) as { season_id: number } | null)?.season_id ?? 0
  )
  const currentSeason = entrySeasons.length > 0 ? Math.max(...entrySeasons) : 1

  // School and grade: prefer current season entries, fall back to any
  const currentEntries = typedEntries.filter(
    e => ((unwrap(e.tournament) as { season_id: number } | null)?.season_id ?? 0) === currentSeason
  )
  const primarySchool =
    currentEntries.find(e => e.school_context_raw)?.school_context_raw ??
    typedEntries.find(e => e.school_context_raw)?.school_context_raw ?? null
  const primaryGrade =
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
    winner_entry_id, loser_entry_id, winner_context_raw,
    tournament:tournaments(name, tournament_type, season_id),
    weight_class:weight_classes(weight)
  `

  const [{ data: winMatches }, { data: lossMatches }, { data: schoolNameRow }, { data: boutData }, { data: dualMatchData }] =
    await Promise.all([
      supabase.from('matches').select(selectFields).in('winner_entry_id', entryIds),
      supabase.from('matches').select(selectFields).in('loser_entry_id', entryIds),
      primarySchool
        ? supabase.from('school_names').select('school_name').eq('abbreviation', primarySchool).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from('tournament_bouts')
        .select(`
          id, weight_class, round, winner,
          result_type, result_detail, fall_time_seconds,
          nj_wrestler1_id, wrestler1_name_raw, wrestler1_school_raw,
          nj_wrestler2_id, wrestler2_name_raw, wrestler2_school_raw,
          wrestler1_school:schools!wrestler1_school_id(id, display_name, is_nj),
          wrestler2_school:schools!wrestler2_school_id(id, display_name, is_nj),
          event:in_season_tournaments!in_season_tournament_id(id, name, start_date)
        `)
        .or(`nj_wrestler1_id.eq.${id},nj_wrestler2_id.eq.${id}`),
      supabase
        .from('dual_meet_matches')
        .select(`
          id, weight_class, result_type, result_detail, fall_time_seconds,
          is_double_forfeit, is_forfeit_win, wrestler_a_id, wrestler_b_id, winner_id,
          wrestler_a:wrestlers!wrestler_a_id(id, first_name, last_name),
          wrestler_b:wrestlers!wrestler_b_id(id, first_name, last_name),
          meet:dual_meets(
            id, meet_date, team1_score, team2_score, season_id,
            school_a:schools!team1_school_id(id, display_name),
            school_b:schools!team2_school_id(id, display_name)
          )
        `)
        .or(`wrestler_a_id.eq.${id},wrestler_b_id.eq.${id}`),
    ])
  const displaySchool = (schoolNameRow as { school_name: string } | null)?.school_name ?? primarySchool

  // Extract school ID directly from tournament bouts (FK join to schools, always correct)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boutSchoolId = (() => {
    if (!boutData || boutData.length === 0) return null
    for (const bout of boutData as any[]) {
      if (String(bout.nj_wrestler1_id) === id) return (bout.wrestler1_school as any)?.id ?? null
      if (String(bout.nj_wrestler2_id) === id) return (bout.wrestler2_school as any)?.id ?? null
    }
    return null
  })()

  // Fetch school profile (colors, logo, section, conference) and wrestler's weight
  const schoolSelect = 'id, display_name, primary_color, secondary_color, logo_url, section, classification, athletic_conference, mascot, header_background'
  const [{ data: schoolProfileData }, { data: weightData }] = await Promise.all([
    boutSchoolId
      ? supabase.from('schools').select(schoolSelect).eq('id', boutSchoolId).maybeSingle()
      : displaySchool
      ? supabase.from('schools').select(schoolSelect).eq('display_name', displaySchool).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('tournament_entries')
      .select('weight_class:weight_classes(weight), tournament:tournaments(tournament_type, season_id)')
      .eq('wrestler_id', wrestler.id)
      .order('tournament_id', { ascending: false })
      .limit(10),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schoolProfile = schoolProfileData as any ?? {
    id: 0, display_name: displaySchool ?? '', primary_color: null, secondary_color: null,
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
  const bestWeight = weightEntries
    .filter(e => e.weight_class?.weight && e.tournament?.season_id === currentSeason)
    .sort((a, b) => (typeOrder[b.tournament?.tournament_type] ?? 0) - (typeOrder[a.tournament?.tournament_type] ?? 0))
    [0]?.weight_class?.weight ?? null

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

  const opponentMap: Record<string, { name: string; school: string | null; wrestlerId: string | null }> = {}
  if (opponentEntryIds.length > 0) {
    const { data: oppEntries } = await supabase
      .from('tournament_entries')
      .select('id, school_context_raw, wrestler:wrestlers(id, first_name, last_name)')
      .in('id', opponentEntryIds)

    type OppEntry = { id: string; school_context_raw: string | null; wrestler: { id: string; first_name: string; last_name: string } | { id: string; first_name: string; last_name: string }[] | null }
    const typedOppEntries = (oppEntries ?? []) as unknown as OppEntry[]

    // State entries have null school — find their school from other entries (district/region)
    const noSchoolWrestlerIds = typedOppEntries
      .filter(e => !e.school_context_raw)
      .map(e => unwrap(e.wrestler)?.id)
      .filter((wid): wid is string => wid != null)

    const fallbackSchoolMap: Record<string, string> = {}  // wrestler_id → school_abbr
    if (noSchoolWrestlerIds.length > 0) {
      const { data: altEntries } = await supabase
        .from('tournament_entries')
        .select('wrestler_id, school_context_raw')
        .in('wrestler_id', noSchoolWrestlerIds)
        .not('school_context_raw', 'is', null)
      for (const e of (altEntries ?? []) as { wrestler_id: string; school_context_raw: string }[]) {
        if (!fallbackSchoolMap[e.wrestler_id]) fallbackSchoolMap[e.wrestler_id] = e.school_context_raw
      }
    }

    // Batch-lookup full school names for all collected abbreviations
    const oppSchoolAbbrs = new Set<string>()
    for (const e of typedOppEntries) {
      if (e.school_context_raw) oppSchoolAbbrs.add(e.school_context_raw)
    }
    for (const abbr of Object.values(fallbackSchoolMap)) oppSchoolAbbrs.add(abbr)

    const schoolNameMap: Record<string, string> = {}
    if (oppSchoolAbbrs.size > 0) {
      const { data: schoolRows } = await supabase
        .from('school_names')
        .select('abbreviation, school_name')
        .in('abbreviation', [...oppSchoolAbbrs])
      for (const row of (schoolRows ?? []) as { abbreviation: string; school_name: string }[]) {
        schoolNameMap[row.abbreviation] = row.school_name
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
      const abbr = e.school_context_raw ?? (w?.id ? fallbackSchoolMap[w.id] : null)
      opponentMap[e.id] = { name, school: abbr ? (schoolNameMap[abbr] ?? abbr) : null, wrestlerId: w?.id ?? null }
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
      : (oppData?.name ?? m.winner_context_raw ?? '—')
    const opponentSchool = isBye ? null : (oppData?.school ?? null)
    const opponentId = isBye ? null : (oppData?.wrestlerId ?? null)
    return { ...m, result: (isWinner ? 'W' : 'L') as 'W' | 'L', opponent, opponentSchool, opponentId }
  })

  // 6. Group by season + tournament + weight
  const groups = new Map<string, MatchGroup>()
  for (const m of annotated) {
    const t      = unwrap(m.tournament)
    const wc     = unwrap(m.weight_class)
    const tname  = t?.name ?? 'Unknown'
    const ttype  = t?.tournament_type ?? ''
    const weight = wc?.weight ?? 0
    const seasonId = t?.season_id ?? 1
    const key = `${seasonId}||${tname}||${weight}`
    if (!groups.has(key)) {
      groups.set(key, { tournament_name: tname, tournament_type: ttype, weight, season_id: seasonId, matches: [] })
    }
    groups.get(key)!.matches.push(m)
  }

  // Sort matches within each group by round order
  for (const g of groups.values()) {
    g.matches.sort((a, b) =>
      (ROUND_ORDER[a.round ?? ''] ?? 99) - (ROUND_ORDER[b.round ?? ''] ?? 99)
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

  // Build school name per season from entries
  const schoolBySeason = new Map<number, string>()
  const allSchoolAbbrs = new Set<string>()
  for (const e of typedEntries) {
    if (e.school_context_raw) allSchoolAbbrs.add(e.school_context_raw)
  }
  const schoolNameLookup: Record<string, string> = {}
  if (allSchoolAbbrs.size > 0) {
    const { data: snRows } = await supabase
      .from('school_names')
      .select('abbreviation, school_name')
      .in('abbreviation', [...allSchoolAbbrs])
    for (const row of (snRows ?? []) as { abbreviation: string; school_name: string }[]) {
      schoolNameLookup[row.abbreviation] = row.school_name
    }
  }
  for (const e of typedEntries) {
    const sid = (unwrap(e.tournament) as { season_id: number } | null)?.season_id ?? 0
    if (sid && e.school_context_raw && !schoolBySeason.has(sid)) {
      schoolBySeason.set(sid, schoolNameLookup[e.school_context_raw] ?? e.school_context_raw)
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
    nj_wrestler1_id: string | null
    wrestler1_name_raw: string
    wrestler1_school_raw: string
    wrestler1_school: { display_name: string; is_nj: boolean } | null
    nj_wrestler2_id: string | null
    wrestler2_name_raw: string
    wrestler2_school_raw: string
    wrestler2_school: { display_name: string; is_nj: boolean } | null
    event: { id: string; name: string; start_date: string | null } | null
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
    wrestler_a: { id: string; first_name: string; last_name: string } | { id: string; first_name: string; last_name: string }[] | null
    wrestler_b: { id: string; first_name: string; last_name: string } | { id: string; first_name: string; last_name: string }[] | null
    meet: {
      id: string
      meet_date: string
      team1_score: number | null
      team2_score: number | null
      season_id: number
      school_a: { id: number; display_name: string } | null
      school_b: { id: number; display_name: string } | null
    } | null
  }

  type DualMeetGroup = {
    meetId: string
    meetDate: string
    oppSchoolName: string
    myTeamScore: number | null
    oppTeamScore: number | null
    matches: {
      id: string
      weightClass: number
      result: 'W' | 'L' | null
      oppName: string
      oppId: string | null
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
        oppSchoolName: oppSchool?.display_name ?? '—',
        myTeamScore: myScore,
        oppTeamScore: oppScore,
        matches: [],
      })
    }

    const result: 'W' | 'L' | null = row.is_double_forfeit
      ? null
      : row.winner_id === id ? 'W' : 'L'

    type WrestlerRef = { id: string; first_name: string; last_name: string }
    const oppWrestlerRaw = (isWrestlerA
      ? unwrap(row.wrestler_b as WrestlerRef | WrestlerRef[] | null)
      : unwrap(row.wrestler_a as WrestlerRef | WrestlerRef[] | null)) as WrestlerRef | null
    const oppName = oppWrestlerRaw
      ? `${oppWrestlerRaw.first_name} ${oppWrestlerRaw.last_name}`
      : row.is_forfeit_win ? 'Forfeit' : row.is_double_forfeit ? 'Double Forfeit' : '—'
    const oppId: string | null = oppWrestlerRaw?.id ?? null

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
      resultStr,
    })
  }

  // Sort meets by date descending; sort matches within each meet by weight ascending
  const dualMeetGroups = [...dualMeetMap.values()]
    .sort((a, b) => b.meetDate.localeCompare(a.meetDate))
  for (const g of dualMeetGroups) {
    g.matches.sort((a, b) => a.weightClass - b.weightClass)
  }

  // Current-season stats for the profile header
  const currentGroups = bySeason.get(currentSeason) ?? []
  const currentAnnotated = annotated.filter(
    m => (unwrap(m.tournament)?.season_id ?? 1) === currentSeason
  )
  const nonBye = currentAnnotated.filter(m => m.opponent !== 'Bye')
  const wins   = nonBye.filter(m => m.result === 'W').length
  const losses = nonBye.filter(m => m.result === 'L').length

  // Career stats computation
  type SeasonStat = {
    seasonId: number; wins: number; losses: number; pins: number; tfs: number; mds: number
    bonusPct: number; hammerRating: number; bestPin: number | null; matTime: number; consolationWins: number
  }
  const seasonStatsMap = new Map<number, SeasonStat>()
  for (const m of annotated) {
    if (m.opponent === 'Bye') continue
    const sid = unwrap(m.tournament)?.season_id ?? 1
    if (!seasonStatsMap.has(sid)) {
      seasonStatsMap.set(sid, {
        seasonId: sid, wins: 0, losses: 0, pins: 0, tfs: 0, mds: 0,
        bonusPct: 0, hammerRating: 0, bestPin: null, matTime: 0, consolationWins: 0,
      })
    }
    const s = seasonStatsMap.get(sid)!
    const wt = m.win_type ?? ''
    s.matTime += computeMatchMatTime(m.win_type, m.fall_time_seconds, m.result === 'L')
    if (m.result === 'W') {
      s.wins++
      if (wt === 'FALL') {
        s.pins++
        if (m.fall_time_seconds && (s.bestPin === null || m.fall_time_seconds < s.bestPin)) {
          s.bestPin = m.fall_time_seconds
        }
      }
      if (wt === 'TF' || wt === 'TF-1.5') s.tfs++
      if (wt === 'MD') s.mds++
      if (m.bracket_side === 'consolation') s.consolationWins++
    } else {
      s.losses++
    }
  }
  for (const s of seasonStatsMap.values()) {
    s.bonusPct = s.wins > 0 ? Math.round(((s.pins + s.tfs + s.mds) / s.wins) * 100) : 0
    const seasonMatches = annotated.filter(m => m.opponent !== 'Bye' && (unwrap(m.tournament)?.season_id ?? 1) === s.seasonId)
    const domScores = seasonMatches.map(m => {
      const score = computeDomMatchScore(m.win_type, m.fall_time_seconds)
      return m.result === 'W' ? score : -score
    })
    s.hammerRating = domScores.length > 0 ? domScores.reduce((a, b) => a + b, 0) / domScores.length : 0
  }
  const seasonStats = [...seasonStatsMap.values()].sort((a, b) => b.seasonId - a.seasonId)
  const careerTotals = seasonStats.reduce((acc, s) => ({
    wins: acc.wins + s.wins, losses: acc.losses + s.losses,
    pins: acc.pins + s.pins, tfs: acc.tfs + s.tfs, mds: acc.mds + s.mds,
    bonusPct: 0, hammerRating: 0,
    bestPin: s.bestPin !== null ? (acc.bestPin !== null ? Math.min(acc.bestPin, s.bestPin) : s.bestPin) : acc.bestPin,
    matTime: acc.matTime + s.matTime, consolationWins: acc.consolationWins + s.consolationWins,
  }), { wins: 0, losses: 0, pins: 0, tfs: 0, mds: 0, bonusPct: 0, hammerRating: 0, bestPin: null as number | null, matTime: 0, consolationWins: 0 })
  careerTotals.bonusPct = careerTotals.wins > 0 ? Math.round(((careerTotals.pins + careerTotals.tfs + careerTotals.mds) / careerTotals.wins) * 100) : 0
  const allDomScores = annotated.filter(m => m.opponent !== 'Bye').map(m => {
    const score = computeDomMatchScore(m.win_type, m.fall_time_seconds)
    return m.result === 'W' ? score : -score
  })
  careerTotals.hammerRating = allDomScores.length > 0 ? allDomScores.reduce((a, b) => a + b, 0) / allDomScores.length : 0

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

  // Detect Hammer Champ & Terminator awards across all seasons
  type AwardInfo = { type: 'hammer' | 'terminator'; label: string; seasonId: number }
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
  type AwardCall = { check: TournCheck; kind: 'hammer' | 'terminator'; promise: PromiseLike<{ data: any }> }
  // Build RPC calls for each tournament check
  const awardPromises = uniqueChecks.flatMap(c => {
    const calls: AwardCall[] = []
    if (c.level === 'district') {
      calls.push({ check: c, kind: 'hammer', promise: supabase.rpc('district_dominance', { p_district: c.num, p_gender: genderType, p_season: c.seasonId }) })
      calls.push({ check: c, kind: 'terminator', promise: supabase.rpc('district_mat_time', { p_district: c.num, p_gender: genderType, p_season: c.seasonId }) })
    } else if (c.level === 'region') {
      if (genderType === 'M') {
        calls.push({ check: c, kind: 'hammer', promise: supabase.rpc('region_dominance', { p_region: c.num, p_gender: genderType, p_season: c.seasonId }) })
        calls.push({ check: c, kind: 'terminator', promise: supabase.rpc('region_mat_time', { p_region: c.num, p_gender: genderType, p_season: c.seasonId }) })
      } else {
        calls.push({ check: c, kind: 'hammer', promise: supabase.rpc('girls_region_dominance', { p_region: c.num, p_season: c.seasonId }) })
        calls.push({ check: c, kind: 'terminator', promise: supabase.rpc('girls_region_mat_time', { p_region: c.num, p_season: c.seasonId }) })
      }
    } else if (c.level === 'state') {
      calls.push({ check: c, kind: 'hammer', promise: supabase.rpc('state_dominance', { p_gender: genderType, p_season: c.seasonId }) })
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

  const baseName = [wrestler.first_name, wrestler.last_name, wrestler.suffix]
    .filter(Boolean).join(' ')
  const displayName = primaryGrade ? `${baseName}, ${primaryGrade}` : baseName

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
  const schoolLink = schoolProfile.id > 0 ? `/schools/${schoolProfile.id}?gender=${gender}` : null

  return (
    <>
      <WrestlerHeader
        schoolName={displaySchool}
        mascotName={mascotName}
        logoUrl={schoolProfile.logo_url as string | null}
        primaryColor={schoolProfile.primary_color as string | null}
        secondaryColor={schoolProfile.secondary_color as string | null}
        headerBackground={headerBackground}
        wrestlerName={baseName}
        grade={primaryGrade}
        primaryWeight={bestWeight}
        schoolLink={schoolLink}
      />

      <div className="max-w-3xl mx-auto px-4 py-6">
      <BackLink gender={wrestler.gender} />

      {/* ── Trophy Case ── */}

      {/* Placements + special awards */}
      {(placements.length > 0 || awards.length > 0) && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {[...placements]
            .sort((a, b) =>
              b.seasonId - a.seasonId ||
              (TOURNAMENT_TYPE_ORDER[a.tournamentType] ?? 9) - (TOURNAMENT_TYPE_ORDER[b.tournamentType] ?? 9) ||
              a.place - b.place
            )
            .map((p, i) => {
              const short = placementShortLabel(p.tournament, p.tournamentType)
              const yr = SEASON_SHORT[p.seasonId] ?? ''
              const medal = p.place === 1 ? '\u{1F947}' : p.place === 2 ? '\u{1F948}' : p.place === 3 ? '\u{1F949}' : null
              return (
                <span key={i} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
                  {medal ? <span>{medal}</span> : <span className="opacity-75">{p.place}th</span>}
                  <span>{short}</span>
                  {yr && <span className="opacity-60">{yr}</span>}
                </span>
              )
            })}
          {[...awards]
            .sort((a, b) =>
              b.seasonId - a.seasonId ||
              (a.type === 'hammer' ? 0 : 1) - (b.type === 'hammer' ? 0 : 1)
            )
            .map((a, i) => {
              const yr = SEASON_SHORT[a.seasonId] ?? ''
              const icon = a.type === 'hammer' ? '\u{1F528}' : '\u{26A1}'
              return (
                <span key={`award-${i}`} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700">
                  <span>{icon}</span>
                  <span>{a.label}</span>
                  {yr && <span className="opacity-60">{yr}</span>}
                </span>
              )
            })}
        </div>
      )}

      {/* Ghost Champion badge */}
      {ghostChampionships.length > 0 && (
        <div className="mb-4 space-y-2">
          {ghostChampionships.map((gc: any, i: number) => (
            <div key={i} className="bg-slate-900 text-white rounded-none px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{'\u{1F47B}'}</span>
                <span className="font-bold text-sm uppercase tracking-wide">Ghost Champion</span>
                <span className="text-xs text-slate-400">
                  #{gc.seed} seed &middot; {cleanTournamentName(gc.tournament_name)} &middot; {gc.weight}lb
                  {seasonIds.length > 1 && ` \u00B7 ${SEASON_LABELS[gc.season_id as number] ?? ''}`}
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
      )}


      {/* Career Stats */}
      {seasonStats.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Career Stats</h3>
          <StatsTable
            columns={[
              { key: 'season',    label: 'Season',   align: 'left',   numeric: false },
              { key: 'wl',        label: 'W-L',      align: 'center', numeric: false },
              { key: 'pins',      label: 'Pins',     align: 'center' },
              { key: 'tfs',       label: 'TFs',      align: 'center' },
              { key: 'bonus',     label: 'Bonus%',   align: 'center', numeric: false },
              { key: 'hammer',    label: 'Hammer',   align: 'center', numeric: false },
              { key: 'bestPin',   label: 'Best Pin', align: 'center', numeric: false },
              { key: 'matTime',   label: 'Mat Time', align: 'center', numeric: false },
              { key: 'consolWins', label: 'Consol.W', align: 'center' },
            ]}
            rows={seasonStats.map(s => ({
              season:    SEASON_LABELS[s.seasonId] ?? `S${s.seasonId}`,
              wl:        `${s.wins}-${s.losses}`,
              pins:      s.pins,
              tfs:       s.tfs,
              bonus:     `${s.bonusPct}%`,
              hammer:    s.hammerRating.toFixed(2),
              bestPin:   s.bestPin !== null ? formatPinTimeStat(s.bestPin) : '\u2014',
              matTime:   formatMatTime(s.matTime),
              consolWins: s.consolationWins,
            }))}
            footer={seasonStats.length > 1 ? {
              season:    'Career',
              wl:        `${careerTotals.wins}-${careerTotals.losses}`,
              pins:      careerTotals.pins,
              tfs:       careerTotals.tfs,
              bonus:     `${careerTotals.bonusPct}%`,
              hammer:    careerTotals.hammerRating.toFixed(2),
              bestPin:   careerTotals.bestPin !== null ? formatPinTimeStat(careerTotals.bestPin) : '\u2014',
              matTime:   formatMatTime(careerTotals.matTime),
              consolWins: careerTotals.consolationWins,
            } : undefined}
          />
        </div>
      )}

      {/* Revenge Wins */}
      {revengeWins.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Revenge Wins <span className="text-slate-300">({revengeWins.length})</span>
          </h3>
          <div className="space-y-3">
            {revengeWins.map((rw: any, i: number) => (
              <div key={i} className="border border-black rounded-none bg-white p-4 shadow-none">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-emerald-600 font-bold text-sm">W</span>
                  <span className="font-medium text-slate-800">
                    {rw.opponent_id ? (
                      <Link href={`/wrestler/${rw.opponent_id}`} className="hover:text-blue-600 transition-colors">
                        {rw.opponent_name}
                      </Link>
                    ) : rw.opponent_name}
                  </span>
                  {rw.opponent_school_name && (
                    <span className="text-xs text-slate-400">{rw.opponent_school_name}</span>
                  )}
                  <span className="text-xs text-slate-400">
                    &middot; {cleanTournamentName(rw.revenge_tournament_name)} {ROUND_LABEL[rw.revenge_round] ?? rw.revenge_round} &middot; {rw.weight}lb
                    &middot; {rw.revenge_win_type}
                    {rw.revenge_fall_time ? ` ${Math.floor(rw.revenge_fall_time / 60)}:${String(rw.revenge_fall_time % 60).padStart(2, '0')}` : ''}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <span className="text-red-400 font-semibold">L</span>
                  <span>
                    Originally lost at {cleanTournamentName(rw.original_tournament_name)} ({ROUND_LABEL[rw.original_round] ?? rw.original_round})
                    {rw.original_win_type && ` by ${rw.original_win_type}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Match history — one card per season */}
      {seasonIds.length > 0 && (
        <div className="space-y-8">
          {seasonIds.map(seasonId => {
            const seasonGroups = bySeason.get(seasonId) ?? []
            const label = SEASON_LABELS[seasonId] ?? `Season ${seasonId}`
            const allSeasonMatches = seasonGroups.flatMap(g => g.matches).filter(m => m.opponent !== 'Bye')
            const seasonWins   = allSeasonMatches.filter(m => m.result === 'W').length
            const seasonLosses = allSeasonMatches.filter(m => m.result === 'L').length
            return (
              <div key={seasonId} className="rounded-lg border border-slate-200 overflow-hidden">
                {/* Season header */}
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-widest">{label}</span>
                  {schoolBySeason.get(seasonId) && (
                    <span className="text-xs text-slate-400 font-medium">— {schoolBySeason.get(seasonId)}</span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-[420px] w-full text-[13px]">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th className="text-left px-2 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap w-24">Round</th>
                        <th className="text-center px-2 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap w-10">Res</th>
                        <th className="text-left px-2 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Opponent</th>
                        <th className="text-right px-2 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap w-28">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seasonGroups.flatMap(g => [
                        // Tournament subheader row
                        <tr key={`h||${g.season_id}||${g.tournament_name}||${g.weight}`} className="bg-slate-100 border-t border-slate-200">
                          <td colSpan={4} className="px-2 py-1">
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tournamentTypeColor(g.tournament_type)}`}>
                                {TOURNAMENT_TYPE_LABEL[g.tournament_type] ?? g.tournament_type}
                              </span>
                              <span className="text-xs font-semibold text-slate-700">
                                {cleanTournamentName(g.tournament_name)} &middot; {g.weight} lbs
                              </span>
                            </span>
                          </td>
                        </tr>,
                        // Match rows — alternate bg for zebra
                        ...g.matches.map((m, mi) => {
                          const mIsBye = m.opponent === 'Bye'
                          return (
                            <tr key={m.id} className={`border-t border-slate-100 ${mIsBye ? 'opacity-50' : ''} ${mi % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                              <td className="px-2 py-1 text-slate-500 text-xs">
                                {m.round === 'F' && m.bracket_side === 'championship' && m.result === 'W' && (
                                  <span className="mr-1">{'\u{1F451}'}</span>
                                )}
                                {m.round === 'F' && m.bracket_side === 'championship' && m.result === 'L' && (
                                  <span className="mr-1">{'\u{1F948}'}</span>
                                )}
                                {ROUND_LABEL[m.round ?? ''] ?? m.round ?? '—'}
                              </td>
                              <td className="px-2 py-1 text-center">
                                {mIsBye ? (
                                  <span className="text-xs text-slate-400 italic">Bye</span>
                                ) : (
                                  <span className={`font-bold text-xs ${m.result === 'W' ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {m.result}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-1 text-slate-800 font-medium text-xs">
                                {m.opponentId ? (
                                  <Link href={`/wrestler/${m.opponentId}`} className="hover:text-blue-600 transition-colors">
                                    {m.opponent}
                                  </Link>
                                ) : m.opponent}
                                {m.opponentSchool && (
                                  <span className="ml-1.5 text-slate-400 font-normal text-xs">{m.opponentSchool}</span>
                                )}
                              </td>
                              <td className="px-2 py-1 text-right text-slate-500 font-mono text-xs tabular-nums">
                                {mIsBye ? '' : (m.win_type ? formatScore(m, m.result === 'W') : '—')}
                              </td>
                            </tr>
                          )
                        }),
                      ])}
                      {/* Season totals footer */}
                      {allSeasonMatches.length > 0 && (
                        <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                          <td colSpan={4} className="px-2 py-1 text-xs text-slate-700">
                            Season Total: <span className="text-slate-900">{seasonWins}-{seasonLosses}</span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Dual Meet History ── */}
      {dualMeetGroups.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Dual Meets
          </h2>
          {dualMeetGroups.map(({ meetId, meetDate, oppSchoolName, myTeamScore, oppTeamScore, matches }) => {
            const dateStr = new Date(meetDate + 'T12:00:00').toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })
            const meetWins   = matches.filter(m => m.result === 'W').length
            const meetLosses = matches.filter(m => m.result === 'L').length
            return (
              <div key={meetId} className="border border-black rounded-none overflow-hidden bg-white">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-slate-800">vs. {oppSchoolName}</span>
                  <span className="text-xs text-slate-400">{dateStr}</span>
                  {myTeamScore !== null && oppTeamScore !== null && (
                    <span className="ml-auto text-xs text-slate-500 font-medium">
                      Team {myTeamScore}–{oppTeamScore}
                    </span>
                  )}
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {matches.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-slate-400 font-mono text-xs w-16 tabular-nums">
                          {m.weightClass}
                        </td>
                        <td className="px-4 py-2.5">
                          {m.result !== null && (
                            <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mr-2 ${
                              m.result === 'W' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                            }`}>
                              {m.result}
                            </span>
                          )}
                          {m.oppId ? (
                            <Link href={`/wrestler/${m.oppId}`} className="font-medium text-slate-800 hover:underline">
                              {m.oppName}
                            </Link>
                          ) : (
                            <span className="font-medium text-slate-800">{m.oppName}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-500 text-xs">
                          {m.resultStr}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-slate-200 bg-slate-50">
                      <td colSpan={3} className="px-4 py-1.5 text-xs text-slate-500">
                        {meetWins}W–{meetLosses}L at this meet
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}

      {/* ── In-Season Tournament Bouts ── */}
      {boutTournaments.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            In-Season Tournaments
          </h2>
          {boutTournaments.map(({ tid, name, startDate, bouts: tBouts }) => {
            const dateStr = startDate
              ? new Date(startDate + 'T12:00:00').toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })
              : null
            return (
              <div key={tid} className="border border-black rounded-none overflow-hidden bg-white">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-baseline gap-2">
                  <Link
                    href={`/tournaments/${tid}`}
                    className="text-sm font-semibold text-slate-800 hover:underline"
                  >
                    {name}
                  </Link>
                  {dateStr && <span className="text-xs text-slate-400">{dateStr}</span>}
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {tBouts.map(bout => {
                      const isW1 = bout.nj_wrestler1_id === id
                      const result: 'W' | 'L' | null = bout.winner === null
                        ? null
                        : (isW1 && bout.winner === 1) || (!isW1 && bout.winner === 2) ? 'W' : 'L'
                      const oppName = isW1 ? bout.wrestler2_name_raw : bout.wrestler1_name_raw
                      const oppId = isW1 ? bout.nj_wrestler2_id : bout.nj_wrestler1_id
                      const oppSchoolJoin = isW1 ? bout.wrestler2_school : bout.wrestler1_school
                      const oppSchoolRaw = isW1 ? bout.wrestler2_school_raw : bout.wrestler1_school_raw
                      const oppSchool = oppSchoolJoin?.display_name ?? oppSchoolRaw
                      const oppIsNJ = oppSchoolJoin?.is_nj ?? false

                      // Format result string
                      const rt = bout.result_type?.toUpperCase() ?? null
                      let resultStr = '—'
                      if (rt === 'FALL') {
                        if (bout.fall_time_seconds) {
                          const min = Math.floor(bout.fall_time_seconds / 60)
                          const sec = String(bout.fall_time_seconds % 60).padStart(2, '0')
                          resultStr = `Fall ${min}:${sec}`
                        } else { resultStr = 'Fall' }
                      } else if (rt === 'FOR' || rt === 'FORF') {
                        resultStr = 'Forfeit'
                      } else if (bout.result_type) {
                        resultStr = bout.result_detail
                          ? `${bout.result_type} ${bout.result_detail}`
                          : bout.result_type
                      }

                      return (
                        <tr key={bout.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 text-slate-500 font-mono text-xs w-20 tabular-nums">
                            {bout.weight_class} lb
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 text-xs w-24">
                            {ROUND_LABEL[bout.round] ?? bout.round}
                          </td>
                          <td className="px-4 py-2.5">
                            {result !== null ? (
                              <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mr-2 ${
                                result === 'W' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                              }`}>
                                {result}
                              </span>
                            ) : null}
                            {oppId && oppIsNJ ? (
                              <Link href={`/wrestler/${oppId}`} className="font-medium text-slate-800 hover:underline">
                                {oppName}
                              </Link>
                            ) : (
                              <span className="font-medium text-slate-800">{oppName}</span>
                            )}
                            {oppSchool && (
                              <span className="ml-1.5 text-slate-400 text-xs">{oppSchool}</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-500 text-xs">
                            {resultStr}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}
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
