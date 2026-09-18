/**
 * Standalone Hammer Score recalculation script.
 * Run with: npx tsx scripts/recalculate-hammer-scores.ts
 *
 * Reads env from .env.local automatically via tsx's dotenv support.
 * Uses service-role key so no auth session needed.
 */

import { createClient } from '@supabase/supabase-js'
import {
  classifyOutcome,
  computeMatchScore,
  computeMatchComponent,
  computeTournamentComponent,
  tournamentPointsForPlace,
  postseasonScore,
  totalHammerScore,
  WEIGHT_ORDER_BOYS,
  type PostseasonFact,
} from '../src/lib/hammerScore.js'
import type { HammerConfig } from '../src/lib/hammerConfig.js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CURRENT_SEASON_STR   = '2025-26'
const POSTSEASON_SEASON_ID = 1
const CURRENT_SEASON_ID    = 2
const GENDER               = 'M'
const BOOTSTRAP_SLOTS      = 20

const db = createClient(SUPABASE_URL, SERVICE_KEY)

// Map any weight class string to the nearest official NJSIAA weight class.
// In-season tournaments and dual meets often use adjacent weights (107, 114, etc.)
// that are not NJSIAA standard; this collapses them to the correct bracket weight.
function normalizeWeight(raw: string | number | null | undefined): string | null {
  if (raw == null) return null
  const n = Number(raw)
  if (isNaN(n) || n <= 0) return null
  if (n <= 109) return '106'
  if (n <= 116) return '113'
  if (n <= 123) return '120'
  if (n <= 129) return '126'
  if (n <= 135) return '132'
  if (n <= 141) return '138'
  if (n <= 145) return '144'
  if (n <= 153) return '150'
  if (n <= 160) return '157'
  if (n <= 168) return '165'
  if (n <= 178) return '175'
  if (n <= 193) return '190'
  if (n <= 216) return '215'
  return '285'
}

// Normalize win_type values from the postseason matches table to the format
// expected by classifyOutcome (which was designed around dual_meet result_type).
function normalizeWinType(winType: string | null): string | null {
  switch (winType) {
    case 'DEC':    return 'Dec'
    case 'MD':     return 'MD'
    case 'FALL':   return 'Fall'
    case 'TF-1.5':
    case 'TF-2':
    case 'TF':     return 'TF'
    case 'SV-1':   return 'SV-1'
    case 'UTB':    return 'UTB'
    case 'FORF':   return 'For'
    case 'INJ':    return 'Inj'
    case 'DQ':     return 'DQ'
    default:       return winType
  }
}

// Supabase JS uses GET for SELECT; >~100 UUIDs in .in() exceeds URL length limits.
// This helper batches large ID lists into safe chunks and merges results.
async function chunkIn<T>(
  table: string,
  column: string,
  ids: string[],
  select: string,
  extraFilters: Array<{ method: 'eq'; col: string; val: unknown }> = [],
  chunkSize = 50,
): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; i < ids.length; i += chunkSize) {
    let q = db.from(table).select(select).in(column, ids.slice(i, i + chunkSize))
    for (const f of extraFilters) q = (q as any).eq(f.col, f.val)
    const { data } = await q
    out.push(...((data as T[]) ?? []))
  }
  return out
}

// ─── Wrestler in-memory state ─────────────────────────────────────────────────

type WrestlerState = {
  wrestlerId:          string
  postseasonBase:      number
  postseasonAdjusted:  number
  psEarned:            boolean   // true = came from actual postseason results; cannot be lowered
  tournamentPlacements: Map<string, { pointsEarned: number; won: boolean }>
  matchScores:         number[]
  bootstrapSlots:      number
  bootstrapValue:      number
  matchCount:          number
  lastMatchDate:       string | null
}

function buildScoreWindow(s: WrestlerState): number[] {
  const bootstrap = Array(s.bootstrapSlots).fill(s.bootstrapValue)
  return [...bootstrap, ...s.matchScores].slice(-BOOTSTRAP_SLOTS)
}

function getHammer(s: WrestlerState): number {
  const allScores = buildScoreWindow(s)
  const matchComp = computeMatchComponent(allScores)
  const tourComp  = computeTournamentComponent([...s.tournamentPlacements.values()])
  return totalHammerScore(s.postseasonAdjusted, tourComp, matchComp)
}

function addMatchScore(s: WrestlerState, score: number, date: string): void {
  if (s.bootstrapSlots > 0) s.bootstrapSlots--
  s.matchScores.push(score)
  if (s.bootstrapSlots === 0 && s.matchScores.length > BOOTSTRAP_SLOTS) {
    s.matchScores.shift()
  }
  s.matchCount++
  if (!s.lastMatchDate || date > s.lastMatchDate) s.lastMatchDate = date
}

// ─── Postseason score computation ─────────────────────────────────────────────

