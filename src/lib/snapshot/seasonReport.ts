// End-of-season Snap Shot (Kyle 2026-11-11): one report per side and season, saved when the season is over.
//   totals      schools, wrestlers, matches (duals incl. jamboree pairings, in-season tournaments, postseason)
//               and how they ended; NJSIAA vs non-NJSIAA (is_nj = false: out of state and NJ non-members)
//   bests       the daily reports' categories over the whole season, from the saved daily Snap Shots (state view)
//   postseason  district entrants, region and state qualifiers, state placers and champions
// Boys and girls read only their own tables.
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  SnapshotPayload, SpeedRecord, DualMatTimeRow, RatedMatchRow, UpsetByGapRow, TeamUpsetRow, TeamScoreRow,
  TeamMarginRow, TournamentChampRow, LowestSeedWinRow, TournamentBiggestUpset, TournamentMatTimeRow,
  TeamRankEntry, TeamSeasonHighRow, FinalBoutRow,
} from './types'

import { RESULT_ORDER, resultCategory, type ResultCategory } from './results'
export { RESULT_ORDER, resultCategory, type ResultCategory }
type Counts = Partial<Record<ResultCategory, number>>
type Dated<T> = T & { date: string }

export type StreakLeader = { wrestler_id: string; wrestler_name: string; school_name: string; streak_len: number; date: string }
// A streak still running when the season ended, held by a wrestler who isn't graduating (Kyle 2026-11-11)
export type ActiveStreak = { wrestler_id: string; wrestler_name: string; school_name: string; streak_len: number; started_on: string | null; class_year: number | null }
// Toughest schedule: average opponent rating going into each rated bout of the season (Kyle 2026-11-11)
export type ToughSchedule = { wrestler_id: string; wrestler_name: string; school_name: string; avg_opp: number; matches: number; wins: number; losses: number }
export const TOUGH_MIN_MATCHES = 15
export type Champion = { weight: number; wrestler_id: string | null; wrestler_name: string; school_id: number | null; school_name: string }

