import { NextRequest, NextResponse } from 'next/server'
import { getWorkingSeason } from '@/lib/season-context'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

// ── Target pool sizes ─────────────────────────────────────────────────────────
const TARGET_DISTRICT_BOYS  = 3
const TARGET_DISTRICT_GIRLS = 4
const TARGET_REGION_BOYS    = 4
const TARGET_REGION_GIRLS   = 6
const TARGET_SECTION        = 20
const TARGET_SECTION_GIRLS  = 12
const TARGET_STATE          = 50
const TARGET_STATE_GIRLS    = 24

const POOL_SIZE_DISTRICT     = 20
const POOL_SIZE_SECTION      = 40
const POOL_SIZE_STATE        = 60   // 10 extra so bubble wrestlers are visible below the cut line
const POOL_SIZE_STATE_GIRLS  = 34

type Stage = 'district' | 'region' | 'section' | 'state'

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function requireAdmin() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data: appUser } = await sb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

// GET /api/admin/individual-rankings/pool
// ?gender=M&weight=106&stage=district&entity=5&season=<label>  (season defaults to the season in progress)
export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const gender  = (searchParams.get('gender') ?? 'M') as 'M' | 'F'
  const weight  = parseInt(searchParams.get('weight') ?? '0', 10)
  const stage   = (searchParams.get('stage') ?? 'district') as Stage
  const entity  = searchParams.get('entity') ?? ''
  const season  = searchParams.get('season') ?? (await getWorkingSeason(gender)).label

  if (!weight || !entity) return NextResponse.json({ error: 'Missing weight or entity' }, { status: 400 })

  const db = createSupabaseAdmin()

  // ── Step 1: Fetch hammer score pool ──────────────────────────────────────────

  type HammerRow = {
    wrestler_id: string
    hammer_score: number
    postseason_adjusted: number
    tournament_score: number
    match_score: number
    match_count: number
    school_id: number | null
    district: number | null
    region: number | null
    section: string | null
  }

  let hammers: HammerRow[] = []

  if (stage === 'district') {
    const entityId = parseInt(entity, 10)
    const { data } = await db
      .from('wrestler_hammer_scores')
      .select('wrestler_id, hammer_score, postseason_adjusted, tournament_score, match_score, match_count, school_id, district, region, section')
      .eq('season', season)
      .eq('gender', gender)
      .eq('weight_class', weight)
      .eq('district', entityId)
      .order('hammer_score', { ascending: false })
      .limit(POOL_SIZE_DISTRICT)
    hammers = (data ?? []) as HammerRow[]

  } else if (stage === 'region') {
    const regionId = parseInt(entity, 10)
    const { data: districtData } = await db
      .from('wrestler_hammer_scores')
      .select('district')
      .eq('season', season)
      .eq('gender', gender)
      .eq('weight_class', weight)
      .eq('region', regionId)
      .not('district', 'is', null)
    const districtIds = [...new Set((districtData ?? []).map((r: { district: number | null }) => r.district).filter(Boolean) as number[])]

    const takePerDistrict = gender === 'F' ? TARGET_DISTRICT_GIRLS : TARGET_DISTRICT_BOYS
    const perDistrictPromises = districtIds.map(did =>
      db.from('wrestler_hammer_scores')
        .select('wrestler_id, hammer_score, postseason_adjusted, tournament_score, match_score, match_count, school_id, district, region, section')
        .eq('season', season)
        .eq('gender', gender)
        .eq('weight_class', weight)
        .eq('district', did)
        .order('hammer_score', { ascending: false })
        .limit(takePerDistrict)
    )
    const results = await Promise.all(perDistrictPromises)
    for (const r of results) hammers.push(...((r.data ?? []) as HammerRow[]))
    hammers.sort((a, b) => b.hammer_score - a.hammer_score)

  } else if (stage === 'section') {
    const limit = gender === 'F' ? 40 : POOL_SIZE_SECTION
    const { data } = await db
      .from('wrestler_hammer_scores')
      .select('wrestler_id, hammer_score, postseason_adjusted, tournament_score, match_score, match_count, school_id, district, region, section')
      .eq('season', season)
      .eq('gender', gender)
      .eq('weight_class', weight)
      .eq('section', entity)
      .order('hammer_score', { ascending: false })
      .limit(limit)
    hammers = (data ?? []) as HammerRow[]

  } else {
    const limit = gender === 'F' ? POOL_SIZE_STATE_GIRLS : POOL_SIZE_STATE
    const { data } = await db
      .from('wrestler_hammer_scores')
      .select('wrestler_id, hammer_score, postseason_adjusted, tournament_score, match_score, match_count, school_id, district, region, section')
      .eq('season', season)
      .eq('gender', gender)
      .eq('weight_class', weight)
      .not('district', 'is', null)
      .order('hammer_score', { ascending: false })
      .limit(limit)
    hammers = (data ?? []) as HammerRow[]
  }

  if (!hammers.length) return NextResponse.json({ wrestlers: [], target_count: 0, stage, entity })

  const wrestlerIds = hammers.map(h => h.wrestler_id)

  // ── Step 2: Wrestler names + school info ─────────────────────────────────────

  type WrestlerNameRow = {
    id: string
    first_name: string | null
    last_name: string | null
    grade: string | null
    schools: { display_name: string } | null
  }

  const nameRows: WrestlerNameRow[] = []
  for (const ids of chunk(wrestlerIds, 100)) {
    const { data } = await db
      .from('wrestlers')
      .select('id, first_name, last_name, grade, schools(display_name)')
      .in('id', ids)
    for (const r of (data ?? []) as any[]) nameRows.push(r)
  }
  const nameMap = new Map(nameRows.map(r => [r.id, r]))

  // ── Step 3: Match score log ───────────────────────────────────────────────────

  type LogRow = {
    wrestler_id: string
    match_date: string
    is_winner: boolean
    opponent_wrestler_id: string | null
    opponent_pre_match_hammer: number
    score_earned: number
    match_source: string
    source_id: string | null
  }

  const allLogs: LogRow[] = []
  for (const ids of chunk(wrestlerIds, 50)) {
    const { data } = await db
      .from('wrestler_match_score_log')
      .select('wrestler_id, match_date, is_winner, opponent_wrestler_id, opponent_pre_match_hammer, score_earned, match_source, source_id')
      .eq('season', season)
      .in('wrestler_id', ids)
      .order('match_date', { ascending: false })
    allLogs.push(...((data ?? []) as LogRow[]))
  }

  const logsByWrestler = new Map<string, LogRow[]>()
  for (const log of allLogs) {
    const arr = logsByWrestler.get(log.wrestler_id) ?? []
    arr.push(log)
    logsByWrestler.set(log.wrestler_id, arr)
  }

  // Bulk-fetch opponent names
  const oppIds = new Set<string>()
  for (const logs of logsByWrestler.values()) {
    for (const log of logs.slice(0, 20)) {
      if (log.opponent_wrestler_id) oppIds.add(log.opponent_wrestler_id)
    }
  }
  const oppNameMap = new Map<string, string>()
  for (const ids of chunk([...oppIds], 100)) {
    const { data } = await db.from('wrestlers').select('id, first_name, last_name').in('id', ids)
    for (const r of (data ?? []) as any[]) {
      oppNameMap.set(r.id, `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim())
    }
  }

  // ── Step 4: Fetch result_type + fall_time_seconds from source tables ──────────
  // Only fetch source records for the 20-match display window per wrestler —
  // fetching from allLogs would over-fetch hundreds of records never shown in the UI.
  const displayLogs = [...logsByWrestler.values()].flatMap(logs => logs.slice(0, 20))
  const dualIds  = [...new Set(displayLogs.filter(l => l.match_source === 'dual_meet'       && l.source_id).map(l => l.source_id as string))]
  const boutIds  = [...new Set(displayLogs.filter(l => l.match_source === 'tournament_bout' && l.source_id).map(l => l.source_id as string))]

  // result_type + fall_time per source_id
  const resultMap = new Map<string, { result_type: string | null; fall_time_seconds: number | null }>()
  // tournament_bout source_id → in_season_tournament_id
  const boutToTournament = new Map<string, string>()

  const dualMatchesTable = gender === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches'
  const istTable  = gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'
  const boutTable = gender === 'F' ? 'tournament_bouts_girls'      : 'tournament_bouts'
  for (const ids of chunk(dualIds, 100)) {
    const { data } = await db.from(dualMatchesTable).select('id, result_type, fall_time_seconds').in('id', ids)
    for (const r of (data ?? []) as any[]) {
      resultMap.set(r.id, { result_type: r.result_type ?? null, fall_time_seconds: r.fall_time_seconds ?? null })
    }
  }
  for (const ids of chunk(boutIds, 100)) {
    const { data } = await db.from(boutTable).select('id, result_type, fall_time_seconds, in_season_tournament_id').in('id', ids)
    for (const r of (data ?? []) as any[]) {
      resultMap.set(r.id, { result_type: r.result_type ?? null, fall_time_seconds: r.fall_time_seconds ?? null })
      if (r.in_season_tournament_id) boutToTournament.set(r.id, r.in_season_tournament_id)
    }
  }

  // ── Step 5: Tournament placements ────────────────────────────────────────────

  // Get all in-season tournament IDs for this season+gender to filter placements
  const { data: seasonTourRows } = await db
    .from(istTable)
    .select('id, name')
    .eq('season', season)
  const seasonTourIdToName = new Map<string, string>((seasonTourRows ?? []).map((t: any) => [t.id, t.name]))
  const seasonTourIds = [...seasonTourIdToName.keys()]

  // Also build a map from all tournament IDs encountered in logs (for fallback names)
  const allEncounteredTourIds = [...new Set([...boutToTournament.values()])]
  const extraTourIdToName = new Map<string, string>()
  const extraToFetch = allEncounteredTourIds.filter(id => !seasonTourIdToName.has(id))
  if (extraToFetch.length) {
    const { data } = await db.from(istTable).select('id, name').in('id', extraToFetch)
    for (const r of (data ?? []) as any[]) extraTourIdToName.set(r.id, r.name)
  }
  function tournamentName(id: string): string | null {
    return seasonTourIdToName.get(id) ?? extraTourIdToName.get(id) ?? null
  }

  // Fetch placements for these wrestlers at this weight in this season's tournaments
  type PlacementRow = { wrestler_id: string; place: number; in_season_tournament_id: string }
  const placementsByWrestler = new Map<string, PlacementRow[]>()
  if (seasonTourIds.length) {
    for (const ids of chunk(wrestlerIds, 100)) {
      const { data } = await db
        .from('tournament_placements')
        .select('wrestler_id, place, in_season_tournament_id')
        .eq('weight_class', weight)
        .in('in_season_tournament_id', seasonTourIds)
        .in('wrestler_id', ids)
      for (const r of (data ?? []) as PlacementRow[]) {
        const arr = placementsByWrestler.get(r.wrestler_id) ?? []
        arr.push(r)
        placementsByWrestler.set(r.wrestler_id, arr)
      }
    }
  }

  // ── Step 6: Assemble response ─────────────────────────────────────────────────

  const targetCount = (() => {
    if (stage === 'district') return gender === 'F' ? TARGET_DISTRICT_GIRLS : TARGET_DISTRICT_BOYS
    if (stage === 'region')   return gender === 'F' ? TARGET_REGION_GIRLS   : TARGET_REGION_BOYS
    if (stage === 'section')  return gender === 'F' ? TARGET_SECTION_GIRLS  : TARGET_SECTION
    return gender === 'F' ? TARGET_STATE_GIRLS : TARGET_STATE
  })()

  const wrestlers = hammers.map((h, idx) => {
    const nameInfo = nameMap.get(h.wrestler_id)
    // Compute W-L from the full season log, then slice to 20 for display only.
    const allWrestlerLogs = logsByWrestler.get(h.wrestler_id) ?? []
    const wins   = allWrestlerLogs.filter(l => l.is_winner).length
    const losses = allWrestlerLogs.filter(l => !l.is_winner).length
    const logs   = allWrestlerLogs.slice(0, 20)

    const winLogs  = logs.filter(l => l.is_winner  && l.opponent_wrestler_id)
    const lossLogs = logs.filter(l => !l.is_winner && l.opponent_wrestler_id)

    function oppRefFromLog(log: LogRow) {
      if (!log.opponent_wrestler_id) return null
      const result = log.source_id ? resultMap.get(log.source_id) : null
      return {
        opp_name:           oppNameMap.get(log.opponent_wrestler_id) ?? 'Unknown',
        opp_hammer:         log.opponent_pre_match_hammer,
        result_type:        result?.result_type ?? null,
        fall_time_seconds:  result?.fall_time_seconds ?? null,
      }
    }

    let bestWin = null
    if (winLogs.length) {
      const top = winLogs.reduce((a, b) => b.opponent_pre_match_hammer > a.opponent_pre_match_hammer ? b : a)
      if (top.opponent_pre_match_hammer > 0 && top.opponent_wrestler_id) bestWin = oppRefFromLog(top)
    }

    let notableLoss = null
    if (lossLogs.length) {
      const top = lossLogs.reduce((a, b) => b.opponent_pre_match_hammer > a.opponent_pre_match_hammer ? b : a)
      if (top.opponent_pre_match_hammer > 0 && top.opponent_wrestler_id) notableLoss = oppRefFromLog(top)
    }

    let worstLoss = null
    if (lossLogs.length) {
      const withOpp = lossLogs.filter(l => l.opponent_pre_match_hammer > 0)
      if (withOpp.length) {
        const bot = withOpp.reduce((a, b) => b.opponent_pre_match_hammer < a.opponent_pre_match_hammer ? b : a)
        if (bot.opponent_wrestler_id) worstLoss = oppRefFromLog(bot)
      }
    }

    // Recent form: last 5 matches
    const recent = logs.slice(0, 5).map(l => ({
      date:               l.match_date,
      is_winner:          l.is_winner,
      opp_hammer:         l.opponent_pre_match_hammer,
      opp_name:           l.opponent_wrestler_id ? (oppNameMap.get(l.opponent_wrestler_id) ?? null) : null,
      source:             l.match_source,
      result_type:        l.source_id ? (resultMap.get(l.source_id)?.result_type ?? null) : null,
      fall_time_seconds:  l.source_id ? (resultMap.get(l.source_id)?.fall_time_seconds ?? null) : null,
    }))

    // Best tournament finish
    const placements = placementsByWrestler.get(h.wrestler_id) ?? []
    let bestTournament: { tournament_name: string; place: number | null } | null = null
    if (placements.length) {
      const best = placements.reduce((a, b) => b.place < a.place ? b : a)
      bestTournament = {
        tournament_name: tournamentName(best.in_season_tournament_id) ?? 'Unknown',
        place: best.place,
      }
    } else {
      // No placement — show the best (most recent) tournament they wrestled at
      const boutLogs = (logsByWrestler.get(h.wrestler_id) ?? []).filter(l => l.match_source === 'tournament_bout' && l.source_id)
      for (const log of boutLogs) {
        const tid = log.source_id ? boutToTournament.get(log.source_id) : null
        if (tid) {
          const name = tournamentName(tid)
          if (name) { bestTournament = { tournament_name: name, place: null }; break }
        }
      }
    }

    return {
      pool_rank:           idx + 1,
      in_target:           idx < targetCount,
      wrestler_id:         h.wrestler_id,
      first_name:          nameInfo?.first_name ?? '',
      last_name:           nameInfo?.last_name  ?? '',
      school_name:         (nameInfo?.schools as any)?.display_name ?? '',
      school_id:           h.school_id,
      grade:               nameInfo?.grade ?? null,
      hammer_score:        h.hammer_score,
      postseason_adjusted: h.postseason_adjusted,
      tournament_score:    h.tournament_score,
      match_score:         h.match_score,
      match_count:         h.match_count,
      wins,
      losses,
      best_win:            bestWin,
      notable_loss:        notableLoss,
      worst_loss:          worstLoss,
      recent,
      best_tournament:     bestTournament,
    }
  })

  return NextResponse.json({ wrestlers, target_count: targetCount, stage, entity })
}
