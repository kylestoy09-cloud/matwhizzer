// ─── Snapshot compute engine (girls) ─────────────────────────────────────────
// Exact mirror of compute.ts — uses dual_meets_girls, dual_meet_matches_girls,
// snapshot_streak_state_girls, snapshot_season_highs_girls, snapshot_reports_girls.
// wrestler_hammer_scores and wrestler_match_score_log are shared tables with a
// gender column: always filter them to 'F'. in_season_tournaments and
// ranking_published are shared.

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  SnapshotPayload, SectionData, SectionScope,
  StreakRow, SnappedStreakRow, StreaksData, SnappedData,
  RatedMatchRow, UpsetByGapRow,
  TeamRankEntry, TeamUpsetRow, FinalBoutRow,
  SpeedRecord, TeamStoppageRow, TeamBonusPctRow,
  TeamScoreRow, TeamMarginRow,
  FirstWinRow, DualMatTimeRow,
  TournamentsData, TournamentChampRow, LowestSeedWinRow,
  TournamentMatTimeRow, TournamentBiggestUpset,
  SeasonHighs,
} from './types'
import { DB_SECTION_TO_SCOPE } from './types'

// Every lookup must succeed. A failed query used to read as "no rows", so a
// busy day could be saved with whole sections silently missing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function must(res: { data: any; error: { message: string } | null }, what: string): any[] {
  if (res.error) throw new Error(`snapshot ${what}: ${res.error.message}`)
  return res.data ?? []
}

// Long id lists overflow the request URL ("Bad Request"): query in chunks.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function inChunks(ids: string[], run: (chunk: string[]) => PromiseLike<{ data: any; error: { message: string } | null }>, what: string): Promise<any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any[] = []
  for (let i = 0; i < ids.length; i += 150) out.push(...must(await run(ids.slice(i, i + 150)), what))
  return out
}

const BONUS_TYPES   = new Set(['Fall', 'TF', 'MD'])
const PIN_TYPE      = 'Fall'
const TECH_TYPE     = 'TF'
// Speed records ignore times no real bout can have: the sources carry
// placeholder times ("Fall 0:01"), and a tech fall takes far longer than a
// second. A 1-second pin and tech had become 2025-26 season records.
const MIN_PIN_SEC    = 5
const MIN_TECH_SEC   = 30
// "Fastest dual" compares duals with a near-full card of wrestled bouts; a dual
// with no bouts stored (or mostly forfeits) totals ~0 mat time.
const MIN_DUAL_CONTESTED = 8
const FULL_BOUT_SEC = 360
const ALLOTTED_SEC  = 4320  // 12 girls weights × 6:00 (5040 was the boys 14-weight card)

function boutSeconds(b: { fall_time_seconds?: number | null }): number {
  if (b.fall_time_seconds != null && b.fall_time_seconds > 0) return b.fall_time_seconds
  return FULL_BOUT_SEC
}
function fmtScore(s1: number | null, s2: number | null) { return `${s1 ?? '?'}–${s2 ?? '?'}` }
function avg(arr: number[]): number | null { return arr.length === 0 ? null : Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) }
function effectiveScope(section: string | null, localeSection: string | null): SectionScope | null {
  const s = section === 'Non-Public' ? localeSection : section
  return s ? (DB_SECTION_TO_SCOPE[s] ?? null) : null
}

type StreakKey = 'pin' | 'tech' | 'bonus' | 'win'
const STREAK_KEYS: StreakKey[] = ['pin', 'tech', 'bonus', 'win']
type SchoolStats = { school_id: number; school_name: string; pins: number; pin_times: number[]; techs: number; tech_times: number[]; bonus: number; total_bouts: number }