export type SeasonReport = {
  season: string
  gender: 'M' | 'F'
  totals: {
    schools_nj: number; schools_other: number; wrestlers_nj: number; wrestlers_other: number
    matches: number; not_counted: number
    events?: { duals: number; jamborees: number; jamboree_pairings: number; tournaments: number; postseason: { district: number; region: number; state: number } }
    by_source: { duals: Counts; tournaments: Counts; postseason: Counts }
    by_result: Counts
  }
  vs_non_njsiaa: { matches: number; opponents: number; wins: number; losses: number; won: Counts; lost: Counts }
  postseason: {
    district_entrants: number; district_schools: number; region_qualifiers: number; state_qualifiers: number
    state_placers: number; district_champions: number; region_champions: number; state_champions: Champion[]
  }
  bests: {
    daily_reports: number
    fastest_pins: Dated<SpeedRecord>[]; fastest_techs: Dated<SpeedRecord>[]; fastest_duals: Dated<DualMatTimeRow>[]
    top_rated_matches: Dated<RatedMatchRow>[]; top_rated_upsets: Dated<RatedMatchRow>[]; upsets_by_gap: Dated<UpsetByGapRow>[]; upsets_by_gap_unrated?: Dated<UpsetByGapRow>[]
    team_upsets: Dated<TeamUpsetRow>[]
    most_points_single: Dated<TeamScoreRow>[]; most_points_combined: Dated<TeamScoreRow>[]; largest_margins: Dated<TeamMarginRow>[]
    final_bout_wins: number; closest_final_bout_wins: Dated<FinalBoutRow>[]
    first_career_wins: number; first_career_matches: number
    streaks: { win: StreakLeader[]; pin: StreakLeader[]; tech: StreakLeader[]; bonus: StreakLeader[] }
    active_streaks?: { win: ActiveStreak[]; pin: ActiveStreak[]; tech: ActiveStreak[]; bonus: ActiveStreak[] }
    toughest_schedules?: ToughSchedule[]
    team_highs: { pins: TeamSeasonHighRow[]; techs: TeamSeasonHighRow[]; combined: TeamSeasonHighRow[]; bonus_pct: TeamSeasonHighRow[] }
    tournament_champs: Dated<TournamentChampRow>[]; lowest_seed_wins: Dated<LowestSeedWinRow>[]
    tournament_upsets: Dated<TournamentBiggestUpset>[]; tournament_upsets_unrated?: Dated<TournamentBiggestUpset>[]; tournament_mat_times: Dated<TournamentMatTimeRow>[]
    final_top25: TeamRankEntry[]; final_top25_date: string | null
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function all(db: Db, t: string, cols: string, f?: (q: any) => any): Promise<any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any[] = []
  for (let i = 0; ; i += 1000) {
    let q = db.from(t).select(cols).order('id').range(i, i + 999)
    if (f) q = f(q)
    const { data, error } = await q
    if (error) throw new Error(`${t}: ${error.message}`)
    out.push(...(data ?? []))
    if ((data ?? []).length < 1000) return out
  }
}
const sum = (c: Counts) => RESULT_ORDER.reduce((n, k) => n + (c[k] ?? 0), 0)
const bump = (c: Counts, k: ResultCategory) => { c[k] = (c[k] ?? 0) + 1 }

export async function buildSeasonReport(db: Db, gender: 'M' | 'F', seasonId: number): Promise<SeasonReport> {
  const girls = gender === 'F'
  const { data: seasonRow, error: sErr } = await db.from('seasons').select('id, label').eq('id', seasonId).single()
  if (sErr || !seasonRow) throw new Error(`season ${seasonId} not found`)
  const label = seasonRow.label as string

  const schoolNj = new Map((await all(db, 'schools', 'id, is_nj')).map(s => [s.id as number, s.is_nj as boolean]))
  const wrestlerOos = new Map((await all(db, 'wrestlers', 'id, is_oos')).map(w => [w.id as string, w.is_oos as boolean]))

  // ── totals and NJSIAA vs non-NJSIAA ──────────────────────────────────────────
  const by_source = { duals: {} as Counts, tournaments: {} as Counts, postseason: {} as Counts }
  let not_counted = 0
  const schools = new Set<number>(), wrestlers = new Set<string>()
  const vs = { won: {} as Counts, lost: {} as Counts, opponents: new Set<number>() }
  const cross = (c: ResultCategory, s1: number | null, s2: number | null, winSide: 1 | 2 | null) => {
    if (!s1 || !s2 || !winSide) return
    const nj1 = schoolNj.get(s1) === true, nj2 = schoolNj.get(s2) === true
    if (nj1 === nj2) return
    bump((winSide === 1) === nj1 ? vs.won : vs.lost, c)
    vs.opponents.add(nj1 ? s2 : s1)
  }
  const seen = (s: (number | null)[], w: (string | null)[]) => { for (const x of s) if (x) schools.add(x); for (const x of w) if (x) wrestlers.add(x) }

  const meets = await all(db, girls ? 'dual_meets_girls' : 'dual_meets', 'id, jamboree_id', q => q.eq('season_id', seasonId))
  const meetIds = new Set(meets.map(m => m.id))
  const jamboreeOf = new Map(meets.map(m => [m.id, m.jamboree_id as number | null]))
  const meetsWrestled = new Set<number>(), tournamentsWrestled = new Set<number>(), postseasonWrestled = new Set<number>()
  for (const b of await all(db, girls ? 'dual_meet_matches_girls' : 'dual_meet_matches', 'id, dual_meet_id, result_type, is_double_forfeit, wrestler_a_id, wrestler_b_id, school_a_id, school_b_id, winner_id, team1_points, team2_points')) {
    if (!meetIds.has(b.dual_meet_id)) continue
    const c = resultCategory(b.result_type, b.is_double_forfeit)
    if (!c) { not_counted++; continue }
    bump(by_source.duals, c)
    meetsWrestled.add(b.dual_meet_id)
    seen([b.school_a_id, b.school_b_id], [b.wrestler_a_id, b.wrestler_b_id])
    const ws = b.winner_id ? (b.winner_id === b.wrestler_a_id ? 1 : b.winner_id === b.wrestler_b_id ? 2 : null) : b.team1_points > 0 ? 1 : b.team2_points > 0 ? 2 : null
    cross(c, b.school_a_id, b.school_b_id, ws)
  }
  const istIds = new Set((await all(db, girls ? 'in_season_tournaments_girls' : 'in_season_tournaments', 'id', q => q.eq('season', label))).map(t => t.id))
  for (const b of await all(db, girls ? 'tournament_bouts_girls' : 'tournament_bouts', 'id, in_season_tournament_id, result_type, winner, wrestler1_id, wrestler2_id, wrestler1_school_id, wrestler2_school_id')) {
    if (!istIds.has(b.in_season_tournament_id)) continue
    const c = resultCategory(b.result_type)
    if (!c) { not_counted++; continue }
    bump(by_source.tournaments, c)
    tournamentsWrestled.add(b.in_season_tournament_id)
    seen([b.wrestler1_school_id, b.wrestler2_school_id], [b.wrestler1_id, b.wrestler2_id])
    cross(c, b.wrestler1_school_id, b.wrestler2_school_id, b.winner === 1 ? 1 : b.winner === 2 ? 2 : null)
  }

  // ── postseason ───────────────────────────────────────────────────────────────
  const pts = await all(db, 'tournaments', 'id, tournament_type', q => q.eq('season_id', seasonId).eq('gender', gender))
  const level = new Map(pts.map(t => [t.id as number, t.tournament_type === 'districts' ? 'district' : /regions/.test(t.tournament_type) ? 'region' : /_state$/.test(t.tournament_type) ? 'state' : 'other']))
  const entries = new Map((await all(db, 'tournament_entries', 'id, tournament_id, wrestler_id, school_id')).filter(e => level.has(e.tournament_id)).map(e => [e.id, e]))
  for (const m of await all(db, 'matches', 'id, tournament_id, win_type, winner_entry_id, loser_entry_id')) {
    if (!level.has(m.tournament_id)) continue
    const c = resultCategory(m.win_type)
    if (!c) { not_counted++; continue }
    bump(by_source.postseason, c)
    postseasonWrestled.add(m.tournament_id)
    const a = entries.get(m.winner_entry_id), b = entries.get(m.loser_entry_id)
    seen([a?.school_id, b?.school_id], [a?.wrestler_id, b?.wrestler_id])
  }
  const atLevel = (lv: string) => [...entries.values()].filter(e => level.get(e.tournament_id) === lv && e.wrestler_id)
  const distinct = <T,>(xs: T[]) => new Set(xs).size
  const weights = new Map((await all(db, 'weight_classes', 'id, weight')).map(w => [w.id as number, w.weight as number]))
  const placements = (await all(db, 'placements', 'id, tournament_id, weight_class_id, place, entry_id')).filter(p => level.has(p.tournament_id))
  const champsAt = (lv: string) => placements.filter(p => p.place === 1 && level.get(p.tournament_id) === lv)
  const stateChamps = champsAt('state').map(p => entries.get(p.entry_id)).filter(Boolean)
  const champIds = stateChamps.map(e => e.wrestler_id).filter(Boolean)
  const { data: champWrestlers } = champIds.length ? await db.from('wrestlers').select('id, first_name, last_name').in('id', champIds) : { data: [] }
  const champSchoolIds = stateChamps.map(e => e.school_id).filter(Boolean)
  const { data: champSchools } = champSchoolIds.length ? await db.from('schools').select('id, display_name').in('id', champSchoolIds) : { data: [] }
  const wName = new Map((champWrestlers ?? []).map(w => [w.id, `${w.first_name} ${w.last_name}`]))
  const sName = new Map((champSchools ?? []).map(s => [s.id, s.display_name]))
  const state_champions: Champion[] = champsAt('state').map(p => {
    const e = entries.get(p.entry_id)
    return { weight: weights.get(p.weight_class_id) ?? 0, wrestler_id: e?.wrestler_id ?? null, wrestler_name: wName.get(e?.wrestler_id) ?? 'TBD', school_id: e?.school_id ?? null, school_name: sName.get(e?.school_id) ?? 'TBD' }
  }).sort((a, b) => a.weight - b.weight)

  const by_result: Counts = {}
  for (const src of Object.values(by_source)) for (const k of RESULT_ORDER) if (src[k]) by_result[k] = (by_result[k] ?? 0) + src[k]!

  // ── season bests from the saved daily reports ────────────────────────────────
  const { data: daily, error: dErr } = await db.from(girls ? 'snapshot_reports_girls' : 'snapshot_reports')
    .select('report_date, payload').eq('season', label).order('report_date')
  if (dErr) throw new Error(`daily reports: ${dErr.message}`)
  const days = (daily ?? []) as { report_date: string; payload: SnapshotPayload }[]
  function collect<T>(pick: (p: SnapshotPayload) => T[] | T | null | undefined): Dated<T>[] {
    const out: Dated<T>[] = []
    for (const d of days) { const v = pick(d.payload); for (const x of Array.isArray(v) ? v : v ? [v] : []) out.push({ ...(x as T), date: d.report_date }) }
    return out
  }
  const top = <T,>(xs: T[], key: (x: T) => number, n: number, asc = false, id?: (x: T) => string) => {
    const keep = new Map<string, T>()
    xs.forEach((x, i) => { const k = id ? id(x) : String(i); const prev = keep.get(k); if (!prev || (asc ? key(x) < key(prev) : key(x) > key(prev))) keep.set(k, x) })
    return [...keep.values()].sort((a, b) => asc ? key(a) - key(b) : key(b) - key(a)).slice(0, n)
  }
  const bout = (x: { wrestler_name?: string; winner_name?: string; loser_name?: string; opponent_name?: string; date: string }) => `${x.date}|${x.wrestler_name ?? x.winner_name}|${x.opponent_name ?? x.loser_name}`
  const streakLeaders = (kind: 'win' | 'pin' | 'tech' | 'bonus') => {
    const best = new Map<string, StreakLeader>()
    for (const d of days) for (const r of d.payload.state?.streaks?.[kind] ?? []) {
      const len = Math.max(r.streak_len, r.season_high ?? 0)
      const prev = best.get(r.wrestler_id)
      if (!prev || len > prev.streak_len) best.set(r.wrestler_id, { wrestler_id: r.wrestler_id, wrestler_name: r.wrestler_name, school_name: r.school_name, streak_len: len, date: d.report_date })
    }
    return [...best.values()].sort((a, b) => b.streak_len - a.streak_len).slice(0, 10)
  }
  // Streaks carried into next season: the saved streak state after the last day, minus the class graduating
  // this season (graduation_year <= the season's end year); a wrestler with no class year stays in
  const running: { wrestler_id: string; streak_type: 'win' | 'pin' | 'tech' | 'bonus'; current_len: number; started_on: string | null }[] = []
  for (let i = 0; ; i += 1000) {
    const { data, error } = await db.from(girls ? 'snapshot_streak_state_girls' : 'snapshot_streak_state').select('wrestler_id, streak_type, current_len, started_on')
      .eq('season', label).gt('current_len', 0).order('wrestler_id').order('streak_type').range(i, i + 999)
    if (error) throw new Error(`streak state: ${error.message}`)
    running.push(...(data ?? []))
    if ((data ?? []).length < 1000) break
  }
  const STREAK_KINDS = ['win', 'pin', 'tech', 'bonus'] as const
  const candidates = STREAK_KINDS.flatMap(k => running.filter(r => r.streak_type === k).sort((a, b) => b.current_len - a.current_len).slice(0, 60))
  // Toughest schedules: every rated bout of the season in the rating log (the log also holds the previous
  // postseason, which seeds starting ratings, so only Nov 1 – Mar 31 of this season counts)
  const logRows = await all(db, 'wrestler_match_score_log', 'id, wrestler_id, opponent_pre_match_hammer, is_winner', q => q
    .eq('season', label).eq('gender', gender).gte('match_date', `${seasonId - 1}-11-01`).lte('match_date', `${seasonId}-03-31`))
  const sched = new Map<string, { sum: number; n: number; w: number }>()
  for (const r of logRows) {
    if (r.opponent_pre_match_hammer == null) continue
    const x = sched.get(r.wrestler_id) ?? { sum: 0, n: 0, w: 0 }
    x.sum += Number(r.opponent_pre_match_hammer); x.n++; if (r.is_winner) x.w++
    sched.set(r.wrestler_id, x)
  }
  const toughTop = [...sched].filter(([, x]) => x.n >= TOUGH_MIN_MATCHES).sort((a, b) => b[1].sum / b[1].n - a[1].sum / a[1].n).slice(0, 10)

  // Names, schools (the wrestler's school on their season rating) and class years
  const who = new Map<string, { name: string; school: string; class_year: number | null }>()
  const ids = [...new Set([...candidates.map(r => r.wrestler_id), ...toughTop.map(([id]) => id)])]
  for (let i = 0; i < ids.length; i += 150) {
    const chunk = ids.slice(i, i + 150)
    const [{ data: ws, error: e1 }, { data: hs, error: e2 }] = await Promise.all([
      db.from('wrestlers').select('id, first_name, last_name, graduation_year').in('id', chunk),
      db.from('wrestler_hammer_scores').select('wrestler_id, school_id').eq('season', label).eq('gender', gender).in('wrestler_id', chunk),
    ])
    if (e1 || e2) throw new Error(`report wrestlers: ${(e1 ?? e2)!.message}`)
    const schoolOf = new Map((hs ?? []).map(h => [h.wrestler_id as string, h.school_id as number | null]))
    const sids = [...new Set([...schoolOf.values()].filter((x): x is number => x != null))]
    const { data: ss } = sids.length ? await db.from('schools').select('id, display_name').in('id', sids) : { data: [] }
    const schoolName = new Map((ss ?? []).map(s => [s.id as number, s.display_name as string]))
    for (const w of ws ?? []) {
      const sid = schoolOf.get(w.id)
      who.set(w.id, { name: `${w.first_name ?? ''} ${w.last_name ?? ''}`.trim(), school: sid != null ? (schoolName.get(sid) ?? '') : '', class_year: w.graduation_year ?? null })
    }
  }
  const toughestSchedules: ToughSchedule[] = toughTop.filter(([id]) => who.has(id)).map(([id, x]) => ({
    wrestler_id: id, wrestler_name: who.get(id)!.name, school_name: who.get(id)!.school,
    avg_opp: Math.round((x.sum / x.n) * 100) / 100, matches: x.n, wins: x.w, losses: x.n - x.w,
  }))
  const activeStreaks = (kind: typeof STREAK_KINDS[number]): ActiveStreak[] => candidates
    .filter(r => r.streak_type === kind && r.current_len >= 2 && who.has(r.wrestler_id))   // one bout isn't a streak
    .filter(r => { const y = who.get(r.wrestler_id)!.class_year; return y == null || y > seasonId })
    .slice(0, 10)
    .map(r => { const w = who.get(r.wrestler_id)!; return { wrestler_id: r.wrestler_id, wrestler_name: w.name, school_name: w.school, streak_len: r.current_len, started_on: r.started_on, class_year: w.class_year } })
  const finalBouts = collect(p => p.state?.final_bout_wins)
  const scoreGap = (s: string) => { const [a, b] = s.split(/[–-]/).map(Number); return Math.abs((a || 0) - (b || 0)) }
  const { data: teamHighRows } = await db.from(girls ? 'snapshot_team_season_highs_girls' : 'snapshot_team_season_highs')
    .select('school_id, school_name, stat_key, best_value, avg_time_sec, bonus_wins, total_bouts, pins, techs, best_on').eq('season', label)
  const teamTop = (k: string) => ((teamHighRows ?? []) as (TeamSeasonHighRow & { stat_key: string })[])
    .filter(r => r.stat_key === k).map(r => ({ ...r, best_value: Number(r.best_value) }))
    .sort((a, b) => b.best_value - a.best_value || (a.avg_time_sec ?? Infinity) - (b.avg_time_sec ?? Infinity)).slice(0, 10)
  // the last daily report with a Top 25 (rankings stop after the regular season)
  const last = [...days].reverse().find(d => (d.payload.state?.top25_teams ?? []).length > 0)

  return {
    season: label,
    gender,
    totals: {
      schools_nj: [...schools].filter(s => schoolNj.get(s) === true).length,
      schools_other: [...schools].filter(s => schoolNj.get(s) !== true).length,
      wrestlers_nj: [...wrestlers].filter(w => wrestlerOos.get(w) === false).length,
      wrestlers_other: [...wrestlers].filter(w => wrestlerOos.get(w) !== false).length,
      matches: sum(by_result), not_counted, by_source, by_result,
      // events with at least one counted bout on file
      events: {
        duals: [...meetsWrestled].filter(id => !jamboreeOf.get(id)).length,
        jamborees: distinct([...meetsWrestled].map(id => jamboreeOf.get(id)).filter(Boolean)),
        jamboree_pairings: [...meetsWrestled].filter(id => jamboreeOf.get(id)).length,
        tournaments: tournamentsWrestled.size,
        postseason: {
          district: [...postseasonWrestled].filter(id => level.get(id) === 'district').length,
          region: [...postseasonWrestled].filter(id => level.get(id) === 'region').length,
          state: [...postseasonWrestled].filter(id => level.get(id) === 'state').length,
        },
      },
    },
    vs_non_njsiaa: { matches: sum(vs.won) + sum(vs.lost), opponents: vs.opponents.size, wins: sum(vs.won), losses: sum(vs.lost), won: vs.won, lost: vs.lost },
    postseason: {
      district_entrants: distinct(atLevel('district').map(e => e.wrestler_id)),
      district_schools: distinct(atLevel('district').map(e => e.school_id).filter(Boolean)),
      region_qualifiers: distinct(atLevel('region').map(e => e.wrestler_id)),
      state_qualifiers: distinct(atLevel('state').map(e => e.wrestler_id)),
      state_placers: placements.filter(p => level.get(p.tournament_id) === 'state' && p.place >= 1 && p.place <= 8).length,
      district_champions: champsAt('district').length,
      region_champions: champsAt('region').length,
      state_champions,
    },
    bests: {
      daily_reports: days.length,
      fastest_pins: top(collect(p => p.state?.fastest_pin), x => x.fall_time_sec, 10, true, bout),
      fastest_techs: top(collect(p => p.state?.fastest_tech), x => x.fall_time_sec, 10, true, bout),
      fastest_duals: top(collect(p => p.state?.fastest_duals), x => x.total_seconds, 10, true, x => x.dual_meet_id),
      top_rated_matches: top(collect(p => p.state?.top_rated_matches), x => x.combined, 10, false, bout),
      top_rated_upsets: top(collect(p => p.state?.top_rated_upsets), x => x.combined, 10, false, bout),
      // split by whether the winner already had a rating (Kyle 2026-11-11); reports saved before then mixed them
      upsets_by_gap: top(collect(p => p.state?.top_upsets_by_gap).filter(x => x.winner_hammer !== 0), x => x.gap, 10, false, bout),
      upsets_by_gap_unrated: top(collect(p => [...(p.state?.top_upsets_by_gap ?? []), ...(p.state?.top_upsets_by_gap_unrated ?? [])]).filter(x => x.winner_hammer === 0), x => x.gap, 10, false, bout),
      team_upsets: top(collect(p => p.state?.team_upsets), x => x.rank_gap ?? 0, 10, false, x => `${x.date}|${x.winner_school_id}|${x.loser_school_id}`),
      most_points_single: top(collect(p => p.state?.most_points_single), x => x.score, 5, false, x => `${x.date}|${x.school_name}|${x.opponent}`),
      most_points_combined: top(collect(p => p.state?.most_points_combined), x => x.score, 5, false, x => `${x.date}|${x.school_name}|${x.opponent}`),
      largest_margins: top(collect(p => p.state?.largest_margin), x => x.margin, 5, false, x => `${x.date}|${x.winner_school}|${x.loser_school}`),
      final_bout_wins: finalBouts.length,
      closest_final_bout_wins: top(finalBouts, x => scoreGap(x.score), 10, true, x => x.dual_meet_id),
      first_career_wins: collect(p => p.state?.first_career_wins).length,
      first_career_matches: collect(p => p.state?.first_career_matches).length,
      streaks: { win: streakLeaders('win'), pin: streakLeaders('pin'), tech: streakLeaders('tech'), bonus: streakLeaders('bonus') },
      active_streaks: { win: activeStreaks('win'), pin: activeStreaks('pin'), tech: activeStreaks('tech'), bonus: activeStreaks('bonus') },
      toughest_schedules: toughestSchedules,
      team_highs: { pins: teamTop('pins'), techs: teamTop('techs'), combined: teamTop('combined'), bonus_pct: teamTop('bonus_pct') },
      tournament_champs: top(collect(p => p.tournaments?.top_champs), x => x.combined_opp_hammer, 10, false, x => `${x.tournament_id}|${x.weight_class}`),
      lowest_seed_wins: top(collect(p => p.tournaments?.lowest_seed_wins), x => x.seed, 10, false, x => `${x.tournament_id}|${x.weight_class}`),
      tournament_upsets: top(collect(p => p.tournaments?.biggest_upset).filter(x => x.winner_hammer !== 0), x => x.gap, 10, false, x => `${x.tournament_id}|${x.weight_class}`),
      tournament_upsets_unrated: top(collect(p => [p.tournaments?.biggest_upset, p.tournaments?.biggest_upset_unrated].filter((x): x is TournamentBiggestUpset => !!x)).filter(x => x.winner_hammer === 0), x => x.gap, 10, false, x => `${x.tournament_id}|${x.weight_class}`),
      tournament_mat_times: top(collect(p => p.tournaments?.mat_times), x => x.total_seconds, 10, false, x => x.tournament_id),
      final_top25: last?.payload.state?.top25_teams ?? [],
      final_top25_date: last?.report_date ?? null,
    },
  }
}
