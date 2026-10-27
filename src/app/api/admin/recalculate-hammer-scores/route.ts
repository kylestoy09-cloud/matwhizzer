/**
 * POST /api/admin/recalculate-hammer-scores
 *
 * Full-season replay of the Hammer Score calculation for the season in progress
 * (newest season for the gender) for all NJ
 * wrestlers. Processes matches in strict chronological order so that the
 * score going INTO each match is accurate.
 *
 * Order of processing:
 *   1. Prior season postseason facts (establishes PS base scores)
 *   2. Prior season postseason match bouts (districts → regions → state, seeds rolling 20)
 *   3. Current season in-season tournament bouts (by tournament start_date)
 *   4. Current season dual meet matches (by meet_date)
 *
 * Protected by admin session OR Vercel cron secret header.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getWorkingSeason, getPreviousSeason, parseGender } from '@/lib/season-context'
import { getSeasons } from '@/lib/seasons-server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import {
  classifyOutcome,
  computeMatchScore,
  computeMatchComponent,
  computeTournamentComponent,
  tournamentPointsForPlace,
  postseasonScore,
  totalHammerScore,
  getWeightAdjustment,
  type PostseasonFact,
} from '@/lib/hammerScore'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const BOOTSTRAP_SLOTS      = 20

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function authorize(req: NextRequest): Promise<boolean> {
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get('authorization')
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true
  // Legacy header (manual calls)
  const cronSecret = req.headers.get('x-cron-secret')
  if (cronSecret && cronSecret === process.env.CRON_SECRET) return true
  // Admin session
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  return !!user
}

// ─── win_type normalizer ───────────────────────────────────────────────────────
// matches.win_type uses all-caps; classifyOutcome expects mixed-case result_type.

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

// ─── Chunked .in() helper ─────────────────────────────────────────────────────
// Supabase JS uses GET for SELECT; large .in() lists exceed URL length limits.

async function chunkIn<T>(
  db: ReturnType<typeof createSupabaseAdmin>,
  table: string,
  column: string,
  ids: string[],
  select: string,
  extraEq: Array<{ col: string; val: unknown }> = [],
  chunkSize = 50,
): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; i < ids.length; i += chunkSize) {
    let q = db.from(table).select(select).in(column, ids.slice(i, i + chunkSize))
    for (const f of extraEq) q = (q as any).eq(f.col, f.val)
    const { data } = await q
    out.push(...((data as T[]) ?? []))
  }
  return out
}

// ─── In-memory wrestler state ─────────────────────────────────────────────────

type WrestlerState = {
  wrestlerId:           string
  postseasonBase:       number
  postseasonAdjusted:   number
  tournamentPlacements: Map<string, { pointsEarned: number; won: boolean }>
  matchScores:          number[]
  bootstrapSlots:       number
  bootstrapValue:       number
  matchCount:           number
  lastMatchDate:        string | null
}

function buildScoreWindow(s: WrestlerState): number[] {
  const bootstrap = Array(s.bootstrapSlots).fill(s.bootstrapValue)
  return [...bootstrap, ...s.matchScores].slice(-BOOTSTRAP_SLOTS)
}

function getHammer(s: WrestlerState): number {
  const matchComp = computeMatchComponent(buildScoreWindow(s))
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

// ─── Main handler ─────────────────────────────────────────────────────────────

// ─── Pre-pass: determine each wrestler's main weight before scoring begins ─────
// Priority: postseason entry > last in-season tournament > mode of dual meets.
// Wrestling away from this weight triggers the ±8/±6 adjustment per class.

async function buildMainWeightMap(
  db: ReturnType<typeof createSupabaseAdmin>,
  gender: string,
  CURRENT_SEASON_ID: number,
  CURRENT_SEASON_STR: string,
): Promise<Map<string, string>> {
  const mainWeight = new Map<string, string>()

  // 1. Dual meets — use most common weight class as the base
  const matchTableHammer = gender === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches'
  const meetIds: string[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data } = await (gender === 'F'
      ? db.from('dual_meets_girls').select('id').eq('season_id', CURRENT_SEASON_ID).range(offset, offset + 999)
      : db.from('dual_meets').select('id').eq('season_id', CURRENT_SEASON_ID).eq('gender', gender).range(offset, offset + 999)
    )
    if (!data?.length) break
    for (const m of data) meetIds.push(String(m.id))
    if (data.length < 1000) break
  }
  const dualCounts = new Map<string, Map<string, number>>()
  for (let i = 0; i < meetIds.length; i += 50) {
    const { data } = await db.from(matchTableHammer)
      .select('wrestler_a_id, wrestler_b_id, weight_class')
      .in('dual_meet_id', meetIds.slice(i, i + 50))
      .eq('is_double_forfeit', false)
    for (const m of (data ?? [])) {
      const nwc = normalizeWeight((m as any).weight_class)
      if (!nwc) continue
      for (const wid of [m.wrestler_a_id, m.wrestler_b_id] as (string | null)[]) {
        if (!wid) continue
        if (!dualCounts.has(wid)) dualCounts.set(wid, new Map())
        const c = dualCounts.get(wid)!
        c.set(nwc, (c.get(nwc) ?? 0) + 1)
      }
    }
  }
  for (const [wid, counts] of dualCounts) {
    let best = ''; let bestCount = 0
    for (const [wc, n] of counts) if (n > bestCount) { bestCount = n; best = wc }
    if (best) mainWeight.set(wid, best)
  }

  // 2. In-season tournament bouts — overwrite with last tournament's weight (chronological)
  const istTable  = gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'
  const boutTable = gender === 'F' ? 'tournament_bouts_girls'      : 'tournament_bouts'
  const { data: isTs } = await db.from(istTable)
    .select('id, start_date').eq('season', CURRENT_SEASON_STR)
    .order('start_date', { ascending: true })
  for (const t of (isTs ?? [])) {
    const { data: bouts } = await db.from(boutTable)
      .select('wrestler1_id, wrestler2_id, weight_class')
      .eq('in_season_tournament_id', (t as any).id)
    for (const b of (bouts ?? [])) {
      const nwc = normalizeWeight((b as any).weight_class)
      if (!nwc) continue
      if ((b as any).wrestler1_id) mainWeight.set((b as any).wrestler1_id, nwc)
      if ((b as any).wrestler2_id) mainWeight.set((b as any).wrestler2_id, nwc)
    }
  }

  // 3. Postseason entries — highest priority, final override
  const _stateType   = gender === 'F' ? 'girls_state'   : 'boys_state'
  const _regionsType = gender === 'F' ? 'girls_regions' : 'regions'
  const { data: psTs } = await db.from('tournaments').select('id')
    .eq('season_id', CURRENT_SEASON_ID).eq('gender', gender)
    .in('tournament_type', ['districts', _regionsType, _stateType])
  const psTIds = (psTs ?? []).map((t: any) => String(t.id))
  if (psTIds.length) {
    for (let offset = 0; ; offset += 1000) {
      const { data } = await db.from('tournament_entries')
        .select('wrestler_id, weight_classes(weight)')
        .in('tournament_id', psTIds)
        .range(offset, offset + 999)
      if (!data?.length) break
      for (const e of (data as any[])) {
        const nwc = normalizeWeight(e.weight_classes?.weight)
        if (nwc && e.wrestler_id) mainWeight.set(e.wrestler_id as string, nwc)
      }
      if (data.length < 1000) break
    }
  }

  return mainWeight
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const gender     = (body?.gender === 'F' ? 'F' : 'M') as string
  const stateType  = gender === 'F' ? 'girls_state'   : 'boys_state'
  const regionsType = gender === 'F' ? 'girls_regions' : 'regions'
  const psTypes    = ['districts', regionsType, stateType]

  // Normally the gender's working season. `{ season: '2025-26', logOnly: true }`
  // rebuilds one past season's match log for this gender and writes nothing
  // else — an archived season's hammer scores and weights stay as they are.
  const logOnly = body?.logOnly === true
  if (logOnly && typeof body?.season !== 'string') {
    return NextResponse.json({ error: 'logOnly requires season (a seasons.year_label)' }, { status: 400 })
  }
  const season = logOnly
    ? (await getSeasons()).find(s => s.label === body.season)
    : await getWorkingSeason(parseGender(gender))
  if (!season) return NextResponse.json({ error: `Unknown season ${body?.season}` }, { status: 400 })
  const CURRENT_SEASON_ID    = season.id
  const CURRENT_SEASON_STR   = season.label
  const POSTSEASON_SEASON_ID = (await getPreviousSeason(season)).id

  const db = createSupabaseAdmin()
  const startedAt = Date.now()
  const weightByWrestler = new Map<string, string>()

  // Pre-compute main weights before any scoring so adjustments are available
  // from the very first match of the season.
  const mainWeightByWrestler = await buildMainWeightMap(db, gender, CURRENT_SEASON_ID, CURRENT_SEASON_STR)

  // ── 1. Compute postseason base scores (both seasons, take best per wrestler) ───

  async function computePostseasonFacts(seasonId: number): Promise<Map<string, PostseasonFact>> {
    const factMap = new Map<string, PostseasonFact>()
    const { data: psTournaments } = await db
      .from('tournaments')
      .select('id, tournament_type')
      .eq('season_id', seasonId)
      .eq('gender', gender)
      .in('tournament_type', psTypes)

    if (!psTournaments?.length) return factMap
    const tIds = psTournaments.map(t => t.id as string)
    const tInfo = new Map(psTournaments.map(t => [t.id, t]))

    type EntryRow = { id: string; wrestler_id: string; tournament_id: number }
    const allEntries: EntryRow[] = []
    const ENTRY_PAGE = 1000
    for (let offset = 0; ; offset += ENTRY_PAGE) {
      const { data } = await db
        .from('tournament_entries')
        .select('id, wrestler_id, tournament_id')
        .in('tournament_id', tIds)
        .range(offset, offset + ENTRY_PAGE - 1)
      if (!data?.length) break
      allEntries.push(...(data as EntryRow[]))
      if (data.length < ENTRY_PAGE) break
    }

    if (!allEntries.length) return factMap
    const entryIds = allEntries.map(e => e.id)
    const entryToInfo = new Map(allEntries.map(e => [
      e.id, { wrestlerId: e.wrestler_id, tournamentId: e.tournament_id }
    ]))

    type MRow = { id: string; round: string; winner_entry_id: string | null; loser_entry_id: string | null }
    const validated = [{ col: 'validated', val: true }]
    const wMatches = await chunkIn<MRow>(db, 'matches', 'winner_entry_id', entryIds, 'id, round, winner_entry_id, loser_entry_id', validated)
    const lMatches = await chunkIn<MRow>(db, 'matches', 'loser_entry_id',  entryIds, 'id, round, winner_entry_id, loser_entry_id', validated)
    const matchMap = new Map<string, MRow>()
    for (const m of [...wMatches, ...lMatches]) matchMap.set(m.id, m)

    function getOrCreate(wId: string): PostseasonFact {
      if (!factMap.has(wId)) {
        factMap.set(wId, { madeState: false, stateWins: 0, statePlacement: null, districtBest: 'none', regionBest: 'none' })
      }
      return factMap.get(wId)!
    }

    for (const e of allEntries) {
      const t = tInfo.get(e.tournament_id as any)
      if (!t) continue
      const fact = getOrCreate(e.wrestler_id)
      if (t.tournament_type === stateType) fact.madeState = true
      else if (t.tournament_type === regionsType && fact.regionBest  === 'none') fact.regionBest  = 'entry'
      else if (t.tournament_type === 'districts'  && fact.districtBest === 'none') fact.districtBest = 'entry'
    }

    for (const m of matchMap.values()) {
      const round = m.round ?? ''
      const winnerInfo = m.winner_entry_id ? entryToInfo.get(m.winner_entry_id) : null
      const loserInfo  = m.loser_entry_id  ? entryToInfo.get(m.loser_entry_id)  : null

      if (winnerInfo) {
        const t = tInfo.get(winnerInfo.tournamentId as any)
        const tt = t?.tournament_type
        const fact = getOrCreate(winnerInfo.wrestlerId)
        if (tt === 'districts') {
          if (round === 'F') fact.districtBest = 'champion'
          else if (round === '3rd_Place' && fact.districtBest !== 'champion') fact.districtBest = 'third'
        } else if (tt === regionsType) {
          if (round === 'F') fact.regionBest = 'champion'
          else if (round === '3rd_Place' && fact.regionBest !== 'champion') fact.regionBest = 'third'
        } else if (tt === stateType) {
          fact.stateWins++
          if (round === 'F') fact.statePlacement = 1
          else if (round === '3rd_Place' && fact.statePlacement !== 1) fact.statePlacement = 3
          else if (round === '5th_Place' && (!fact.statePlacement || fact.statePlacement > 5)) fact.statePlacement = 5
          else if (round === '7th_Place' && (!fact.statePlacement || fact.statePlacement > 7)) fact.statePlacement = 7
        }
      }

      if (loserInfo) {
        const t = tInfo.get(loserInfo.tournamentId as any)
        const tt = t?.tournament_type
        const fact = getOrCreate(loserInfo.wrestlerId)
        if (tt === 'districts') {
          if (round === 'F' && fact.districtBest !== 'champion') fact.districtBest = 'runner-up'
        } else if (tt === regionsType) {
          if (round === 'F' && fact.regionBest !== 'champion') fact.regionBest = 'finalist'
          else if (round === '3rd_Place' && fact.regionBest === 'entry') fact.regionBest = 'third'
        } else if (tt === stateType) {
          if (round === 'F' && !fact.statePlacement) fact.statePlacement = 2
          else if (round === '3rd_Place' && (!fact.statePlacement || fact.statePlacement === 3)) fact.statePlacement = 4
          else if (round === '5th_Place' && (!fact.statePlacement || fact.statePlacement > 5)) fact.statePlacement = 6
          else if (round === '7th_Place' && (!fact.statePlacement || fact.statePlacement > 7)) fact.statePlacement = 8
        }
      }
    }

    return factMap
  }

  const psFactMap24 = await computePostseasonFacts(POSTSEASON_SEASON_ID)
  const psFactMap25 = await computePostseasonFacts(CURRENT_SEASON_ID)

  // Initialize wrestler states from prior-season results only — that is what was known
  // entering the current season. Current-season postseason results are applied as the final
  // postseasonAdjusted after all in-season matches have been processed (see step 7).
  const psFactMap = psFactMap24

  // ── 2. Initialize wrestler states — NJ wrestlers only ─────────────────────────

  const states = new Map<string, WrestlerState>()

  // Fetch all NJ wrestler IDs (is_oos false or null) of this run's gender. A
  // girl who wrestles a boys bout is not scored by the boys run (or vice versa):
  // wrestler_hammer_scores holds one row per wrestler per season, so a
  // wrong-gender row blocks that wrestler's own row (2,011 girls had boys rows
  // and every girls insert batch failed, 2026-10-26).
  const njWrestlerIds = new Set<string>()
  {
    const PAGE = 1000
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await db
        .from('wrestlers')
        .select('id')
        .eq('gender', gender)
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
      const realPsBase = fact ? postseasonScore(fact) : 0
      // MS credit acts as a floor: if this wrestler has no real HS postseason history,
      // use their MS prospect credit as the starting postseason component.
      const msCredit = (!realPsBase && msCreditMap.has(wrestlerId)) ? msCreditMap.get(wrestlerId)! : 0
      const psBase = realPsBase || msCredit
      states.set(wrestlerId, {
        wrestlerId,
        postseasonBase:      psBase,
        postseasonAdjusted:  psBase,
        tournamentPlacements: new Map(),
        matchScores:         [],
        bootstrapSlots:      BOOTSTRAP_SLOTS,
        bootstrapValue:      psBase * 2,
        matchCount:          0,
        lastMatchDate:       null,
      })
    }
    return states.get(wrestlerId)!
  }

  // Compute MS postseason credit on-the-fly from ms_wrestlers → ms_placements → ms_tournament_tiers.
  // Used as a floor for wrestlers with no real HS postseason history (typically incoming freshmen).
  const msCreditMap = new Map<string, number>() // hs_wrestler_id → best single placement credit
  {
    const { data: msLinked } = await db
      .from('ms_wrestlers')
      .select(`
        hs_wrestler_id,
        ms_placements (
          place,
          ms_tournament:ms_tournaments (
            tier:ms_tournament_tiers (
              credit_1, credit_2, credit_3, credit_4,
              credit_5, credit_6, credit_7, credit_8
            )
          )
        )
      `)
      .not('hs_wrestler_id', 'is', null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const w of (msLinked ?? []) as any[]) {
      if (!w.hs_wrestler_id) continue
      let best = 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const p of (w.ms_placements ?? []) as any[]) {
        const tier = p.ms_tournament?.tier
        if (!tier) continue
        const credit = Number(tier[`credit_${p.place}`] ?? 0) || 0
        if (credit > best) best = credit
      }
      if (best > 0) msCreditMap.set(w.hs_wrestler_id as string, best)
    }
  }

  // Only pre-seed states for NJ wrestlers
  for (const [wId] of psFactMap) {
    if (njWrestlerIds.has(wId)) getState(wId)
  }

  const logEntries: {
    wrestler_id: string; season: string; gender: string; match_date: string
    match_source: string; source_id: string
    opponent_wrestler_id: string | null
    pre_match_hammer: number; opponent_pre_match_hammer: number
    outcome_rank: number; is_winner: boolean; score_earned: number
  }[] = []

  function oosHammerForRound(round: string): number {
    if (round === 'F') return 65
    if (round === 'SF' || round === 'QF' || round === 'Cons. Semis') return 60
    return 55
  }

  function recordMatch(
    date: string, source: string, sourceId: string,
    wrestlerAId: string | null, wrestlerBId: string | null,
    outcomeRankA: number | null,
    round = '',
    matchWeightClass: string | null = null,
  ) {
    if (!outcomeRankA) return
    const stateA = (wrestlerAId && njWrestlerIds.has(wrestlerAId)) ? getState(wrestlerAId) : null
    const stateB = (wrestlerBId && njWrestlerIds.has(wrestlerBId)) ? getState(wrestlerBId) : null
    if (!stateA && !stateB) return

    const hammerA = stateA ? getHammer(stateA) : (round ? oosHammerForRound(round) : 0)
    const hammerB = stateB ? getHammer(stateB) : (round ? oosHammerForRound(round) : 0)

    // Apply weight-class adjustment: a wrestler competing away from their main weight
    // gets –8 per class up or +6 per class down applied to their effective hammer.
    const matchWc = matchWeightClass ? normalizeWeight(matchWeightClass) : null
    const adjA = stateA ? getWeightAdjustment(mainWeightByWrestler.get(wrestlerAId!) ?? null, matchWc) : 0
    const adjB = stateB ? getWeightAdjustment(mainWeightByWrestler.get(wrestlerBId!) ?? null, matchWc) : 0

    const { scoreA, scoreB } = computeMatchScore(hammerA + adjA, hammerB + adjB, outcomeRankA)
    const isWinnerA = outcomeRankA <= 16

    if (stateA) {
      addMatchScore(stateA, scoreA, date)
      logEntries.push({
        wrestler_id: wrestlerAId!, season: CURRENT_SEASON_STR, gender, match_date: date,
        match_source: source, source_id: sourceId,
        opponent_wrestler_id: wrestlerBId,
        pre_match_hammer: hammerA, opponent_pre_match_hammer: hammerB,
        outcome_rank: outcomeRankA, is_winner: isWinnerA, score_earned: scoreA,
      })
    }
    if (stateB) {
      addMatchScore(stateB, scoreB, date)
      logEntries.push({
        wrestler_id: wrestlerBId!, season: CURRENT_SEASON_STR, gender, match_date: date,
        match_source: source, source_id: sourceId,
        opponent_wrestler_id: wrestlerAId,
        pre_match_hammer: hammerB, opponent_pre_match_hammer: hammerA,
        outcome_rank: 33 - outcomeRankA, is_winner: !isWinnerA, score_earned: scoreB,
      })
    }

    // Discovery rule: unrated wrestler beats a district-tier or better opponent → grant PS=20
    if (stateA && stateB) {
      const winner = isWinnerA ? stateA : stateB
      const loser  = isWinnerA ? stateB : stateA
      if (winner.postseasonBase === 0 && loser.postseasonBase >= 20) {
        winner.postseasonBase     = 20
        winner.postseasonAdjusted = 20
        winner.bootstrapValue     = 40
      }
    }
  }

  // ── 3. Process postseason matches (both seasons) ──────────────────────────────
  // Postseason bout dates for a season, from the NJSIAA season calendar (keyed by tournament_type)
  async function postseasonDates(seasonId: number): Promise<Record<string, string>> {
    const g = gender === 'F' ? 'girls' : 'boys'
    const eventToType: Record<string, string> = {
      [`individual_district_${g}`]: 'districts',
      [`individual_region_${g}`]:   regionsType,
      [`individual_state_${g}`]:    stateType,
    }
    const { data, error } = await db
      .from('season_calendar')
      .select('event_type, event_date')
      .eq('season_id', seasonId)
      .in('event_type', Object.keys(eventToType))
    if (error) throw new Error(`season_calendar: ${error.message}`)
    return Object.fromEntries((data ?? []).map(r => [eventToType[r.event_type as string], r.event_date as string]))
  }

  async function processPostseasonMatches(seasonId: number) {
    const dates = await postseasonDates(seasonId)
    const psTourneyOrder: Record<string, number> = { districts: 0, [regionsType]: 1, [stateType]: 2 }
    const { data: psTs } = await db
      .from('tournaments')
      .select('id, tournament_type')
      .eq('season_id', seasonId)
      .eq('gender', gender)
      .in('tournament_type', psTypes)

    const sortedPsTs = (psTs ?? []).sort(
      (a, b) => (psTourneyOrder[a.tournament_type] ?? 0) - (psTourneyOrder[b.tournament_type] ?? 0)
    )

    for (const t of sortedPsTs) {
      const { data: entries } = await db
        .from('tournament_entries')
        .select('id, wrestler_id')
        .eq('tournament_id', t.id as any)

      if (!entries?.length) continue
      const entryIds = entries.map(e => e.id as string)
      const entryToWrestler = new Map(entries.map(e => [e.id as string, e.wrestler_id as string]))

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

      const matchDate = dates[t.tournament_type as string]
      if (!matchDate) {
        throw new Error(`No ${t.tournament_type} date in the season calendar for season ${seasonId} — add it before recalculating`)
      }
      for (const m of matchRowMap.values()) {
        const winnerWId = m.winner_entry_id ? entryToWrestler.get(m.winner_entry_id) ?? null : null
        const loserWId  = m.loser_entry_id  ? entryToWrestler.get(m.loser_entry_id)  ?? null : null
        const rank = classifyOutcome(normalizeWinType(m.win_type), m.fall_time_seconds, m.winner_score, m.loser_score, true)
        recordMatch(matchDate, 'postseason', m.id, winnerWId, loserWId, rank, m.round)
      }
    }
  }

  await processPostseasonMatches(POSTSEASON_SEASON_ID)

  // ── 4. Process current-season in-season tournaments + dual meets (chronological) ──────
  // All events are interleaved by date so a December dual meet is never scored
  // using a January tournament's match results as prior context.
  const schoolByWrestler = new Map<string, number>() // wrestler_id → school_id
  {
    const PLACE_ROUNDS = ['F', '3rd_Place', '5th_Place', '7th_Place']
    const PLACE_ROUND_WINNER: Record<string, number> = { F: 1, '3rd_Place': 3, '5th_Place': 5, '7th_Place': 7 }

    // ── Fetch all in-season tournaments ─────────────────────────────────────────
    const inSeasonTable = gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'
    const inSeasonBoutTable = gender === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts'

    const { data: tournaments } = await db
      .from(inSeasonTable)
      .select('id, start_date, point_value')
      .eq('season', CURRENT_SEASON_STR)
      .order('start_date', { ascending: true })

    // Pre-fetch all tournament bouts grouped by tournament id (paginated for large events)
    const boutsByTournament = new Map<string, any[]>()
    for (const t of (tournaments ?? [])) {
      const bouts: any[] = []
      for (let offset = 0; ; offset += 1000) {
        const { data: page } = await db
          .from(inSeasonBoutTable)
          .select('id, round, wrestler1_id, wrestler2_id, winner, result_type, fall_time_seconds, winner_score, loser_score, weight_class')
          .eq('in_season_tournament_id', t.id)
          .range(offset, offset + 999)
        if (!page?.length) break
        bouts.push(...page)
        if (page.length < 1000) break
      }
      boutsByTournament.set(String(t.id), bouts)
    }

    // ── Fetch all dual meets ─────────────────────────────────────────────────────
    const meetDateMap = new Map<string, string>() // meet_id → meet_date
    const MEET_PAGE = 1000
    for (let offset = 0; ; offset += MEET_PAGE) {
      const { data } = await (gender === 'F'
        ? db.from('dual_meets_girls').select('id, meet_date').eq('season_id', CURRENT_SEASON_ID).range(offset, offset + MEET_PAGE - 1).order('meet_date', { ascending: true })
        : db.from('dual_meets').select('id, meet_date').eq('season_id', CURRENT_SEASON_ID).eq('gender', gender).range(offset, offset + MEET_PAGE - 1).order('meet_date', { ascending: true })
      )
      if (!data?.length) break
      for (const m of data) meetDateMap.set(String(m.id), m.meet_date as string)
      if (data.length < MEET_PAGE) break
    }

    // Pre-fetch all dual meet matches grouped by meet id
    const matchesByMeet = new Map<string, any[]>()
    const allMeetIds = [...meetDateMap.keys()]
    const MEET_CHUNK = 50
    const dualMatchTable = gender === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches'
    for (let i = 0; i < allMeetIds.length; i += MEET_CHUNK) {
      const { data: matchRows } = await db
        .from(dualMatchTable)
        .select('id, dual_meet_id, wrestler_a_id, wrestler_b_id, school_a_id, school_b_id, winner_id, result_type, winner_score, loser_score, fall_time_seconds, is_forfeit_win, is_double_forfeit, weight_class')
        .in('dual_meet_id', allMeetIds.slice(i, i + MEET_CHUNK))
      for (const m of (matchRows ?? [])) {
        const mid = String(m.dual_meet_id)
        if (!matchesByMeet.has(mid)) matchesByMeet.set(mid, [])
        matchesByMeet.get(mid)!.push(m)
      }
    }

    // ── Build chronologically ordered event list ─────────────────────────────────
    type SeasonEvent =
      | { date: string; type: 'tournament'; id: string; pointValue: number }
      | { date: string; type: 'meet'; id: string }

    const events: SeasonEvent[] = []
    for (const t of (tournaments ?? [])) {
      events.push({ date: t.start_date as string, type: 'tournament', id: String(t.id), pointValue: t.point_value as number })
    }
    for (const [meetId, meetDate] of meetDateMap) {
      events.push({ date: meetDate, type: 'meet', id: meetId })
    }
    events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

    // ── Process events in date order ────────────────────────────────────────────
    for (const event of events) {
      if (event.type === 'tournament') {
        const bouts = boutsByTournament.get(event.id) ?? []
        const tDate  = event.date
        const ptVal  = event.pointValue
        // wrestler-centric best-place tracking (handles multi-bracket tournaments)
        const wrestlerBestPlace = new Map<string, number>()

        for (const b of bouts) {
          const w1 = b.wrestler1_id as string | null
          const w2 = b.wrestler2_id as string | null
          const winner  = b.winner === 1 ? w1 : b.winner === 2 ? w2 : null
          const loserOf = b.winner === 1 ? w2 : b.winner === 2 ? w1 : null

          if (PLACE_ROUNDS.includes(b.round as string)) {
            const winnerPlace = PLACE_ROUND_WINNER[b.round as string]
            const loserPlace  = winnerPlace + 1
            if (winner) {
              const cur = wrestlerBestPlace.get(winner) ?? Infinity
              if (winnerPlace < cur) wrestlerBestPlace.set(winner, winnerPlace)
            }
            if (loserOf) {
              const cur = wrestlerBestPlace.get(loserOf) ?? Infinity
              if (loserPlace < cur) wrestlerBestPlace.set(loserOf, loserPlace)
            }
          }

          const nwc = normalizeWeight(b.weight_class as string | null)
          if (nwc) {
            if (w1) weightByWrestler.set(w1, nwc)
            if (w2) weightByWrestler.set(w2, nwc)
          }

          const w1IsWinner = b.winner === 1
          const rank = classifyOutcome(b.result_type, b.fall_time_seconds, b.winner_score, b.loser_score, w1IsWinner)
          if (rank !== null) recordMatch(tDate, 'tournament_bout', String(b.id), w1, w2, rank, b.round as string, b.weight_class as string | null)
        }

        for (const [wId, place] of wrestlerBestPlace) {
          if (!njWrestlerIds.has(wId)) continue
          const earned = tournamentPointsForPlace(place, ptVal)
          getState(wId).tournamentPlacements.set(event.id, { pointsEarned: earned, won: place === 1 })
        }
      } else {
        // dual meet
        const meetDate = meetDateMap.get(event.id)!
        const matchRows = matchesByMeet.get(event.id) ?? []

        for (const m of matchRows) {
          const aId = m.wrestler_a_id as string | null
          const bId = m.wrestler_b_id as string | null
          if (aId && m.school_a_id) schoolByWrestler.set(aId, m.school_a_id as number)
          if (bId && m.school_b_id) schoolByWrestler.set(bId, m.school_b_id as number)
          if (m.is_double_forfeit || m.is_forfeit_win) continue
          const aIsWinner = m.winner_id === aId
          const dnwc = normalizeWeight(m.weight_class as string | null)
          if (dnwc) {
            if (aId && !weightByWrestler.has(aId)) weightByWrestler.set(aId, dnwc)
            if (bId && !weightByWrestler.has(bId)) weightByWrestler.set(bId, dnwc)
          }
          const rank = classifyOutcome(m.result_type, m.fall_time_seconds, m.winner_score, m.loser_score, aIsWinner)
          if (rank === null) continue
          recordMatch(meetDate, 'dual_meet', String(m.id), aId, bId, rank, '', m.weight_class as string | null)
        }
      }
    }
  }

  // ── 6. Process current-season postseason matches (after all in-season activity) ──────
  // Runs last so pre-match hammers for in-season matches reflect only prior-season base.
  await processPostseasonMatches(CURRENT_SEASON_ID)

  // ── 7. Apply current-season postseason result as final postseasonAdjusted ────────────
  // Now that all matches are scored, overwrite postseasonAdjusted with the
  // wrestler's actual current-season postseason finish so the published hammer score
  // reflects their true current-season standing, not their prior-season base.
  for (const [wId, fact25] of psFactMap25) {
    if (!njWrestlerIds.has(wId)) continue
    const s = states.get(wId)
    if (!s) continue
    s.postseasonAdjusted = postseasonScore(fact25)
  }

  // Build wrestlerMeta: school attrs from schoolByWrestler, district/region from postseason tournament entries.
  type WrestlerMeta = { schoolId: number | null; conference: string | null; section: string | null; classification: string | null; district: number | null; region: number | null }
  const wrestlerMeta = new Map<string, WrestlerMeta>()
  {
    // Seed from dual meet schools (already collected above)
    for (const [wId, schoolId] of schoolByWrestler) {
      wrestlerMeta.set(wId, { schoolId, conference: null, section: null, classification: null, district: null, region: null })
    }

    // Resolve section/classification/conference from schools table
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

    // Resolve district + region directly from postseason tournament entries:
    // A wrestler in a district tournament → that tournament's district_id is their district.
    // A wrestler in a region tournament → that tournament's region_id is their region.
    const { data: psTs } = await db
      .from('tournaments')
      .select('id, tournament_type, district_id, region_id')
      .eq('season_id', CURRENT_SEASON_ID)
      .eq('gender', gender)
      .in('tournament_type', psTypes)

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
          const nwc = normalizeWeight((e.weight_classes as any)?.weight)
          if (nwc) weightByWrestler.set(e.wrestler_id as string, nwc)
          // Supplement school if dual meets didn't cover this wrestler
          if (e.school_id && !schoolByWrestler.has(e.wrestler_id as string)) {
            schoolByWrestler.set(e.wrestler_id as string, e.school_id as number)
          }
          const meta = wrestlerMeta.get(e.wrestler_id as string) ?? { schoolId: e.school_id ?? null, conference: null, section: null, classification: null, district: null, region: null }
          const t = tInfoMap.get(Number(e.tournament_id))
          if (t?.tournament_type === 'districts' && t.district_id && !meta.district) meta.district = t.district_id
          if (t?.region_id && !meta.region) meta.region = t.region_id
          // For state entrants, derive region from their district tournament if region still missing
          wrestlerMeta.set(e.wrestler_id as string, meta)
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

  // ── 6. Write main_weight to wrestlers table ───────────────────────────────────
  // Group by weight class so we do one UPDATE per weight (14 max) instead of per wrestler.
  const byWeight = new Map<string, string[]>()
  for (const [wid, wc] of mainWeightByWrestler) {
    if (!njWrestlerIds.has(wid)) continue   // this run's gender only (a girl in a boys bout kept a boys weight)
    if (!byWeight.has(wc)) byWeight.set(wc, [])
    byWeight.get(wc)!.push(wid)
  }
  for (const [wc, ids] of logOnly ? [] : byWeight) {
    for (let i = 0; i < ids.length; i += 500) {
      const { error } = await db.from('wrestlers').update({ main_weight: wc }).in('id', ids.slice(i, i + 500))
      if (error) throw new Error(`UPDATE wrestlers.main_weight failed: ${error.message}`)
    }
  }

  // ── 7. Write results to DB ────────────────────────────────────────────────────
  // Only this gender's log rows — a season-wide delete wiped the boys log on a
  // girls run (2026-10-26).
  const { error: delLogErr } = await db.from('wrestler_match_score_log').delete()
    .eq('season', CURRENT_SEASON_STR).eq('gender', gender)
  if (delLogErr) throw new Error(`DELETE wrestler_match_score_log failed: ${delLogErr.message}`)
  if (!logOnly) {
    const { error: delScoreErr } = await db.from('wrestler_hammer_scores').delete()
      .eq('season', CURRENT_SEASON_STR).eq('gender', gender)
    if (delScoreErr) throw new Error(`DELETE wrestler_hammer_scores failed: ${delScoreErr.message}`)
  }

  const BATCH = 500
  for (let i = 0; i < logEntries.length; i += BATCH) {
    const { error } = await db.from('wrestler_match_score_log').insert(logEntries.slice(i, i + BATCH))
    if (error) throw new Error(`INSERT wrestler_match_score_log failed at row ${i}: ${error.message}`)
  }

  const scoreRows = [...states.values()]
    .filter(s => s.matchCount > 0 && s.lastMatchDate != null && s.lastMatchDate >= `${season.start_year}-04-01`)
    .map(s => {
      const tourComp  = computeTournamentComponent([...s.tournamentPlacements.values()])
      const matchComp = computeMatchComponent(buildScoreWindow(s))
      const hammer    = totalHammerScore(s.postseasonAdjusted, tourComp, matchComp)
      const meta      = wrestlerMeta.get(s.wrestlerId)
      return {
        wrestler_id:         s.wrestlerId,
        season:              CURRENT_SEASON_STR,
        gender,
        postseason_base:     s.postseasonBase,
        postseason_adjusted: s.postseasonAdjusted,
        tournament_score:    tourComp,
        match_score:         matchComp,
        hammer_score:        hammer,
        match_count:         s.matchCount,
        last_match_date:     s.lastMatchDate,
        weight_class:        weightByWrestler.get(s.wrestlerId) ?? null,
        school_id:           meta?.schoolId ?? null,
        conference:          meta?.conference ?? null,
        section:             meta?.section ?? null,
        classification:      meta?.classification ?? null,
        district:            meta?.district ?? null,
        region:              meta?.region ?? null,
        last_calculated_at:  new Date().toISOString(),
      }
    })

  for (let i = 0; i < (logOnly ? 0 : scoreRows.length); i += BATCH) {
    const { error } = await db.from('wrestler_hammer_scores').insert(scoreRows.slice(i, i + BATCH))
    if (error) throw new Error(`INSERT wrestler_hammer_scores failed at row ${i}: ${error.message}`)
  }

  const duration_ms = Date.now() - startedAt
  const wrestlers_scored = logOnly ? 0 : scoreRows.length
  const bouts_processed  = logEntries.length

  const sb   = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  await db.rpc('log_admin_activity', {
    p_admin_email: user?.email ?? 'cron',
    p_action:      'scoring_run',
    p_entity_type: 'wrestler_hammer_scores',
    p_entity_id:   null,
    p_details: { wrestlers_scored, bouts_processed, duration_ms, season: CURRENT_SEASON_STR, gender, log_only: logOnly },
  })

  return NextResponse.json({ wrestlers_scored, bouts_processed, duration_ms, season: CURRENT_SEASON_STR, gender, log_only: logOnly })
}

// GET handler for Vercel cron job (crons fire GET, not POST)
export async function GET(req: NextRequest) {
  return POST(req)
}