export async function computeSnapshotGirls(
  date: string,
  season: string,
  seasonId: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: SupabaseClient<any>,
): Promise<{
  payload:           SnapshotPayload
  seasonHighUpdates: SeasonHighs
  updatedStreaks:    Map<string, { len: number; startedOn: string | null }>
  todayTeamHighs:   Array<{ school_id: number; school_name: string; stat_key: string; best_value: number; avg_time_sec: number | null; bonus_wins: number | null; total_bouts: number | null; pins: number | null; techs: number | null }>
}> {

  // ── Fetch dual meets (girls tables) ──────────────────────────────────────

  const meetsRes = await db.from('dual_meets_girls').select(`
    id, meet_date, team1_score, team2_score, meet_kind,
    team1:schools!team1_school_id(id, display_name, section, locale_section),
    team2:schools!team2_school_id(id, display_name, section, locale_section)
  `).eq('meet_date', date).eq('season_id', seasonId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meets: any[] = must(meetsRes, 'meets')
  const meetIds = meets.map(m => m.id as string)
  // Team-level dual stats (scores, margins, fastest dual, team upsets, per-dual
  // pins/techs) use real duals only. Jamboree pairings and 1-2 bout partials are
  // stored as meets too, and a one-bout pairing would otherwise be "the fastest
  // dual". Individual bout stats still use every meet's bouts.
  const isTeamDual = (m: { meet_kind?: string | null }) => (m.meet_kind ?? 'dual') === 'dual'
  const teamMeets = meets.filter(isTeamDual)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bouts: any[] = []
  if (meetIds.length > 0) {
    bouts = await inChunks(meetIds, ids => db.from('dual_meet_matches_girls').select(`
      id, dual_meet_id, weight_class, order_index,
      wrestler_a_id, wrestler_b_id, winner_id,
      wrestler_a_name_raw, wrestler_b_name_raw,
      school_a_id, school_b_id,
      result_type, fall_time_seconds,
      is_forfeit_win, is_double_forfeit
    `).in('dual_meet_id', ids), 'day bouts')
  }

  const [streakStateRes, hammersRes, matchLogRes, tourneyRes, teamRankingsRes, histMeetsRes] = await Promise.all([
    db.from('snapshot_streak_state_girls').select('*').eq('season', season),
    db.from('wrestler_hammer_scores').select('wrestler_id, hammer_score').eq('season', season).eq('gender', 'F'),
    // The recalc logs girls duals as 'dual_meet' (source_id = a dual_meet_matches_girls id);
    // 'dual_meet_girls' was never written, so girls snapshots saw no dual results.
    db.from('wrestler_match_score_log').select('wrestler_id, opponent_wrestler_id, pre_match_hammer, opponent_pre_match_hammer, is_winner, source_id, match_source, match_date').eq('match_date', date).eq('season', season).eq('gender', 'F').eq('match_source', 'dual_meet'),
    db.from('in_season_tournaments_girls').select('id, name, start_date, end_date').lte('start_date', date).gte('end_date', date).eq('season', season),   // in-season tournaments key the season by label
    db.from('ranking_published').select('scope, scope_id, results, published_at').eq('ranking_type', 'team_girls').lte('published_at', `${date}T23:59:59.999Z`).order('published_at', { ascending: false }).limit(20),   // as of the report date
    db.from('dual_meets_girls').select('id, meet_date, team1:schools!team1_school_id(id, display_name), team2:schools!team2_school_id(id, display_name)').eq('season_id', seasonId).lt('meet_date', date),
  ])

  const hammerMap = new Map<string, number>()
  for (const h of must(hammersRes, 'hammers')) hammerMap.set(h.wrestler_id, parseFloat(h.hammer_score))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const streakStateBefore = new Map<string, any>()
  for (const s of must(streakStateRes, 'streakState')) streakStateBefore.set(`${s.wrestler_id}:${s.streak_type}`, s)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meetMap = new Map<string, any>()
  for (const m of meets) meetMap.set(String(m.id), m)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boutsByMeet = new Map<string, any[]>()
  for (const b of bouts) {
    const bmKey = String(b.dual_meet_id)
    if (!boutsByMeet.has(bmKey)) boutsByMeet.set(bmKey, [])
    boutsByMeet.get(bmKey)!.push(b)
  }

  const boutById = new Map<string, typeof bouts[0]>()
  for (const b of bouts) boutById.set(b.id, b)

  const schoolScopeMap = new Map<number, SectionScope | null>()
  for (const m of meets) {
    for (const team of [m.team1, m.team2] as any[]) {
      if (!team || schoolScopeMap.has(team.id)) continue
      schoolScopeMap.set(team.id, effectiveScope(team.section, team.locale_section))
    }
  }

  const wrestlerNames = new Map<string, { name: string; school: string; school_id: number | null }>()
  for (const m of meets) {
    for (const b of (boutsByMeet.get(String(m.id)) ?? [])) {
      const schA = b.school_a_id === m.team1?.id ? m.team1 : m.team2
      const schB = b.school_b_id === m.team1?.id ? m.team1 : m.team2
      if (b.wrestler_a_id) wrestlerNames.set(b.wrestler_a_id, { name: b.wrestler_a_name_raw ?? 'Unknown', school: schA?.display_name ?? '', school_id: b.school_a_id ?? null })
      if (b.wrestler_b_id) wrestlerNames.set(b.wrestler_b_id, { name: b.wrestler_b_name_raw ?? 'Unknown', school: schB?.display_name ?? '', school_id: b.school_b_id ?? null })
    }
  }

  // ── Rated bouts ───────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boutLogPairs = new Map<string, { winner: any; loser: any }>()
  for (const e of must(matchLogRes, 'matchLog')) {
    if (!boutLogPairs.has(e.source_id)) boutLogPairs.set(e.source_id, { winner: null, loser: null })
    const p = boutLogPairs.get(e.source_id)!
    if (e.is_winner) p.winner = e; else p.loser = e
  }

  const ratedBouts: RatedMatchRow[] = []
  for (const [boutId, pair] of boutLogPairs) {
    if (!pair.winner || !pair.loser) continue
    const bout = boutById.get(boutId)
    if (!bout) continue
    const meet = meetMap.get(String(bout.dual_meet_id))
    if (!meet) continue
    const winnerId  = pair.winner.wrestler_id
    const isA       = bout.wrestler_a_id === winnerId
    const winSchId  = isA ? bout.school_a_id : bout.school_b_id
    const loseSchId = isA ? bout.school_b_id : bout.school_a_id
    const winSch    = winSchId  === meet.team1?.id ? meet.team1 : meet.team2
    const loseSch   = loseSchId === meet.team1?.id ? meet.team1 : meet.team2
    ratedBouts.push({ winner_id: winnerId, winner_name: isA ? (bout.wrestler_a_name_raw ?? 'Unknown') : (bout.wrestler_b_name_raw ?? 'Unknown'), winner_school: winSch?.display_name ?? '', loser_id: pair.loser.wrestler_id, loser_name: isA ? (bout.wrestler_b_name_raw ?? 'Unknown') : (bout.wrestler_a_name_raw ?? 'Unknown'), loser_school: loseSch?.display_name ?? '', winner_hammer: pair.winner.pre_match_hammer, loser_hammer: pair.loser.pre_match_hammer, combined: pair.winner.pre_match_hammer + pair.loser.pre_match_hammer, result_type: bout.result_type ?? '', weight_class: bout.weight_class, source: 'dual' })
  }

  const upsets = ratedBouts.filter(b => b.loser_hammer > b.winner_hammer)
  const allRatedSorted:   RatedMatchRow[] = [...ratedBouts].sort((a, b) => b.combined - a.combined)
  const allUpsetsByLoser: RatedMatchRow[] = [...upsets].sort((a, b) => b.loser_hammer - a.loser_hammer)
  const allUpsetsByGap:   UpsetByGapRow[] = upsets.map(b => ({ ...b, gap: b.loser_hammer - b.winner_hammer })).sort((a, b) => b.gap - a.gap)

  // ── Full-season bouts for accurate streak computation ────────────────────

  const histMeetDateMap = new Map<string, string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const histSchoolNameMap = new Map<number, string>()
  for (const m of must(histMeetsRes, 'histMeets')) {
    histMeetDateMap.set(String(m.id), m.meet_date)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const team of [m.team1, m.team2] as any[]) {
      if (team?.id) histSchoolNameMap.set(team.id, team.display_name ?? '')
    }
  }
  const histMeetIds = [...histMeetDateMap.keys()]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let histBouts: any[] = []
  if (histMeetIds.length > 0) {
    histBouts = await inChunks(histMeetIds, ids => db.from('dual_meet_matches_girls')
      .select('wrestler_a_id, wrestler_b_id, winner_id, result_type, dual_meet_id, is_double_forfeit, wrestler_a_name_raw, wrestler_b_name_raw, school_a_id, school_b_id')
      .in('dual_meet_id', ids), 'history bouts')
    histBouts.sort((a: any, b: any) => {
      const da  = histMeetDateMap.get(String(a.dual_meet_id)) ?? ''
      const db2 = histMeetDateMap.get(String(b.dual_meet_id)) ?? ''
      return db2.localeCompare(da)
    })
  }

  const wrestlerHistBouts = new Map<string, Array<{ won: boolean; result_type: string }>>()
  const wrestlerHistNames = new Map<string, { name: string; school: string; school_id: number | null }>()
  for (const b of histBouts) {
    if (b.is_double_forfeit) continue
    for (const [wid, won, nameRaw, schId] of [
      [b.wrestler_a_id, b.winner_id === b.wrestler_a_id, b.wrestler_a_name_raw, b.school_a_id],
      [b.wrestler_b_id, b.winner_id === b.wrestler_b_id, b.wrestler_b_name_raw, b.school_b_id],
    ] as [string | null, boolean, string | null, number | null][]) {
      if (!wid) continue
      if (!wrestlerHistBouts.has(wid)) wrestlerHistBouts.set(wid, [])
      wrestlerHistBouts.get(wid)!.push({ won, result_type: b.result_type ?? '' })
      if (!wrestlerHistNames.has(wid) && nameRaw) {
        wrestlerHistNames.set(wid, { name: nameRaw, school: schId != null ? (histSchoolNameMap.get(schId) ?? '') : '', school_id: schId ?? null })
      }
    }
  }

  // ── Streaks ───────────────────────────────────────────────────────────────

  const wrestlerTodayBouts = new Map<string, Array<{ won: boolean; result_type: string }>>()
  for (const b of bouts.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))) {
    if (b.is_double_forfeit) continue
    for (const [wid, won] of [[b.wrestler_a_id, b.winner_id === b.wrestler_a_id], [b.wrestler_b_id, b.winner_id === b.wrestler_b_id]] as [string | null, boolean][]) {
      if (!wid) continue
      if (!wrestlerTodayBouts.has(wid)) wrestlerTodayBouts.set(wid, [])
      wrestlerTodayBouts.get(wid)!.push({ won, result_type: b.result_type ?? '' })
    }
  }

  function qualifies(bout: { won: boolean; result_type: string }, type: StreakKey): boolean {
    if (!bout.won) return false
    if (type === 'pin') return bout.result_type === PIN_TYPE
    if (type === 'tech') return bout.result_type === TECH_TYPE
    if (type === 'bonus') return BONUS_TYPES.has(bout.result_type)
    return true
  }

  const updatedStreaks = new Map<string, { len: number; startedOn: string | null }>()
  const snappedStreaks = new Map<string, { was: number; result_type: string }>()

  const allSeasonWrestlerIds = new Set<string>([...wrestlerHistBouts.keys(), ...wrestlerTodayBouts.keys()])

  for (const wid of allSeasonWrestlerIds) {
    for (const type of STREAK_KEYS) {
      const stateKey = `${wid}:${type}`
      const hist = wrestlerHistBouts.get(wid) ?? []
      let prevLen = 0
      for (const h of hist) {
        if (qualifies(h, type)) { prevLen++ }
        else { break }
      }
      const before = streakStateBefore.get(stateKey)
      const prevStart: string | null = prevLen > 0 ? (before?.started_on ?? null) : null
      const todayBouts = wrestlerTodayBouts.get(wid) ?? []
      let curLen = prevLen, curStart: string | null = prevStart, snapped = false, snapType = ''
      for (const bout of todayBouts) {
        if (qualifies(bout, type)) { if (curLen === 0) curStart = date; curLen++ }
        else { if (prevLen > 0 && !snapped) { snapped = true; snapType = bout.result_type } curLen = 0; curStart = null }
      }
      updatedStreaks.set(stateKey, { len: curLen, startedOn: curStart })
      if (type !== 'win' && snapped && prevLen >= 2) snappedStreaks.set(stateKey, { was: prevLen, result_type: snapType })
    }
  }

  function buildStreakRows(type: StreakKey): StreakRow[] {
    const rows: StreakRow[] = []
    for (const wid of allSeasonWrestlerIds) {
      const len = updatedStreaks.get(`${wid}:${type}`)?.len ?? 0
      if (len === 0) continue
      const info = wrestlerNames.get(wid) ?? wrestlerHistNames.get(wid)
      if (!info) continue
      rows.push({ wrestler_id: wid, wrestler_name: info.name, school_name: info.school, school_id: info.school_id, streak_len: len, season_high: len })
    }
    return rows.sort((a, b) => b.streak_len - a.streak_len).slice(0, 3)
  }

  function buildSnappedRows(type: Exclude<StreakKey, 'win'>): SnappedStreakRow[] {
    const rows: SnappedStreakRow[] = []
    for (const [key, { was, result_type }] of snappedStreaks) {
      if (!key.endsWith(`:${type}`)) continue
      const wid = key.replace(`:${type}`, '')
      const info = wrestlerNames.get(wid) ?? wrestlerHistNames.get(wid)
      if (!info) continue
      rows.push({ wrestler_id: wid, wrestler_name: info.name, school_name: info.school, school_id: info.school_id, streak_was: was, result_type })
    }
    return rows.sort((a, b) => b.streak_was - a.streak_was)
  }

  const streaksData: StreaksData = { pin: buildStreakRows('pin'), tech: buildStreakRows('tech'), bonus: buildStreakRows('bonus'), win: buildStreakRows('win') }
  const snappedData: SnappedData = { pin: buildSnappedRows('pin'), tech: buildSnappedRows('tech'), bonus: buildSnappedRows('bonus') }

  // ── Speed records ─────────────────────────────────────────────────────────

  function fastestFromBouts(boutList: typeof bouts, rt: string): SpeedRecord[] {
    const records: SpeedRecord[] = []
    for (const b of boutList) {
      if (b.result_type !== rt || !b.fall_time_seconds || b.fall_time_seconds < (rt === TECH_TYPE ? MIN_TECH_SEC : MIN_PIN_SEC)) continue
      const meet = meetMap.get(String(b.dual_meet_id))
      if (!meet) continue
      const isA = b.wrestler_a_id === b.winner_id
      const sch = (isA ? b.school_a_id : b.school_b_id) === meet.team1?.id ? meet.team1 : meet.team2
      records.push({ wrestler_id: b.winner_id ?? null, wrestler_name: isA ? (b.wrestler_a_name_raw ?? '') : (b.wrestler_b_name_raw ?? ''), school_name: sch?.display_name ?? '', opponent_name: isA ? (b.wrestler_b_name_raw ?? '') : (b.wrestler_a_name_raw ?? ''), fall_time_sec: b.fall_time_seconds, weight_class: b.weight_class, source: 'dual', season_high: false })
    }
    return records.sort((a, b) => a.fall_time_sec - b.fall_time_sec).slice(0, 3)
  }

  // ── Team stoppage stats ───────────────────────────────────────────────────

  const perMeetStatsBySchool = new Map<number, SchoolStats[]>()

  for (const m of teamMeets) {
    const mStats = new Map<number, SchoolStats>()
    const getMStats = (id: number, name: string): SchoolStats => {
      if (!mStats.has(id)) mStats.set(id, { school_id: id, school_name: name, pins: 0, pin_times: [], techs: 0, tech_times: [], bonus: 0, total_bouts: 0 })
      return mStats.get(id)!
    }
    for (const b of (boutsByMeet.get(String(m.id)) ?? [])) {
      if (b.is_double_forfeit) continue
      const winSchId  = b.winner_id === b.wrestler_a_id ? b.school_a_id : b.school_b_id
      const loseSchId = b.winner_id === b.wrestler_a_id ? b.school_b_id : b.school_a_id
      const winSch    = winSchId  === m.team1?.id ? m.team1 : m.team2
      const loseSch   = loseSchId === m.team1?.id ? m.team1 : m.team2
      if (!winSch || !loseSch) continue
      const ws = getMStats(winSch.id, winSch.display_name), ls = getMStats(loseSch.id, loseSch.display_name)
      ws.total_bouts++; ls.total_bouts++
      if (b.result_type === PIN_TYPE && b.fall_time_seconds > 0)  { ws.pins++;  ws.pin_times.push(b.fall_time_seconds) }
      if (b.result_type === TECH_TYPE)                             { ws.techs++; if (b.fall_time_seconds > 0) ws.tech_times.push(b.fall_time_seconds) }
      if (BONUS_TYPES.has(b.result_type)) ws.bonus++
    }
    for (const stats of mStats.values()) {
      if (!perMeetStatsBySchool.has(stats.school_id)) perMeetStatsBySchool.set(stats.school_id, [])
      perMeetStatsBySchool.get(stats.school_id)!.push(stats)
    }
  }

  function buildStoppageRows(schoolIds: Set<number>, key: 'pins' | 'techs' | 'combined'): TeamStoppageRow[] {
    const best = new Map<number, { stats: SchoolStats; count: number }>()
    for (const [schoolId, list] of perMeetStatsBySchool) {
      if (!schoolIds.has(schoolId)) continue
      for (const s of list) {
        const count = key === 'combined' ? s.pins + s.techs : s[key]
        const cur = best.get(schoolId)
        if (!cur || count > cur.count) best.set(schoolId, { stats: s, count })
      }
    }
    return [...best.values()]
      .filter(v => v.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(v => ({ school_id: v.stats.school_id, school_name: v.stats.school_name, count: v.count, avg_time_sec: key === 'combined' ? avg([...v.stats.pin_times, ...v.stats.tech_times]) : avg(key === 'pins' ? v.stats.pin_times : v.stats.tech_times) }))
  }

  function buildBonusPctRows(schoolIds: Set<number>): TeamBonusPctRow[] {
    const best = new Map<number, { stats: SchoolStats; pct: number }>()
    for (const [schoolId, list] of perMeetStatsBySchool) {
      if (!schoolIds.has(schoolId)) continue
      for (const s of list) {
        if (s.total_bouts === 0) continue
        const pct = s.bonus / s.total_bouts
        const cur = best.get(schoolId)
        if (!cur || pct > cur.pct) best.set(schoolId, { stats: s, pct })
      }
    }
    return [...best.values()]
      .filter(v => v.stats.total_bouts > 0)
      .sort((a, b) => { if (b.pct !== a.pct) return b.pct - a.pct; if (b.stats.pins !== a.stats.pins) return b.stats.pins - a.stats.pins; return b.stats.techs - a.stats.techs })
      .slice(0, 3)
      .map(v => ({ school_id: v.stats.school_id, school_name: v.stats.school_name, bonus_pct: v.pct, bonus_wins: v.stats.bonus, total_bouts: v.stats.total_bouts, pins: v.stats.pins, techs: v.stats.techs }))
  }

  // Today's team season-high candidates (same logic as boys compute)
  type TeamHighCandidate = { school_id: number; school_name: string; stat_key: string; best_value: number; avg_time_sec: number | null; bonus_wins: number | null; total_bouts: number | null; pins: number | null; techs: number | null }
  const todayTeamHighs: TeamHighCandidate[] = []

  for (const [schoolId, list] of perMeetStatsBySchool) {
    const name = list[0]?.school_name ?? ''
    let bPins = 0, bPinAvg: number | null = null
    for (const s of list) { const a = avg(s.pin_times); if (s.pins > bPins || (s.pins === bPins && a != null && (bPinAvg == null || a < bPinAvg))) { bPins = s.pins; bPinAvg = a } }
    if (bPins > 0) todayTeamHighs.push({ school_id: schoolId, school_name: name, stat_key: 'pins', best_value: bPins, avg_time_sec: bPinAvg, bonus_wins: null, total_bouts: null, pins: null, techs: null })
    let bTechs = 0, bTechAvg: number | null = null
    for (const s of list) { const a = avg(s.tech_times); if (s.techs > bTechs || (s.techs === bTechs && a != null && (bTechAvg == null || a < bTechAvg))) { bTechs = s.techs; bTechAvg = a } }
    if (bTechs > 0) todayTeamHighs.push({ school_id: schoolId, school_name: name, stat_key: 'techs', best_value: bTechs, avg_time_sec: bTechAvg, bonus_wins: null, total_bouts: null, pins: null, techs: null })
    let bComb = 0, bCombPins = 0, bCombTechs = 0, bCombAvg: number | null = null
    for (const s of list) { const c = s.pins + s.techs; const a = avg([...s.pin_times, ...s.tech_times]); if (c > bComb || (c === bComb && a != null && (bCombAvg == null || a < bCombAvg))) { bComb = c; bCombPins = s.pins; bCombTechs = s.techs; bCombAvg = a } }
    if (bComb > 0) todayTeamHighs.push({ school_id: schoolId, school_name: name, stat_key: 'combined', best_value: bComb, avg_time_sec: bCombAvg, bonus_wins: null, total_bouts: null, pins: bCombPins, techs: bCombTechs })
    let bPct = 0, bBonusWins = 0, bBonusBouts = 0, bBonusPins = 0, bBonusTechs = 0
    for (const s of list) { if (s.total_bouts === 0) continue; const p = s.bonus / s.total_bouts; if (p > bPct || (p === bPct && s.bonus > bBonusWins)) { bPct = p; bBonusWins = s.bonus; bBonusBouts = s.total_bouts; bBonusPins = s.pins; bBonusTechs = s.techs } }
    if (bBonusBouts > 0) todayTeamHighs.push({ school_id: schoolId, school_name: name, stat_key: 'bonus_pct', best_value: bPct, avg_time_sec: null, bonus_wins: bBonusWins, total_bouts: bBonusBouts, pins: bBonusPins, techs: bBonusTechs })
  }

  function teamScoreStats(ml: typeof meets): { single: TeamScoreRow | null; combined: TeamScoreRow | null; margin: TeamMarginRow | null } {
    let single: TeamScoreRow | null = null, combined: TeamScoreRow | null = null, margin: TeamMarginRow | null = null
    for (const m of ml) {
      const s1 = m.team1_score ?? 0, s2 = m.team2_score ?? 0
      const high = Math.max(s1, s2), comb = s1 + s2, gap = Math.abs(s1 - s2)
      const winner = high === s1 ? m.team1 : m.team2, loser = high === s1 ? m.team2 : m.team1
      if (!single   || high > single.score)   single   = { school_id: winner?.id ?? null, school_name: winner?.display_name ?? '', score: high, opponent: loser?.display_name ?? '', meet_score: fmtScore(s1, s2) }
      if (!combined || comb > combined.score) combined = { school_id: null, school_name: `${m.team1?.display_name ?? ''} vs ${m.team2?.display_name ?? ''}`, score: comb, opponent: '', meet_score: fmtScore(s1, s2) }
      if (!margin   || gap  > margin.margin)  margin   = { winner_school: winner?.display_name ?? '', loser_school: loser?.display_name ?? '', margin: gap, score: fmtScore(s1, s2), season_high: false }
    }
    return { single, combined, margin }
  }

  function finalBoutWins(ml: typeof meets): FinalBoutRow[] {
    const rows: FinalBoutRow[] = []
    for (const m of ml) {
      const s1 = m.team1_score ?? 0, s2 = m.team2_score ?? 0
      if (Math.abs(s1 - s2) > 6) continue
      const mb = (boutsByMeet.get(String(m.id)) ?? []).filter((b: any) => !b.is_double_forfeit).sort((a: any, b: any) => (b.order_index ?? 0) - (a.order_index ?? 0))
      if (mb.length === 0) continue
      const last = mb[0]
      const matchWinSchId = s1 > s2 ? m.team1?.id : m.team2?.id
      const boutWinSchId  = last.winner_id === last.wrestler_a_id ? last.school_a_id : last.school_b_id
      if (boutWinSchId !== matchWinSchId) continue
      const wSch = matchWinSchId === m.team1?.id ? m.team1 : m.team2, lSch = matchWinSchId === m.team1?.id ? m.team2 : m.team1
      const isA = last.wrestler_a_id === last.winner_id
      rows.push({ dual_meet_id: m.id, winning_school: wSch?.display_name ?? '', losing_school: lSch?.display_name ?? '', score: fmtScore(s1, s2), last_weight_class: last.weight_class, last_winner_name: isA ? (last.wrestler_a_name_raw ?? '') : (last.wrestler_b_name_raw ?? ''), last_result_type: last.result_type ?? '' })
    }
    return rows
  }

  function dualMatTimes(ml: typeof meets): DualMatTimeRow[] {
    return ml.filter(m => (boutsByMeet.get(String(m.id)) ?? []).filter((b: any) => !b.is_double_forfeit && !b.is_forfeit_win).length >= MIN_DUAL_CONTESTED).map(m => {
      const mb = boutsByMeet.get(String(m.id)) ?? []
      return { dual_meet_id: m.id, school1: m.team1?.display_name ?? '', school2: m.team2?.display_name ?? '', total_seconds: mb.reduce((s: number, b: any) => s + boutSeconds(b), 0), allotted_seconds: ALLOTTED_SEC, bout_count: mb.length, season_high: false }
    }).sort((a, b) => a.total_seconds - b.total_seconds).slice(0, 3)
  }

  // ── First career wins ─────────────────────────────────────────────────────

  const todayWinnerIds = [...new Set(bouts.filter(b => b.winner_id && !b.is_double_forfeit && !b.is_forfeit_win).map((b: any) => b.winner_id as string))]
  let firstWins: FirstWinRow[] = [], firstMatches: FirstWinRow[] = []

  if (todayWinnerIds.length > 0) {
    const career = await inChunks(todayWinnerIds, ids => db.from('wrestler_match_score_log').select('wrestler_id, is_winner').lt('match_date', date).in('wrestler_id', ids), 'career log')
    const careerWins = new Map<string, number>(), careerLosses = new Map<string, number>()
    for (const r of career) {
      if (r.is_winner) careerWins.set(r.wrestler_id, (careerWins.get(r.wrestler_id) ?? 0) + 1)
      else             careerLosses.set(r.wrestler_id, (careerLosses.get(r.wrestler_id) ?? 0) + 1)
    }
    for (const b of bouts) {
      if (!b.winner_id || b.is_double_forfeit || b.is_forfeit_win || (careerWins.get(b.winner_id) ?? 0) > 0) continue
      const meet = meetMap.get(String(b.dual_meet_id))
      if (!meet) continue
      const isA = b.wrestler_a_id === b.winner_id
      const winSchId = isA ? b.school_a_id : b.school_b_id
      const winSch   = winSchId === meet.team1?.id ? meet.team1 : meet.team2
      const oppId    = isA ? b.wrestler_b_id : b.wrestler_a_id
      const row: FirstWinRow = { wrestler_id: b.winner_id, wrestler_name: isA ? (b.wrestler_a_name_raw ?? '') : (b.wrestler_b_name_raw ?? ''), school_name: winSch?.display_name ?? '', school_id: winSchId ?? null, weight_class: b.weight_class, opponent_name: isA ? (b.wrestler_b_name_raw ?? '') : (b.wrestler_a_name_raw ?? ''), opponent_hammer: hammerMap.get(oppId) ?? 0, result_type: b.result_type ?? '', truly_first_match: (careerLosses.get(b.winner_id) ?? 0) === 0 }
      firstWins.push(row)
      if (row.truly_first_match) firstMatches.push(row)
    }
    firstWins.sort((a, b) => b.opponent_hammer - a.opponent_hammer)
    firstMatches.sort((a, b) => b.opponent_hammer - a.opponent_hammer)
  }

  // ── Rankings (girls) ──────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const publishedRankings: any[] = must(teamRankingsRes, 'teamRankings')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latestRanking = new Map<string, any>()
  for (const rp of publishedRankings) { const key = `${rp.scope}:${rp.scope_id ?? ''}`; if (!latestRanking.has(key)) latestRanking.set(key, rp) }

  const SECTION_SCOPE_TO_DB: Record<Exclude<SectionScope, 'state'>, string> = { north_i: 'North I', north_ii: 'North II', central: 'Central', south: 'South' }

  function getTop25Teams(scope: SectionScope): TeamRankEntry[] {
    const supaScope = scope === 'state' ? 'state' : 'section', supaId = scope === 'state' ? '' : SECTION_SCOPE_TO_DB[scope]
    const rpRow = latestRanking.get(`${supaScope}:${supaId}`)
    if (!rpRow) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((rpRow.results ?? []) as any[]).slice(0, 25).map(r => {
      const meet = meets.find(m => m.team1?.id === r.school_id || m.team2?.id === r.school_id)
      let meetResult: string | null = null
      if (meet) { const isT1 = meet.team1?.id === r.school_id, my = isT1 ? (meet.team1_score ?? 0) : (meet.team2_score ?? 0), opp = isT1 ? (meet.team2_score ?? 0) : (meet.team1_score ?? 0), oppN = isT1 ? (meet.team2?.display_name ?? '') : (meet.team1?.display_name ?? ''); meetResult = `${my > opp ? 'W' : my < opp ? 'L' : 'T'} ${my}–${opp} vs ${oppN}` }
      return { rank: r.rank, school_id: r.school_id, school_name: r.label ?? '', score: r.score, meet_result: meetResult }
    })
  }

  function getTeamRankState(schoolId: number): number | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((latestRanking.get('state:')?.results ?? []) as any[]).find((r: any) => r.school_id === schoolId)?.rank ?? null
  }

  const teamUpsets: TeamUpsetRow[] = []
  for (const m of teamMeets) {
    const s1 = m.team1_score ?? 0, s2 = m.team2_score ?? 0
    if (s1 === s2) continue
    const wSch = s1 > s2 ? m.team1 : m.team2, lSch = s1 > s2 ? m.team2 : m.team1
    if (!wSch || !lSch) continue
    const wRank = getTeamRankState(wSch.id), lRank = getTeamRankState(lSch.id)
    if (wRank == null || lRank == null || lRank >= wRank) continue
    teamUpsets.push({ winner_school_id: wSch.id, winner_school_name: wSch.display_name, winner_rank: wRank, loser_school_id: lSch.id, loser_school_name: lSch.display_name, loser_rank: lRank, score: fmtScore(Math.max(s1, s2), Math.min(s1, s2)), rank_gap: wRank - lRank })
  }
  teamUpsets.sort((a, b) => (a.loser_rank ?? 99) - (b.loser_rank ?? 99))

  // ── Tournaments ───────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tournaments: any[] = must(tourneyRes, 'tourney')
  const tourIds = tournaments.map(t => t.id as string)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tourBouts: any[] = [], tourSeeds: any[] = []

  if (tourIds.length > 0) {
    const [tbRes, tsRes] = await Promise.all([
      db.from('tournament_bouts_girls').select('id, in_season_tournament_id, weight_class, round, wrestler1_id, wrestler2_id, wrestler1_name_raw, wrestler2_name_raw, wrestler1_school_raw, wrestler2_school_raw, winner, result_type, fall_time_seconds').in('in_season_tournament_id', tourIds),
      db.from('in_season_tournament_seeds_girls').select('in_season_tournament_id, weight_class, seed, wrestler_id, wrestler_name_raw').in('in_season_tournament_id', tourIds),
    ])
    tourBouts = must(tbRes, 'tb')
    tourSeeds = must(tsRes, 'ts')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tourBoutsByTour = new Map<string, any[]>()
  for (const b of tourBouts) { if (!tourBoutsByTour.has(b.in_season_tournament_id)) tourBoutsByTour.set(b.in_season_tournament_id, []); tourBoutsByTour.get(b.in_season_tournament_id)!.push(b) }

  const tourBoutById = new Map<string, typeof tourBouts[0]>()
  for (const b of tourBouts) tourBoutById.set(b.id, b)

  const wrestlerSeedMap = new Map<string, number>()
  for (const s of tourSeeds) { if (s.wrestler_id) wrestlerSeedMap.set(`${s.in_season_tournament_id}:${s.wrestler_id}`, s.seed) }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const champMap = new Map<string, any>()
  for (const [tourId, tb] of tourBoutsByTour) { for (const b of tb.filter((b: any) => /final|champ/i.test(b.round ?? ''))) champMap.set(`${tourId}:${b.weight_class}`, b) }

  const champRows: TournamentChampRow[] = [], lowestSeedWins: LowestSeedWinRow[] = []
  for (const [key, cb] of champMap) {
    const [tourId] = key.split(':')
    const tour = tournaments.find(t => t.id === tourId)
    if (!tour || cb.winner == null) continue
    const champWrId = cb.winner === 1 ? cb.nj_wrestler1_id : cb.nj_wrestler2_id
    const champName = cb.winner === 1 ? (cb.wrestler1_name_raw ?? '') : (cb.wrestler2_name_raw ?? '')
    const champSch  = cb.winner === 1 ? (cb.wrestler1_school_raw ?? '') : (cb.wrestler2_school_raw ?? '')
    let combinedOppHammer = 0
    for (const b of (tourBoutsByTour.get(tourId) ?? [])) { const isW1 = b.nj_wrestler1_id === champWrId, isW2 = b.nj_wrestler2_id === champWrId; if (!isW1 && !isW2) continue; combinedOppHammer += hammerMap.get(isW1 ? b.nj_wrestler2_id : b.nj_wrestler1_id) ?? 0 }
    champRows.push({ tournament_id: tourId, tournament_name: tour.name, weight_class: cb.weight_class, wrestler_id: champWrId ?? null, wrestler_name: champName, school_name: champSch, combined_opp_hammer: combinedOppHammer })
    const seed = champWrId ? (wrestlerSeedMap.get(`${tourId}:${champWrId}`) ?? null) : null
    if (seed != null) lowestSeedWins.push({ tournament_id: tourId, tournament_name: tour.name, weight_class: cb.weight_class, wrestler_id: champWrId ?? null, wrestler_name: champName, school_name: champSch, seed })
  }
  champRows.sort((a, b) => b.combined_opp_hammer - a.combined_opp_hammer)
  lowestSeedWins.sort((a, b) => b.seed - a.seed)

  const matTimes: TournamentMatTimeRow[] = tournaments.map(t => { const tb = tourBoutsByTour.get(t.id) ?? []; const total = tb.reduce((s: number, b: any) => s + boutSeconds(b), 0); return { tournament_id: t.id, tournament_name: t.name, total_seconds: total, bout_count: tb.length, avg_seconds: tb.length > 0 ? Math.round(total / tb.length) : 0 } })

  let biggestTourUpset: TournamentBiggestUpset | null = null
  if (tourIds.length > 0) {
    const tourLogRes = await db.from('wrestler_match_score_log').select('wrestler_id, pre_match_hammer, opponent_pre_match_hammer, is_winner, source_id').eq('match_date', date).eq('season', season).eq('gender', 'F').eq('match_source', 'tournament_bout')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tPairs = new Map<string, { winner: any; loser: any }>()
    for (const e of must(tourLogRes, 'tourLog')) { if (!tPairs.has(e.source_id)) tPairs.set(e.source_id, { winner: null, loser: null }); const p = tPairs.get(e.source_id)!; if (e.is_winner) p.winner = e; else p.loser = e }
    for (const [boutId, pair] of tPairs) {
      if (!pair.winner || !pair.loser || pair.loser.pre_match_hammer <= pair.winner.pre_match_hammer) continue
      const gap = pair.loser.pre_match_hammer - pair.winner.pre_match_hammer
      if (!biggestTourUpset || gap > biggestTourUpset.gap) { const b = tourBoutById.get(boutId); if (!b) continue; const tour = tournaments.find(t => t.id === b.in_season_tournament_id); const w1 = b.winner === 1; biggestTourUpset = { tournament_id: b.in_season_tournament_id, tournament_name: tour?.name ?? '', weight_class: b.weight_class, winner_name: w1 ? (b.wrestler1_name_raw ?? '') : (b.wrestler2_name_raw ?? ''), winner_school: w1 ? (b.wrestler1_school_raw ?? '') : (b.wrestler2_school_raw ?? ''), loser_name: w1 ? (b.wrestler2_name_raw ?? '') : (b.wrestler1_name_raw ?? ''), loser_school: w1 ? (b.wrestler2_school_raw ?? '') : (b.wrestler1_school_raw ?? ''), gap, winner_hammer: pair.winner.pre_match_hammer, loser_hammer: pair.loser.pre_match_hammer, result_type: b.result_type ?? '' } }
    }
  }

  const tournamentsData: TournamentsData = { top_champs: champRows.slice(0, 10), lowest_seed_wins: lowestSeedWins, mat_times: matTimes, biggest_upset: biggestTourUpset }

  // ── Assemble per-section views ────────────────────────────────────────────

  function buildSection(scope: SectionScope): SectionData {
    const isState = scope === 'state'
    const secMeets = isState ? meets : meets.filter(m => schoolScopeMap.get(m.team1?.id) === scope || schoolScopeMap.get(m.team2?.id) === scope)
    const secMeetIds = new Set(secMeets.map(m => String(m.id)))
    const secBouts   = isState ? bouts : bouts.filter(b => secMeetIds.has(String(b.dual_meet_id)))
    const secSchIds  = new Set<number>()
    for (const m of secMeets) { if (m.team1?.id) secSchIds.add(m.team1.id); if (m.team2?.id) secSchIds.add(m.team2.id) }
    const secWrIds = new Set<string>()
    for (const b of secBouts) { if (b.wrestler_a_id) secWrIds.add(b.wrestler_a_id); if (b.wrestler_b_id) secWrIds.add(b.wrestler_b_id) }

    function filterRated<T extends RatedMatchRow>(rows: T[]): T[] {
      if (isState) return rows
      return rows.filter(r => !!bouts.find(bo => bo.winner_id === r.winner_id && bo.result_type === r.result_type && bo.weight_class === r.weight_class && secMeetIds.has(bo.dual_meet_id)))
    }

    const secTeamMeets = secMeets.filter(isTeamDual)
    const { single, combined, margin } = teamScoreStats(secTeamMeets)

    return {
      streaks:  { pin: isState ? streaksData.pin : streaksData.pin.filter(r => secWrIds.has(r.wrestler_id)), tech: isState ? streaksData.tech : streaksData.tech.filter(r => secWrIds.has(r.wrestler_id)), bonus: isState ? streaksData.bonus : streaksData.bonus.filter(r => secWrIds.has(r.wrestler_id)), win: isState ? streaksData.win : streaksData.win.filter(r => secWrIds.has(r.wrestler_id)) },
      snapped:  { pin: isState ? snappedData.pin : snappedData.pin.filter(r => secWrIds.has(r.wrestler_id)), tech: isState ? snappedData.tech : snappedData.tech.filter(r => secWrIds.has(r.wrestler_id)), bonus: isState ? snappedData.bonus : snappedData.bonus.filter(r => secWrIds.has(r.wrestler_id)) },
      top_rated_matches:    filterRated(allRatedSorted).slice(0, 10),
      top_rated_upsets:     filterRated(allUpsetsByLoser).slice(0, 10),
      top_upsets_by_gap:    filterRated(allUpsetsByGap).slice(0, 10),
      top25_teams:          getTop25Teams(scope),
      team_upsets:          isState ? teamUpsets : teamUpsets.filter(u => secSchIds.has(u.winner_school_id) || secSchIds.has(u.loser_school_id)),
      final_bout_wins:      finalBoutWins(secTeamMeets),
      fastest_pin:          fastestFromBouts(secBouts, PIN_TYPE),
      fastest_tech:         fastestFromBouts(secBouts, TECH_TYPE),
      team_pins:            buildStoppageRows(secSchIds, 'pins'),
      team_techs:           buildStoppageRows(secSchIds, 'techs'),
      team_combined_stops:  buildStoppageRows(secSchIds, 'combined'),
      team_bonus_pct:       buildBonusPctRows(secSchIds),
      most_points_single:   single,
      most_points_combined: combined,
      largest_margin:       margin,
      first_career_wins:    isState ? firstWins : firstWins.filter(f => f.school_id != null && secSchIds.has(f.school_id!)),
      first_career_matches: isState ? firstMatches : firstMatches.filter(f => f.school_id != null && secSchIds.has(f.school_id!)),
      fastest_duals:        dualMatTimes(secTeamMeets),
    }
  }

  // ── Season highs ─────────────────────────────────────────────────────────

  const seasonHighUpdates: SeasonHighs = {}
  function maybeHigh(key: string, value: number | null | undefined, context: Record<string, unknown>) {
    if (value == null) return
    seasonHighUpdates[key] = { value, context, set_on: date }
  }

  const globalPins = fastestFromBouts(bouts, PIN_TYPE), globalTechs = fastestFromBouts(bouts, TECH_TYPE)
  const { single: gSingle, combined: gCombined, margin: gMargin } = teamScoreStats(teamMeets)
  const gDuals = dualMatTimes(teamMeets)

  maybeHigh('fastest_pin',         globalPins[0]?.fall_time_sec,  { wrestler: globalPins[0]?.wrestler_name,  school: globalPins[0]?.school_name })
  maybeHigh('fastest_tech',        globalTechs[0]?.fall_time_sec, { wrestler: globalTechs[0]?.wrestler_name, school: globalTechs[0]?.school_name })
  maybeHigh('largest_margin',      gMargin?.margin,           { winner: gMargin?.winner_school, loser: gMargin?.loser_school })
  maybeHigh('most_points_single',  gSingle?.score,            { school: gSingle?.school_name })
  maybeHigh('most_points_combined', gCombined?.score,         { matchup: gCombined?.school_name })
  maybeHigh('fastest_dual',        gDuals[0]?.total_seconds,  { school1: gDuals[0]?.school1, school2: gDuals[0]?.school2 })
  for (const type of STREAK_KEYS) { const rows = streaksData[type]; if (rows.length > 0) maybeHigh(`longest_${type}_streak`, rows[0].streak_len, { wrestler: rows[0].wrestler_name, school: rows[0].school_name }) }

  return {
    payload: { date, season, state: buildSection('state'), north_i: buildSection('north_i'), north_ii: buildSection('north_ii'), central: buildSection('central'), south: buildSection('south'), tournaments: tournamentsData },
    seasonHighUpdates,
    updatedStreaks,
    todayTeamHighs,
  }
}

export function buildStreakStateUpsertsGirls(updatedStreaks: Map<string, { len: number; startedOn: string | null }>, season: string, date: string) {
  return [...updatedStreaks.entries()].map(([key, { len, startedOn }]) => {
    const [wrestler_id, streak_type] = key.split(':')
    return { wrestler_id, season, streak_type, current_len: len, started_on: startedOn, last_updated: date }
  })
}
