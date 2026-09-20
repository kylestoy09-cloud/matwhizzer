import { NextRequest, NextResponse } from 'next/server'
import { getSeasons } from '@/lib/seasons-server'
import { liveSeasonId, seasonLabel } from '@/lib/seasons'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { getExpectedOutcomeRank, OUTCOME_LABELS } from '@/lib/hammerScore'

export const dynamic = 'force-dynamic'

export type DirectMatch = {
  date: string
  event: string
  eventType: 'dual' | 'tournament' | 'postseason'
  winner: 'a' | 'b'
  resultType: string | null
  detail: string | null
  weightClass: string | null
}

export type MatchDetail = {
  date: string
  event: string
  won: boolean
  resultType: string | null
  detail: string | null
  fallTimeSecs: number | null
  myScore: number | null
  oppScore: number | null
}

export type OpponentRecord = {
  opponent: { id: string; first_name: string; last_name: string; school_name: string | null }
  aWins: number
  aLosses: number
  bWins: number
  bLosses: number
  aMatches: MatchDetail[]
  bMatches: MatchDetail[]
}

export type PredictionResult = {
  favoredWrestler: 'a' | 'b' | 'even'
  outcomeLabel: string
  score: number
  hammerA: number | null
  hammerB: number | null
  componentHammer: number
  componentCommonOpp: number | null
  componentH2H: number | null
  weights: { hammer: number; commonOpp: number; h2h: number }
}

export type H2HResponse = {
  wrestlerA: { id: string; first_name: string; last_name: string }
  wrestlerB: { id: string; first_name: string; last_name: string }
  directMatches: DirectMatch[]
  commonOpponents: OpponentRecord[]
  prediction: PredictionResult
}

// ── Prediction helpers ────────────────────────────────────────────────────────

function rankToScore(rank: number): number {
  if (rank <= 12) return 42 - 2 * rank          // 40 … 18
  if (rank <= 16) return 4 * (17 - rank)         // 16, 12, 8, 4
  if (rank <= 20) return -4 * (rank - 16)        // -4, -8, -12, -16
  return -2 * rank + 24                           // -18 … -40
}

function getMatchOutcomeScore(
  resultType: string | null,
  fallTimeSecs: number | null,
  myScore: number | null,
  oppScore: number | null,
  won: boolean,
): number | null {
  const rt = (resultType ?? '').toUpperCase()
  let rank: number
  if (rt === 'FALL') {
    const s = fallTimeSecs ?? 360
    const base = s < 60 ? 1 : s < 120 ? 3 : s < 180 ? 5 : s < 240 ? 7 : s < 300 ? 9 : 11
    rank = won ? base : 33 - base
  } else if (rt === 'TF' || rt === 'TF-1.5' || rt === 'TF-2') {
    const s = fallTimeSecs ?? 300
    const base = s < 60 ? 2 : s < 120 ? 4 : s < 180 ? 6 : s < 240 ? 8 : s < 300 ? 10 : 12
    rank = won ? base : 33 - base
  } else if (rt === 'MD') {
    rank = won ? 13 : 20
  } else if (rt === 'DEC') {
    const margin = Math.abs((myScore ?? 0) - (oppScore ?? 0))
    rank = won ? (margin >= 4 ? 14 : 15) : (margin >= 4 ? 19 : 18)
  } else if (rt === 'SV-1' || rt === 'UTB') {
    rank = won ? 16 : 17
  } else {
    return null
  }
  return rankToScore(rank)
}

function nearestWinLabel(absScore: number): string {
  let bestRank = 1
  let bestDist = Math.abs(absScore - rankToScore(1))
  for (let r = 2; r <= 16; r++) {
    const dist = Math.abs(absScore - rankToScore(r))
    if (dist < bestDist) { bestRank = r; bestDist = dist }
  }
  return OUTCOME_LABELS[bestRank] ?? 'Decision'
}