async function computePostseasonFacts(seasonId: number): Promise<Map<string, PostseasonFact>> {
  // All entries in the given season's boys postseason tournaments
  const { data: tournaments, error: tErr } = await db
    .from('tournaments')
    .select('id, tournament_type')
    .eq('season_id', seasonId)
    .eq('gender', GENDER)
    .in('tournament_type', ['districts', 'regions', 'boys_state'])

  if (tErr) throw new Error('tournaments: ' + tErr.message)
  if (!tournaments?.length) {
    console.log('  No postseason tournaments found.')
    return new Map()
  }

  const tIds = tournaments.map(t => t.id)
  const tInfo = new Map(tournaments.map(t => [t.id, t]))

  // Paginate — PostgREST default row limit (~1000) would cut off state entries.
  // With 5000+ entries across districts/regions/state we need all pages.
  type EntryRow = { id: string; wrestler_id: string; tournament_id: number }
  const allEntries: EntryRow[] = []
  const ENTRY_PAGE = 1000
  for (let offset = 0; ; offset += ENTRY_PAGE) {
    const { data, error } = await db
      .from('tournament_entries')
      .select('id, wrestler_id, tournament_id')
      .in('tournament_id', tIds)
      .range(offset, offset + ENTRY_PAGE - 1)
    if (error) throw new Error('entries page: ' + error.message)
    if (!data?.length) break
    allEntries.push(...(data as EntryRow[]))
    if (data.length < ENTRY_PAGE) break
  }
  const entries = allEntries

  if (!entries.length) { console.log('  No entries found.'); return new Map() }

  console.log(`  ${entries.length} postseason entries found.`)

  const entryToInfo = new Map(entries.map(e => [
    e.id,
    { wrestlerId: e.wrestler_id, tournamentId: e.tournament_id }
  ]))

  // All validated matches for those entries
  const entryIds = entries.map(e => e.id)

  // Fetch in two passes (winner, loser) and deduplicate by match id.
  // Chunked: 1000+ UUIDs in a single .in() exceeds PostgREST URL limits.
  type MatchRow = { id: string; round: string; winner_entry_id: string | null; loser_entry_id: string | null }
  const validated = [{ method: 'eq' as const, col: 'validated', val: true }]
  const winnerMatches = await chunkIn<MatchRow>('matches', 'winner_entry_id', entryIds, 'id, round, winner_entry_id, loser_entry_id', validated)
  const loserMatches  = await chunkIn<MatchRow>('matches', 'loser_entry_id',  entryIds, 'id, round, winner_entry_id, loser_entry_id', validated)

  const matchMap = new Map<string, MatchRow>()
  for (const m of [...(winnerMatches ?? []), ...(loserMatches ?? [])]) {
    matchMap.set(m.id, m)
  }
  const allMatches = [...matchMap.values()]
  console.log(`  ${allMatches.length} postseason matches found.`)

  const facts = new Map<string, PostseasonFact>()

  function getOrCreate(wId: string): PostseasonFact {
    if (!facts.has(wId)) {
      facts.set(wId, { madeState: false, stateWins: 0, statePlacement: null, districtBest: 'none', regionBest: 'none' })
    }
    return facts.get(wId)!
  }

  // Record entries — establishes minimum tier for each wrestler
  for (const e of entries) {
    const t = tInfo.get(e.tournament_id)
    if (!t) continue
    const fact = getOrCreate(e.wrestler_id)
    if (t.tournament_type === 'boys_state') fact.madeState = true
    else if (t.tournament_type === 'regions'  && fact.regionBest  === 'none') fact.regionBest  = 'entry'
    else if (t.tournament_type === 'districts' && fact.districtBest === 'none') fact.districtBest = 'entry'
  }

  // Process match outcomes
  for (const m of allMatches) {
    const round = m.round?.toString() ?? ''
    const winnerInfo = m.winner_entry_id ? entryToInfo.get(m.winner_entry_id) : null
    const loserInfo  = m.loser_entry_id  ? entryToInfo.get(m.loser_entry_id)  : null

    if (winnerInfo) {
      const t = tInfo.get(winnerInfo.tournamentId)
      const tt = t?.tournament_type
      const fact = getOrCreate(winnerInfo.wrestlerId)

      if (tt === 'districts') {
        if (round === 'F') fact.districtBest = 'champion'
        else if (round === '3rd_Place' && fact.districtBest !== 'champion') fact.districtBest = 'third'
      } else if (tt === 'regions') {
        if (round === 'F') fact.regionBest = 'champion'
        else if (round === '3rd_Place' && fact.regionBest !== 'champion') fact.regionBest = 'third'
      } else if (tt === 'boys_state') {
        fact.stateWins++
        if (round === 'F')           fact.statePlacement = 1
        else if (round === '3rd_Place' && fact.statePlacement !== 1) fact.statePlacement = 3
        else if (round === '5th_Place' && (!fact.statePlacement || fact.statePlacement > 5)) fact.statePlacement = 5
        else if (round === '7th_Place' && (!fact.statePlacement || fact.statePlacement > 7)) fact.statePlacement = 7
      }
    }

    if (loserInfo) {
      const t = tInfo.get(loserInfo.tournamentId)
      const tt = t?.tournament_type
      const fact = getOrCreate(loserInfo.wrestlerId)

      if (tt === 'districts') {
        if (round === 'F' && fact.districtBest !== 'champion') fact.districtBest = 'runner-up'
      } else if (tt === 'regions') {
        if (round === 'F' && fact.regionBest !== 'champion') fact.regionBest = 'finalist'
        else if (round === '3rd_Place' && fact.regionBest === 'entry') fact.regionBest = 'third'
      } else if (tt === 'boys_state') {
        if (round === 'F'          && !fact.statePlacement)                                   fact.statePlacement = 2
        else if (round === '3rd_Place' && (!fact.statePlacement || fact.statePlacement === 3)) fact.statePlacement = 4
        else if (round === '5th_Place' && (!fact.statePlacement || fact.statePlacement > 5))   fact.statePlacement = 6
        else if (round === '7th_Place' && (!fact.statePlacement || fact.statePlacement > 7))   fact.statePlacement = 8
      }
    }
  }

  return facts
}