function fmtDetail(resultType: string | null, winnerScore: number | null, loserScore: number | null, fallTimeSecs: number | null): string | null {
  if (!resultType) return null
  const rt = resultType.toUpperCase()
  if (rt === 'FALL' || rt === 'TF') {
    if (fallTimeSecs != null) {
      const m = Math.floor(fallTimeSecs / 60)
      const s = String(fallTimeSecs % 60).padStart(2, '0')
      const score = winnerScore != null && loserScore != null ? ` (${winnerScore}-${loserScore})` : ''
      return `${m}:${s}${score}`
    }
  }
  if (winnerScore != null && loserScore != null) return `${winnerScore}-${loserScore}`
  return null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const idA = searchParams.get('a')
  const idB = searchParams.get('b')
  const excludeMeet = searchParams.get('exclude_meet') // exclude current meet from history
  const gender: 'M' | 'F' = searchParams.get('gender') === 'F' ? 'F' : 'M'
  const dualMatchesTable = gender === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches'
  const dualMeetsTable   = gender === 'F' ? 'dual_meets_girls'        : 'dual_meets'
  if (!idA || !idB) return NextResponse.json({ error: 'Missing wrestler ids' }, { status: 400 })

  const seasons = await getSeasons()
  const seasonById = new Map(seasons.map(x => [x.id, x]))
  const hammerSeasonLabel = seasonLabel(seasons, liveSeasonId(seasons, gender) ?? 0)

  const db = createSupabaseAdmin()

  // ── Wrestler names ────────────────────────────────────────────────────────
  const { data: names } = await db
    .from('wrestlers')
    .select('id, first_name, last_name')
    .in('id', [idA, idB])

  const nameMap = new Map((names ?? []).map(w => [w.id as string, w as { id: string; first_name: string; last_name: string }]))
  const wrestlerA = nameMap.get(idA)
  const wrestlerB = nameMap.get(idB)
  if (!wrestlerA || !wrestlerB) return NextResponse.json({ error: 'Wrestler not found' }, { status: 404 })

  // ── Per-wrestler match history ────────────────────────────────────────────
  // Keyed by wrestler_id → array of { opponentId, date, event, won, resultType, detail }
  type MatchEntry = {
    opponentId: string
    date: string
    event: string
    eventType: 'dual' | 'tournament' | 'postseason'
    won: boolean
    resultType: string | null
    detail: string | null
    weightClass: string | null
    fallTimeSecs: number | null
    myScore: number | null
    oppScore: number | null
  }

  const historyA: MatchEntry[] = []
  const historyB: MatchEntry[] = []

  // ── 1. Dual meet matches ──────────────────────────────────────────────────
  {
    // Fetch all dual_meet_matches for either wrestler
    const fetchDuals = async (wId: string) => {
      const asSide = async (side: 'a' | 'b') => {
        const col = side === 'a' ? 'wrestler_a_id' : 'wrestler_b_id'
        const oppCol = side === 'a' ? 'wrestler_b_id' : 'wrestler_a_id'
        const baseQ = db
          .from(dualMatchesTable)
          .select(`id, wrestler_a_id, wrestler_b_id, winner_id, result_type, winner_score, loser_score, fall_time_seconds, weight_class, dual_meet_id, ${dualMeetsTable}(meet_date)`)
          .eq(col, wId)
          .not(oppCol, 'is', null)
        const { data } = excludeMeet
          ? await baseQ.neq('dual_meet_id', excludeMeet)
          : await baseQ
        return (data ?? []).map((m: any) => {
          const won = m.winner_id === wId
          return {
            opponentId: m[oppCol] as string,
            date: (m[dualMeetsTable] as any)?.meet_date ?? '',
            event: 'Dual Meet',
            eventType: 'dual' as const,
            won,
            resultType: m.result_type as string | null,
            detail: fmtDetail(m.result_type, won ? m.winner_score : m.loser_score, won ? m.loser_score : m.winner_score, m.fall_time_seconds),
            weightClass: m.weight_class as string | null,
            fallTimeSecs: m.fall_time_seconds as number | null,
            myScore: (won ? m.winner_score : m.loser_score) as number | null,
            oppScore: (won ? m.loser_score : m.winner_score) as number | null,
          }
        })
      }
      return [...await asSide('a'), ...await asSide('b')]
    }

    const [da, db2] = await Promise.all([fetchDuals(idA), fetchDuals(idB)])
    historyA.push(...da)
    historyB.push(...db2)
  }

  // ── 2. In-season tournament bouts ─────────────────────────────────────────
  {
    const fetchBouts = async (wId: string) => {
      const asSide = async (side: 1 | 2) => {
        const col = side === 1 ? 'wrestler1_id' : 'wrestler2_id'
        const oppCol = side === 1 ? 'wrestler2_id' : 'wrestler1_id'
        const boutTable = gender === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts'
        const tournAlias = gender === 'F'
          ? 'tourn:in_season_tournaments_girls(name, start_date)'
          : 'tourn:in_season_tournaments(name, start_date)'
        const { data } = await db
          .from(boutTable)
          .select(`id, wrestler1_id, wrestler2_id, winner, result_type, winner_score, loser_score, fall_time_seconds, weight_class, ${tournAlias}`)
          .eq(col, wId)
          .not(oppCol, 'is', null)
        return (data ?? []).map((b: any) => {
          const won = b.winner === side
          return {
            opponentId: b[oppCol] as string,
            date: (b.tourn as any)?.start_date ?? '',
            event: (b.tourn as any)?.name ?? 'Tournament',
            eventType: 'tournament' as const,
            won,
            resultType: b.result_type as string | null,
            detail: fmtDetail(b.result_type, won ? b.winner_score : b.loser_score, won ? b.loser_score : b.winner_score, b.fall_time_seconds),
            weightClass: b.weight_class as string | null,
            fallTimeSecs: b.fall_time_seconds as number | null,
            myScore: (won ? b.winner_score : b.loser_score) as number | null,
            oppScore: (won ? b.loser_score : b.winner_score) as number | null,
          }
        })
      }
      return [...await asSide(1), ...await asSide(2)]
    }

    const [ba, bb] = await Promise.all([fetchBouts(idA), fetchBouts(idB)])
    historyA.push(...ba)
    historyB.push(...bb)
  }

  // ── 3. Postseason bracket matches ─────────────────────────────────────────
  {
    const fetchPostseason = async (wId: string) => {
      // Get all entry IDs for this wrestler
      const { data: entries } = await db
        .from('tournament_entries')
        .select('id, tournament_id, tournaments(tournament_type, season_id, district_id, region_id)')
        .eq('wrestler_id', wId)

      if (!entries?.length) return []

      const entryIds = entries.map(e => e.id as string)
      const entryToTournament = new Map(entries.map(e => [e.id as string, e.tournaments as any]))

      const results: MatchEntry[] = []
      const CHUNK = 50

      for (let i = 0; i < entryIds.length; i += CHUNK) {
        const chunk = entryIds.slice(i, i + CHUNK)
        const { data: wMatches } = await db
          .from('matches')
          .select('id, winner_entry_id, loser_entry_id, round, win_type, winner_score, loser_score, fall_time_seconds')
          .in('winner_entry_id', chunk)
          .eq('validated', true)
        const { data: lMatches } = await db
          .from('matches')
          .select('id, winner_entry_id, loser_entry_id, round, win_type, winner_score, loser_score, fall_time_seconds')
          .in('loser_entry_id', chunk)
          .eq('validated', true)

        for (const m of [...(wMatches ?? []), ...(lMatches ?? [])]) {
          const won = entryIds.includes(m.winner_entry_id as string)
          const myEntryId = won ? m.winner_entry_id : m.loser_entry_id
          const oppEntryId = won ? m.loser_entry_id : m.winner_entry_id
          if (!oppEntryId) continue

          const t = entryToTournament.get(myEntryId as string)
          const tType = t?.tournament_type ?? 'postseason'
          const seasonId = t?.season_id
          const seasonRow = seasonId != null ? seasonById.get(seasonId) : undefined
          const season = seasonRow?.label ?? String(seasonId ?? '')
          const round =
            tType === 'boys_state' || tType === 'girls_state'   ? 'State'
          : tType === 'regions'    || tType === 'girls_regions' ? 'Regions'
          : tType === 'districts'                               ? 'Districts'
          : null
          const eventLabel = round ? `${season} ${round}` : 'Postseason'
          // Postseason bouts carry no date; approximate from the season so history sorts chronologically.
          const postseasonDate = seasonRow
            ? `${seasonRow.end_year}-${round === 'State' ? '03-13' : round === 'Regions' ? '03-06' : '02-27'}`
            : '1900-01-01'

          const rt = m.win_type as string | null
          results.push({
            opponentId: oppEntryId as string, // entry ID, resolved below
            date: postseasonDate,
            event: eventLabel,
            eventType: 'postseason',
            won,
            resultType: rt,
            detail: fmtDetail(rt, won ? m.winner_score : m.loser_score, won ? m.loser_score : m.winner_score, m.fall_time_seconds),
            weightClass: null,
            fallTimeSecs: m.fall_time_seconds as number | null,
            myScore: (won ? m.winner_score : m.loser_score) as number | null,
            oppScore: (won ? m.loser_score : m.winner_score) as number | null,
          })
        }
      }

      // Resolve entry IDs → wrestler IDs
      const oppEntryIds = [...new Set(results.map(r => r.opponentId))]
      const { data: oppEntries } = await db
        .from('tournament_entries')
        .select('id, wrestler_id')
        .in('id', oppEntryIds)
      const entryToWrestler = new Map((oppEntries ?? []).map(e => [e.id as string, e.wrestler_id as string]))
      for (const r of results) {
        r.opponentId = entryToWrestler.get(r.opponentId) ?? r.opponentId
      }

      return results
    }

    const [pa, pb] = await Promise.all([fetchPostseason(idA), fetchPostseason(idB)])
    historyA.push(...pa)
    historyB.push(...pb)
  }

  // ── Direct matchups ───────────────────────────────────────────────────────
  const directMatches: DirectMatch[] = []
  for (const m of historyA) {
    if (m.opponentId === idB) {
      directMatches.push({
        date: m.date,
        event: m.event,
        eventType: m.eventType,
        winner: m.won ? 'a' : 'b',
        resultType: m.resultType,
        detail: m.detail,
        weightClass: m.weightClass,
      })
    }
  }
  directMatches.sort((a, b) => a.date.localeCompare(b.date))

  // ── Common opponents ──────────────────────────────────────────────────────
  const oppsA = new Set(historyA.filter(m => m.opponentId !== idB).map(m => m.opponentId))
  const oppsB = new Set(historyB.filter(m => m.opponentId !== idA).map(m => m.opponentId))
  const commonIds = [...oppsA].filter(id => oppsB.has(id))

  // Fetch names for all common opponents
  // wrestlers table has no FK to schools; get school via tournament_entries → schools
  const oppNames = new Map<string, { id: string; first_name: string; last_name: string; school_name: string | null }>()
  for (let i = 0; i < commonIds.length; i += 100) {
    const chunk = commonIds.slice(i, i + 100)
    // Step 1: wrestler names
    const { data: wData } = await db
      .from('wrestlers')
      .select('id, first_name, last_name')
      .in('id', chunk)
    for (const w of (wData ?? [])) {
      oppNames.set(w.id as string, {
        id: w.id as string,
        first_name: w.first_name as string,
        last_name: w.last_name as string,
        school_name: null,
      })
    }
    // Step 2: school name via tournament_entries (use first match found per wrestler)
    const { data: eData } = await db
      .from('tournament_entries')
      .select('wrestler_id, schools(display_name)')
      .in('wrestler_id', chunk)
    for (const e of (eData ?? [])) {
      const wId = e.wrestler_id as string
      const existing = oppNames.get(wId)
      if (existing && existing.school_name === null) {
        existing.school_name = (e as any).schools?.display_name ?? null
      }
    }
  }

  const commonOpponents: OpponentRecord[] = commonIds
    .map(oppId => {
      const opp = oppNames.get(oppId)
      if (!opp) return null
      const aMs = historyA.filter(m => m.opponentId === oppId)
      const bMs = historyB.filter(m => m.opponentId === oppId)
      return {
        opponent: opp,
        aWins:   aMs.filter(m => m.won).length,
        aLosses: aMs.filter(m => !m.won).length,
        bWins:   bMs.filter(m => m.won).length,
        bLosses: bMs.filter(m => !m.won).length,
        aMatches: aMs.sort((a, b) => a.date.localeCompare(b.date)).map(m => ({ date: m.date, event: m.event, won: m.won, resultType: m.resultType, detail: m.detail, fallTimeSecs: m.fallTimeSecs, myScore: m.myScore, oppScore: m.oppScore })),
        bMatches: bMs.sort((a, b) => a.date.localeCompare(b.date)).map(m => ({ date: m.date, event: m.event, won: m.won, resultType: m.resultType, detail: m.detail, fallTimeSecs: m.fallTimeSecs, myScore: m.myScore, oppScore: m.oppScore })),
      }
    })
    .filter(Boolean) as OpponentRecord[]

  // Sort common opponents: most total matches first, then alphabetically
  commonOpponents.sort((a, b) => {
    const totalA = a.aMatches.length + a.bMatches.length
    const totalB = b.aMatches.length + b.bMatches.length
    if (totalB !== totalA) return totalB - totalA
    return a.opponent.last_name.localeCompare(b.opponent.last_name)
  })

  // ── Prediction ────────────────────────────────────────────────────────────
  const { data: hammerRows } = await db
    .from('wrestler_hammer_scores')
    .select('wrestler_id, hammer_score')
    .in('wrestler_id', [idA, idB])
    .eq('season', hammerSeasonLabel ?? '')

  const hammerMap = new Map((hammerRows ?? []).map(h => [h.wrestler_id as string, h.hammer_score as number]))
  const hammerA = hammerMap.get(idA) ?? null
  const hammerB = hammerMap.get(idB) ?? null

  // Hammer component (from A's perspective; positive = A favored)
  let componentHammer = 0
  if (hammerA !== null && hammerB !== null) {
    const diff = hammerA - hammerB
    const expectedRank = getExpectedOutcomeRank(Math.abs(diff))
    const expectedScore = rankToScore(expectedRank)
    componentHammer = diff >= 0 ? expectedScore : -expectedScore
  }

  // Common opponent component (avg of A_score - B_score per opponent)
  let componentCommonOpp: number | null = null
  {
    let totalDiff = 0; let count = 0
    for (const opp of commonOpponents) {
      const scoresA = opp.aMatches
        .map(m => getMatchOutcomeScore(m.resultType, m.fallTimeSecs, m.myScore, m.oppScore, m.won))
        .filter((s): s is number => s !== null)
      const scoresB = opp.bMatches
        .map(m => getMatchOutcomeScore(m.resultType, m.fallTimeSecs, m.myScore, m.oppScore, m.won))
        .filter((s): s is number => s !== null)
      if (!scoresA.length || !scoresB.length) continue
      const avgA = scoresA.reduce((a, b) => a + b, 0) / scoresA.length
      const avgB = scoresB.reduce((a, b) => a + b, 0) / scoresB.length
      totalDiff += avgA - avgB
      count++
    }
    if (count > 0) componentCommonOpp = totalDiff / count
  }

  // H2H component (avg outcome score from A's perspective)
  let componentH2H: number | null = null
  {
    const h2hScores = historyA
      .filter(m => m.opponentId === idB)
      .map(m => getMatchOutcomeScore(m.resultType, m.fallTimeSecs, m.myScore, m.oppScore, m.won))
      .filter((s): s is number => s !== null)
    if (h2hScores.length > 0) {
      componentH2H = h2hScores.reduce((a, b) => a + b, 0) / h2hScores.length
    }
  }

  // Weighted average
  const hasH2H = componentH2H !== null
  const hasComm = componentCommonOpp !== null
  let weights: { hammer: number; commonOpp: number; h2h: number }
  let rawScore: number
  if (hasH2H && hasComm) {
    weights = { hammer: 0.25, commonOpp: 0.25, h2h: 0.50 }
    rawScore = 0.25 * componentHammer + 0.25 * componentCommonOpp! + 0.50 * componentH2H!
  } else if (hasH2H) {
    weights = { hammer: 0.50, commonOpp: 0, h2h: 0.50 }
    rawScore = 0.50 * componentHammer + 0.50 * componentH2H!
  } else if (hasComm) {
    weights = { hammer: 0.50, commonOpp: 0.50, h2h: 0 }
    rawScore = 0.50 * componentHammer + 0.50 * componentCommonOpp!
  } else {
    weights = { hammer: 1.0, commonOpp: 0, h2h: 0 }
    rawScore = componentHammer
  }
  rawScore = Math.max(-40, Math.min(40, rawScore))

  const favoredWrestler: 'a' | 'b' | 'even' = rawScore > 0 ? 'a' : rawScore < 0 ? 'b' : 'even'
  const outcomeLabel = rawScore === 0 ? 'Toss-up' : nearestWinLabel(Math.abs(rawScore))

  const prediction: PredictionResult = {
    favoredWrestler,
    outcomeLabel,
    score: rawScore,
    hammerA,
    hammerB,
    componentHammer,
    componentCommonOpp,
    componentH2H,
    weights,
  }

  return NextResponse.json({
    wrestlerA,
    wrestlerB,
    directMatches,
    commonOpponents,
    prediction,
  } satisfies H2HResponse)
}