// ─── Log entry buffer ─────────────────────────────────────────────────────────

type LogEntry = {
  wrestler_id: string; season: string; match_date: string
  match_source: string; source_id: string
  opponent_wrestler_id: string | null
  pre_match_hammer: number; opponent_pre_match_hammer: number
  outcome_rank: number; is_winner: boolean; score_earned: number
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const startedAt = Date.now()
  console.log('=== Hammer Score Recalculation ===')

  // Load active formula config from DB; fall back to hardcoded defaults if missing.
  console.log('\n[0/5] Loading hammer score config...')
  const { data: cfgData } = await db
    .from('hammer_score_config')
    .select('config')
    .eq('gender', GENDER)
    .eq('season', CURRENT_SEASON_STR)
    .eq('is_active', true)
    .single()

  const cfg = cfgData?.config as HammerConfig | null
  const oosBands = cfg?.matches?.oos_bands ?? {
    tier_20:    { lo: 50, hi: 90 },
    tier_15:    { lo: 40, hi: 75 },
    tier_other: { lo: 10, hi: 30 },
  }
  const bootstrapMultiplier    = cfg?.matches?.bootstrap_multiplier ?? 2
  const ceilings               = cfg?.component_ceilings ?? { postseason: 50, tournament: 20, match: 30 }
  const elevationThreshold     = cfg?.matches?.ps_elevation_threshold ?? 16
  const wtAdjustUp             = cfg?.matches?.weight_class_adjustment?.up_per_class   ?? 8
  const wtAdjustDown           = cfg?.matches?.weight_class_adjustment?.down_per_class ?? 6
  console.log(cfg ? '  Config loaded from DB.' : '  No DB config found — using hardcoded defaults.')

  // 1. Postseason facts — 2024-25 is the primary base; 2025-26 fills in new wrestlers
  //    and provides district/region/state scores for wrestlers with no prior-year record.
  console.log('\n[1/5] Computing postseason base scores...')
  console.log('  Fetching 2024-25 postseason...')
  const psFactMap24 = await computePostseasonFacts(POSTSEASON_SEASON_ID)
  console.log(`  ${psFactMap24.size} wrestlers with 2024-25 history.`)
  console.log('  Fetching 2025-26 postseason...')
  const psFactMap25 = await computePostseasonFacts(CURRENT_SEASON_ID)
  console.log(`  ${psFactMap25.size} wrestlers with 2025-26 history.`)

  // 2025-26 always wins on conflict — a wrestler's current-year postseason result
  // replaces their prior-year score regardless of which is higher. 2024-25 is only
  // kept for wrestlers who did not participate in the 2025-26 postseason at all.
  const psFactMap = new Map<string, PostseasonFact>(psFactMap24)
  for (const [wId, fact25] of psFactMap25) {
    psFactMap.set(wId, fact25)
  }
  console.log(`  ${psFactMap.size} wrestlers with postseason history (merged).`)

  // 2. Initialize wrestler states — NJ wrestlers only
  const states = new Map<string, WrestlerState>()
  const weightByWrestler = new Map<string, string>()

  // Fetch all NJ wrestler IDs (is_oos false or null)
  const njWrestlerIds = new Set<string>()
  {
    const PAGE = 1000
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await db
        .from('wrestlers')
        .select('id')
        .or('is_oos.is.null,is_oos.eq.false')
        .range(offset, offset + PAGE - 1)
      if (error) throw new Error('nj wrestlers: ' + error.message)
      if (!data?.length) break
      for (const r of data) njWrestlerIds.add(r.id as string)
      if (data.length < PAGE) break
    }
  }

  function getState(wrestlerId: string): WrestlerState {
    if (!states.has(wrestlerId)) {
      const fact = psFactMap.get(wrestlerId)
      const psBase = fact ? postseasonScore(fact) : 0
      states.set(wrestlerId, {
        wrestlerId,
        postseasonBase:      psBase,
        postseasonAdjusted:  psBase,
        psEarned:            psBase > 0,
        tournamentPlacements: new Map(),
        matchScores:         [],
        bootstrapSlots:      BOOTSTRAP_SLOTS,
        bootstrapValue:      psBase * bootstrapMultiplier,
        matchCount:          0,
        lastMatchDate:       null,
      })
    }
    return states.get(wrestlerId)!
  }

  // Only pre-seed states for NJ wrestlers
  for (const [wId] of psFactMap) {
    if (njWrestlerIds.has(wId)) getState(wId)
  }

  const logEntries: LogEntry[] = []

  // Canonical depth ordering for round strings — higher = later in tournament
  const ROUND_RANK: Record<string, number> = {
    'R64': 1, 'R32': 2, 'R16': 3,
    'Round 1': 4, 'R1': 4,
    'C1': 5,
    'Round 2': 6, 'R2': 6,
    'C2': 7,
    'Round 3': 8, 'R3': 8,
    'C3': 9,
    'Round 4': 10, 'R4': 10,
    'C4': 11,
    'R5': 12,
    'C5': 13,
    'Cons. Quarters': 14, 'CQF': 14,
    'QF': 15,
    'C6': 16,
    'Cons. Semis': 17, 'CSF': 17,
    'SF': 18,
    'C7': 19, '7th_Place': 19,
    '5th_Place': 20, '3rd_Place': 20, 'C8': 20, 'CF': 20, '2nd_Place_Match': 20,
    'F': 21,
  }

  function roundRank(round: string): number {
    if (round in ROUND_RANK) return ROUND_RANK[round]
    const m = round.match(/^(\d+)(?:st|nd|rd|th)?\s*[Rr]ound$/i)
    if (m) return parseInt(m[1])
    return 4
  }

  // Score OOS opponent scaled by tournament tier and round depth.
  function oosHammerForRound(round: string, tournamentRounds: string[], pointValue: number): number {
    const band = pointValue >= 20 ? oosBands.tier_20 : pointValue >= 15 ? oosBands.tier_15 : oosBands.tier_other
    const [lo, hi] = [band.lo, band.hi]
    if (tournamentRounds.length === 0) return (lo + hi) / 2
    const ranks = tournamentRounds.map(roundRank)
    const minRank = Math.min(...ranks)
    const maxRank = Math.max(...ranks)
    if (minRank === maxRank) return (lo + hi) / 2
    const thisRank = Math.min(maxRank, Math.max(minRank, roundRank(round)))
    return lo + ((thisRank - minRank) / (maxRank - minRank)) * (hi - lo)
  }

  // Weight-class adjustment: applied to the score earned from a single match when
  // the wrestler competed at a weight other than their primary class.
  function weightAdj(wrestlerId: string, matchWeight: string | null): number {
    const mainWt = weightByWrestler.get(wrestlerId) ?? null
    if (!mainWt || !matchWeight) return 0
    const mainIdx  = WEIGHT_ORDER_BOYS.indexOf(parseInt(mainWt))
    const matchIdx = WEIGHT_ORDER_BOYS.indexOf(parseInt(matchWeight))
    if (mainIdx === -1 || matchIdx === -1 || mainIdx === matchIdx) return 0
    const diff = matchIdx - mainIdx
    return diff > 0 ? diff * -wtAdjustUp : diff * -wtAdjustDown
  }

  function recordMatch(
    date: string, source: string, sourceId: string,
    wrestlerAId: string | null, wrestlerBId: string | null,
    outcomeRankA: number | null,
    round = '',
    tournamentRounds: string[] = [],
    pointValue = 20,
    matchWeight: string | null = null,
  ) {
    if (!outcomeRankA) return

    const stateA = (wrestlerAId && njWrestlerIds.has(wrestlerAId)) ? getState(wrestlerAId) : null
    const stateB = (wrestlerBId && njWrestlerIds.has(wrestlerBId)) ? getState(wrestlerBId) : null
    if (!stateA && !stateB) return

    const hammerA = stateA ? getHammer(stateA) : (round ? oosHammerForRound(round, tournamentRounds, pointValue) : 0)
    const hammerB = stateB ? getHammer(stateB) : (round ? oosHammerForRound(round, tournamentRounds, pointValue) : 0)

    let { scoreA, scoreB } = computeMatchScore(hammerA, hammerB, outcomeRankA)
    const isWinnerA = outcomeRankA <= 16

    // Apply weight-class adjustment to score earned from this match
    if (matchWeight) {
      if (wrestlerAId) scoreA = Math.round((scoreA + weightAdj(wrestlerAId, matchWeight)) * 100) / 100
      if (wrestlerBId) scoreB = Math.round((scoreB + weightAdj(wrestlerBId, matchWeight)) * 100) / 100
    }

    if (stateA) {
      addMatchScore(stateA, scoreA, date)
      logEntries.push({
        wrestler_id: wrestlerAId!, season: CURRENT_SEASON_STR, match_date: date,
        match_source: source, source_id: sourceId,
        opponent_wrestler_id: wrestlerBId,
        pre_match_hammer: hammerA, opponent_pre_match_hammer: hammerB,
        outcome_rank: outcomeRankA, is_winner: isWinnerA, score_earned: scoreA,
      })
    }

    if (stateB) {
      addMatchScore(stateB, scoreB, date)
      logEntries.push({
        wrestler_id: wrestlerBId!, season: CURRENT_SEASON_STR, match_date: date,
        match_source: source, source_id: sourceId,
        opponent_wrestler_id: wrestlerAId,
        pre_match_hammer: hammerB, opponent_pre_match_hammer: hammerA,
        outcome_rank: 33 - outcomeRankA, is_winner: !isWinnerA, score_earned: scoreB,
      })
    }

    if (stateA && stateB) {
      const winner = isWinnerA ? stateA : stateB
      const loser  = isWinnerA ? stateB : stateA

      // Discovery rule: unrated wrestler beats a district-entry-or-better opponent → grant PS = 20
      if (winner.postseasonBase === 0 && loser.postseasonBase >= 20) {
        winner.postseasonBase     = 20
        winner.postseasonAdjusted = 20
        winner.bootstrapValue     = bootstrapMultiplier * 20
        // psEarned stays false — this is a discovery grant, not real postseason
      }

      // PS elevation: winner can be elevated only if their current PS is below the threshold.
      // Both wrestlers must have postseason scores for this to apply.
      if (
        loser.postseasonAdjusted > winner.postseasonAdjusted &&
        winner.postseasonAdjusted < elevationThreshold
      ) {
        winner.postseasonAdjusted = Math.round((winner.postseasonAdjusted + loser.postseasonAdjusted) / 2 * 100) / 100
      }

      // PS lowering: loser's PS can be pulled down only if it was NOT earned in actual postseason.
      // Concrete postseason scores are permanent.
      if (
        !loser.psEarned &&
        loser.postseasonAdjusted > winner.postseasonAdjusted
      ) {
        loser.postseasonAdjusted = Math.round((loser.postseasonAdjusted + winner.postseasonAdjusted) / 2 * 100) / 100
      }
    }
  }

  // 3. Seed with 2024-25 postseason matches
  async function processPostseasonMatches(seasonId: number, dates: Record<string, string>) {
    const psTourneyOrder: Record<string, number> = { districts: 0, regions: 1, boys_state: 2 }
    const { data: psTs } = await db
      .from('tournaments')
      .select('id, tournament_type')
      .eq('season_id', seasonId)
      .eq('gender', GENDER)
      .in('tournament_type', ['districts', 'regions', 'boys_state'])

    const sortedPsTs = (psTs ?? []).sort(
      (a, b) => (psTourneyOrder[a.tournament_type] ?? 0) - (psTourneyOrder[b.tournament_type] ?? 0)
    )

    let total = 0
    for (const t of sortedPsTs) {
      const { data: entries } = await db
        .from('tournament_entries')
        .select('id, wrestler_id')
        .eq('tournament_id', t.id)

      if (!entries?.length) continue
      const entryIds = entries.map(e => e.id)
      const entryToWrestler = new Map(entries.map(e => [e.id, e.wrestler_id]))

      type PsMatchRow = { id: string; round: string; win_type: string | null; winner_score: number | null; loser_score: number | null; fall_time_seconds: number | null; winner_entry_id: string | null; loser_entry_id: string | null }
      const psSel = 'id, round, win_type, winner_score, loser_score, fall_time_seconds, winner_entry_id, loser_entry_id'
      const wMatches: PsMatchRow[] = []
      const lMatches: PsMatchRow[] = []
      const CHUNK = 50
      for (let ci = 0; ci < entryIds.length; ci += CHUNK) {
        const chunk = entryIds.slice(ci, ci + CHUNK)
        const { data: wChunk } = await db.from('matches').select(psSel).in('winner_entry_id', chunk).eq('validated', true)
        const { data: lChunk } = await db.from('matches').select(psSel).in('loser_entry_id',  chunk).eq('validated', true)
        wMatches.push(...((wChunk as PsMatchRow[]) ?? []))
        lMatches.push(...((lChunk as PsMatchRow[]) ?? []))
      }
      const matchRowMap = new Map<string, PsMatchRow>()
      for (const m of [...wMatches, ...lMatches]) matchRowMap.set(m.id, m)

      for (const m of matchRowMap.values()) {
        const winnerWId = m.winner_entry_id ? entryToWrestler.get(m.winner_entry_id) ?? null : null
        const loserWId  = m.loser_entry_id  ? entryToWrestler.get(m.loser_entry_id)  ?? null : null
        const rank = classifyOutcome(normalizeWinType(m.win_type), m.fall_time_seconds, m.winner_score, m.loser_score, true)
        recordMatch(dates[t.tournament_type] ?? dates['boys_state'], 'postseason', String(m.id), winnerWId, loserWId, rank, m.round)
        total++
      }
    }
    return total
  }

  console.log('\n[2/5] Processing postseason matches...')
  {
    const n24 = await processPostseasonMatches(POSTSEASON_SEASON_ID, {
      districts: '2025-02-28', regions: '2025-03-07', boys_state: '2025-03-14'
    })
    const n25 = await processPostseasonMatches(CURRENT_SEASON_ID, {
      districts: '2026-02-27', regions: '2026-03-06', boys_state: '2026-03-13'
    })
    console.log(`  ${n24} 2024-25 + ${n25} 2025-26 postseason bouts processed.`)
  }

  // 4. In-season tournament bouts
  console.log('\n[3/5] Processing 2025-26 in-season tournament bouts...')
  {
    const { data: tournaments } = await db
      .from('in_season_tournaments')
      .select('id, name, start_date, point_value')
      .eq('season', CURRENT_SEASON_STR)
      .not('point_value', 'is', null)
      .order('start_date', { ascending: true })

    let totalBouts = 0
    for (const t of (tournaments ?? [])) {
      const ptVal = t.point_value as number

      const { data: bouts } = await db
        .from('tournament_bouts')
        .select('id, round, wrestler1_id, wrestler2_id, winner, result_type, result_detail, fall_time_seconds, winner_score, loser_score, weight_class')
        .eq('in_season_tournament_id', t.id)

      // placeMap keyed by weight class so each weight's finalists are tracked separately.
      type RoundSlots = { winner: string | null; loser: string | null }
      type WcPlaceMap = Record<string, RoundSlots>
      const placeByWc = new Map<string, WcPlaceMap>()
      const PLACE_ROUNDS = ['F', '3rd_Place', '5th_Place', '7th_Place']

      // Distinct rounds in this tournament — used to scale OOS opponent scores 50→90
      const tournamentRounds = [...new Set((bouts ?? []).map(b => b.round as string).filter(Boolean))]

      for (const b of (bouts ?? [])) {
        const w1 = b.wrestler1_id as string | null
        const w2 = b.wrestler2_id as string | null
        const winner  = b.winner === 1 ? w1 : b.winner === 2 ? w2 : null
        const loserOf = b.winner === 1 ? w2 : b.winner === 2 ? w1 : null
        const wc = (b.weight_class as string | null) ?? 'unknown'

        if (PLACE_ROUNDS.includes(b.round as string)) {
          if (!placeByWc.has(wc)) {
            placeByWc.set(wc, { F: { winner: null, loser: null }, '3rd_Place': { winner: null, loser: null }, '5th_Place': { winner: null, loser: null }, '7th_Place': { winner: null, loser: null } })
          }
          const wcMap = placeByWc.get(wc)!
          wcMap[b.round as string].winner = winner
          wcMap[b.round as string].loser  = loserOf
        }

        // Capture weight class — tournament bouts are authoritative (official weigh-ins)
        const nwc = normalizeWeight(b.weight_class as string | null)
        if (nwc) {
          if (w1) weightByWrestler.set(w1, nwc)
          if (w2) weightByWrestler.set(w2, nwc)
        }

        // Score each bout (from wrestler1's perspective)
        const w1IsWinner = b.winner === 1
        const rank = classifyOutcome(b.result_type, b.fall_time_seconds, b.winner_score, b.loser_score, w1IsWinner)
        if (rank !== null) {
          recordMatch(t.start_date as string, 'tournament_bout', String(b.id), w1, w2, rank, b.round as string, tournamentRounds, ptVal, nwc)
          totalBouts++
        }
      }

      // Record placements per weight class
      for (const wcMap of placeByWc.values()) {
        const placements: [string | null, number][] = [
          [wcMap['F']?.winner,         1], [wcMap['F']?.loser,         2],
          [wcMap['3rd_Place']?.winner, 3], [wcMap['3rd_Place']?.loser, 4],
          [wcMap['5th_Place']?.winner, 5], [wcMap['5th_Place']?.loser, 6],
          [wcMap['7th_Place']?.winner, 7], [wcMap['7th_Place']?.loser, 8],
        ]
        for (const [wId, place] of placements) {
          if (!wId || !njWrestlerIds.has(wId)) continue
          const earned = tournamentPointsForPlace(place, ptVal)
          const s = getState(wId)
          s.tournamentPlacements.set(t.id, { pointsEarned: earned, won: place === 1 })
        }
      }
    }
    console.log(`  ${totalBouts} tournament bouts processed.`)
  }

  // 5. Dual meet matches
  console.log('\n[4/5] Processing 2025-26 dual meet matches...')
  {
    const { data: meets } = await db
      .from('dual_meets')
      .select('id, meet_date')
      .eq('season_id', CURRENT_SEASON_ID)
      .eq('gender', GENDER)
      .order('meet_date', { ascending: true })

    const schoolByWrestler = new Map<string, number>() // wrestler_id → school_id
    let totalDual = 0
    for (const meet of (meets ?? [])) {
      const { data: matchRows } = await db
        .from('dual_meet_matches')
        .select('id, wrestler_a_id, wrestler_b_id, school_a_id, school_b_id, winner_id, result_type, winner_score, loser_score, fall_time_seconds, is_forfeit_win, is_double_forfeit, weight_class')
        .eq('dual_meet_id', meet.id)

      for (const m of (matchRows ?? [])) {
        const aId = m.wrestler_a_id as string | null
        const bId = m.wrestler_b_id as string | null
        if (aId && m.school_a_id) schoolByWrestler.set(aId, m.school_a_id as number)
        if (bId && m.school_b_id) schoolByWrestler.set(bId, m.school_b_id as number)
        if (m.is_double_forfeit || m.is_forfeit_win) continue

        const aIsWinner = m.winner_id === aId

        // Dual meets fill in weight class only when no tournament data exists
        const dnwc = normalizeWeight(m.weight_class as string | null)
        if (dnwc) {
          if (aId && !weightByWrestler.has(aId)) weightByWrestler.set(aId, dnwc)
          if (bId && !weightByWrestler.has(bId)) weightByWrestler.set(bId, dnwc)
        }

        const rank = classifyOutcome(m.result_type, m.fall_time_seconds, m.winner_score, m.loser_score, aIsWinner)
        if (rank === null) continue

        recordMatch(meet.meet_date as string, 'dual_meet', String(m.id), aId, bId, rank, '', [], 20, dnwc)
        totalDual++
      }
    }
    console.log(`  ${totalDual} dual meet matches processed.`)
  }

  // Build wrestlerMeta: school attrs from schoolByWrestler, district/region from postseason tournament entries.
  type WrestlerMeta = { schoolId: number | null; conference: string | null; section: string | null; classification: string | null; district: number | null; region: number | null }
  const wrestlerMeta = new Map<string, WrestlerMeta>()
  {
    for (const [wId, schoolId] of schoolByWrestler) {
      wrestlerMeta.set(wId, { schoolId, conference: null, section: null, classification: null, district: null, region: null })
    }

    const schoolIds = [...new Set(schoolByWrestler.values())]
    const schoolAttrMap = new Map<number, { conference: string | null; section: string | null; classification: string | null }>()
    for (let i = 0; i < schoolIds.length; i += 100) {
      const { data: sc } = await db.from('schools').select('id, athletic_conference, section, classification').in('id', schoolIds.slice(i, i + 100))
      for (const s of (sc ?? [])) {
        schoolAttrMap.set(s.id as number, {
          conference:     (s.athletic_conference as string | null) ?? null,
          section:        (s.section as string | null) ?? null,
          classification: (s.classification as string | null) ?? null,
        })
      }
    }
    for (const [, meta] of wrestlerMeta) {
      if (!meta.schoolId) continue
      const attr = schoolAttrMap.get(meta.schoolId)
      if (attr) { meta.conference = attr.conference; meta.section = attr.section; meta.classification = attr.classification }
    }

    // Derive district/region directly from which district/region tournament each wrestler entered
    const { data: psTs } = await db
      .from('tournaments')
      .select('id, tournament_type, district_id, region_id')
      .eq('season_id', CURRENT_SEASON_ID)
      .eq('gender', GENDER)
      .in('tournament_type', ['districts', 'regions', 'boys_state'])

    const tInfoMap = new Map((psTs ?? []).map(t => [Number(t.id), t as any]))
    const tIds = (psTs ?? []).map(t => String(t.id))

    if (tIds.length) {
      const PAGE = 1000
      for (let offset = 0; ; offset += PAGE) {
        const { data } = await db
          .from('tournament_entries')
          .select('wrestler_id, tournament_id, school_id, weight_classes(weight)')
          .in('tournament_id', tIds)
          .range(offset, offset + PAGE - 1)
        if (!data?.length) break
        for (const e of (data as any[])) {
          if (!e.wrestler_id) continue
          const nwc = normalizeWeight(e.weight_classes?.weight)
          if (nwc) weightByWrestler.set(e.wrestler_id, nwc)
          if (e.school_id && !schoolByWrestler.has(e.wrestler_id)) schoolByWrestler.set(e.wrestler_id, e.school_id)
          const meta = wrestlerMeta.get(e.wrestler_id) ?? { schoolId: e.school_id ?? null, conference: null, section: null, classification: null, district: null, region: null }
          const t = tInfoMap.get(Number(e.tournament_id))
          if (t?.tournament_type === 'districts' && t.district_id && !meta.district) meta.district = t.district_id
          if (t?.region_id && !meta.region) meta.region = t.region_id
          wrestlerMeta.set(e.wrestler_id, meta)
        }
        if (data.length < PAGE) break
      }

      // For wrestlers with a district but no region, look it up from the districts table
      const districtIds = [...new Set([...wrestlerMeta.values()].map(m => m.district).filter(Boolean) as number[])]
      const districtRegionMap = new Map<number, number>()
      for (let i = 0; i < districtIds.length; i += 100) {
        const { data: dists } = await db.from('districts').select('id, region_id').in('id', districtIds.slice(i, i + 100))
        for (const d of (dists ?? [])) if (d.region_id) districtRegionMap.set(d.id as number, d.region_id as number)
      }
      for (const [, meta] of wrestlerMeta) {
        if (meta.district && !meta.region) meta.region = districtRegionMap.get(meta.district) ?? null
      }
    }
  }

  // 6. Write to DB
  console.log('\n[5/5] Writing results to database...')

  await db.from('wrestler_match_score_log').delete().eq('season', CURRENT_SEASON_STR)
  await db.from('wrestler_hammer_scores').delete().eq('season', CURRENT_SEASON_STR)

  const BATCH = 500
  for (let i = 0; i < logEntries.length; i += BATCH) {
    const { error } = await db.from('wrestler_match_score_log').insert(logEntries.slice(i, i + BATCH))
    if (error) console.error('  Log insert error:', error.message)
  }
  console.log(`  ${logEntries.length} match log entries written.`)

  // Only write wrestlers who have at least one real 2025-26 match.
  // Pure-postseason wrestlers (2024-25 only, no current-season activity) are excluded.
  const scoreRows = [...states.values()]
    .filter(s => s.matchCount > 0 && s.lastMatchDate != null && s.lastMatchDate >= '2025-04-01')
    .map(s => {
      const tourComp  = Math.min(computeTournamentComponent([...s.tournamentPlacements.values()]), ceilings.tournament)
      const matchComp = Math.min(computeMatchComponent(buildScoreWindow(s)), ceilings.match)
      const psComp    = Math.min(s.postseasonAdjusted, ceilings.postseason)
      const hammer    = totalHammerScore(psComp, tourComp, matchComp)
      const meta      = wrestlerMeta.get(s.wrestlerId)
      return {
        wrestler_id:     s.wrestlerId,
        season:          CURRENT_SEASON_STR,
        postseason_base: s.postseasonBase,
        postseason_adjusted: s.postseasonAdjusted,
        tournament_score: tourComp,
        match_score:     matchComp,
        hammer_score:    hammer,
        match_count:     s.matchCount,
        last_match_date: s.lastMatchDate,
        weight_class:    weightByWrestler.get(s.wrestlerId) ?? null,
        school_id:       meta?.schoolId ?? null,
        conference:      meta?.conference ?? null,
        section:         meta?.section ?? null,
        classification:  meta?.classification ?? null,
        district:        meta?.district ?? null,
        region:          meta?.region ?? null,
        last_calculated_at: new Date().toISOString(),
      }
    })

  for (let i = 0; i < scoreRows.length; i += BATCH) {
    const { error } = await db.from('wrestler_hammer_scores').insert(scoreRows.slice(i, i + BATCH))
    if (error) console.error('  Score insert error:', error.message)
  }
  console.log(`  ${scoreRows.length} wrestler score rows written.`)

  // Summary
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log('\n=== Done ===')
  console.log(`  Wrestlers scored:  ${scoreRows.length}`)
  console.log(`  Match log entries: ${logEntries.length}`)
  console.log(`  Time:              ${elapsed}s`)

  // Top 10 preview
  const top10 = scoreRows
    .sort((a, b) => b.hammer_score - a.hammer_score)
    .slice(0, 10)

  console.log('\nTop 10 Hammer Scores:')
  for (const r of top10) {
    console.log(`  ${r.hammer_score.toFixed(2)}  (PS: ${r.postseason_adjusted.toFixed(1)} | Tour: ${r.tournament_score.toFixed(1)} | Match: ${r.match_score.toFixed(1)})  [wrestler ${r.wrestler_id.slice(0, 8)}...]`)
  }
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
