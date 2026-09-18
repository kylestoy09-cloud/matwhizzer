import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import {
  TIER_MAP, OOS_TIER, stateTierKey, regionTierKey, districtTierKey, matchCaliberPts,
  type TierKey, type TierRow, type MatchCaliberRecord, type PreSeedRow,
} from '@/lib/districtPreseed'

export const dynamic = 'force-dynamic'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isFallType(rt: string | null): boolean {
  if (!rt) return false
  const s = rt.toUpperCase()
  return s === 'FALL' || s === 'TF' || s === 'TF-1.5' || s === 'TF-2' || s.startsWith('TF')
}

function isDecisionLoss(rt: string | null): boolean {
  if (!rt) return false
  const s = rt.toUpperCase()
  return s === 'DEC' || s === 'MD' || s === 'SV-1' || s === 'UTB'
}

// Chunk large .in() queries to avoid URL length limits
async function chunkIn<T>(
  db: ReturnType<typeof createSupabaseAdmin>,
  table: string,
  column: string,
  ids: (string | number)[],
  selectStr: string,
  extra: Array<{ col: string; val: unknown }> = [],
  chunkSize = 50,
): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; i < ids.length; i += chunkSize) {
    let q = db.from(table).select(selectStr).in(column, ids.slice(i, i + chunkSize) as string[])
    for (const f of extra) q = (q as any).eq(f.col, f.val)
    const { data } = await q
    out.push(...((data as T[]) ?? []))
  }
  return out
}

// ─── Prior-year advancement tier computation ──────────────────────────────────

type WrestlerFact = {
  // State
  statePlacement: number | null
  madeState: boolean
  stateWins: number
  // Region (non-state qualifiers)
  regionMade5th: boolean
  regionMade6th: boolean
  regionConsWins: number
  madeRegion: boolean
  // District (non-region qualifiers)
  distMade4th: boolean
  distMadeQF: boolean
  madeDistrict: boolean
}

async function computePriorYearTiers(
  db: ReturnType<typeof createSupabaseAdmin>,
  priorSeasonId: number,
  gender: 'M' | 'F',
): Promise<Map<string, TierRow>> {
  const PS_TYPE = gender === 'M' ? 'boys_state' : 'girls_state'

  const { data: psTs } = await db
    .from('tournaments')
    .select('id, tournament_type')
    .eq('season_id', priorSeasonId)
    .eq('gender', gender)
    .in('tournament_type', ['districts', 'regions', PS_TYPE])

  if (!psTs?.length) return new Map()

  const tByType = new Map<string, number[]>()
  for (const t of psTs) {
    const arr = tByType.get(t.tournament_type) ?? []
    arr.push(t.id)
    tByType.set(t.tournament_type, arr)
  }

  const allTIds = psTs.map(t => String(t.id))

  // Load all entries
  type EntryRow = { id: string; wrestler_id: string; tournament_id: number }
  const allEntries: EntryRow[] = []
  for (let off = 0; ; off += 1000) {
    const { data } = await db
      .from('tournament_entries')
      .select('id, wrestler_id, tournament_id')
      .in('tournament_id', allTIds)
      .range(off, off + 999)
    if (!data?.length) break
    allEntries.push(...(data as EntryRow[]))
    if (data.length < 1000) break
  }

  if (!allEntries.length) return new Map()

  const entryIds = allEntries.map(e => e.id)
  const entryToWrestler = new Map(allEntries.map(e => [e.id, e.wrestler_id]))
  const entryToTournament = new Map(allEntries.map(e => [e.id, e.tournament_id]))

  const wrestlerToTournaments = new Map<string, number[]>()
  for (const e of allEntries) {
    const arr = wrestlerToTournaments.get(e.wrestler_id) ?? []
    arr.push(e.tournament_id)
    wrestlerToTournaments.set(e.wrestler_id, arr)
  }

  // Load all validated matches
  type MatchRow = {
    id: string; round: string | null; win_type: string | null
    winner_entry_id: string | null; loser_entry_id: string | null
  }
  const sel = 'id, round, win_type, winner_entry_id, loser_entry_id'
  const wm = await chunkIn<MatchRow>(db, 'matches', 'winner_entry_id', entryIds, sel, [{ col: 'validated', val: true }])
  const lm = await chunkIn<MatchRow>(db, 'matches', 'loser_entry_id',  entryIds, sel, [{ col: 'validated', val: true }])
  const matchMap = new Map<string, MatchRow>()
  for (const m of [...wm, ...lm]) matchMap.set(m.id, m)
  const allMatches = [...matchMap.values()]

  // Build facts per wrestler
  const facts = new Map<string, WrestlerFact>()

  function getFact(wId: string): WrestlerFact {
    if (!facts.has(wId)) {
      facts.set(wId, {
        statePlacement: null, madeState: false, stateWins: 0,
        regionMade5th: false, regionMade6th: false, regionConsWins: 0, madeRegion: false,
        distMade4th: false, distMadeQF: false, madeDistrict: false,
      })
    }
    return facts.get(wId)!
  }

  // Mark entries (minimum participation)
  for (const e of allEntries) {
    const f = getFact(e.wrestler_id)
    const tId = e.tournament_id
    const isState  = (tByType.get(PS_TYPE) ?? []).includes(tId)
    const isRegion = (tByType.get('regions') ?? []).includes(tId)
    const isDist   = (tByType.get('districts') ?? []).includes(tId)
    if (isState)  f.madeState   = true
    if (isRegion) f.madeRegion  = true
    if (isDist)   f.madeDistrict = true
  }

  // Process match outcomes
  const CONS_ROUNDS = new Set(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'CF',
    'Cons. Quarters', 'Cons. Semis', 'CQF', 'CSF'])
  const QF_ROUNDS = new Set(['QF', 'Cons. Quarters', 'CQF', 'Round 2', 'R2'])

  for (const m of allMatches) {
    const round = m.round ?? ''

    // Process winner
    if (m.winner_entry_id) {
      const wId = entryToWrestler.get(m.winner_entry_id)
      const tId = entryToTournament.get(m.winner_entry_id)
      if (wId && tId) {
        const f = getFact(wId)
        const isState  = (tByType.get(PS_TYPE) ?? []).includes(tId)
        const isRegion = (tByType.get('regions') ?? []).includes(tId)
        const isDist   = (tByType.get('districts') ?? []).includes(tId)

        if (isState) {
          f.stateWins++
          if (round === 'F')         f.statePlacement = 1
          else if (round === '3rd_Place' && f.statePlacement !== 1)  f.statePlacement = 3
          else if (round === '5th_Place' && (!f.statePlacement || f.statePlacement > 4)) f.statePlacement = 5
          else if (round === '7th_Place' && (!f.statePlacement || f.statePlacement > 6)) f.statePlacement = 7
        }
        if (isRegion) {
          if (round === '5th_Place') f.regionMade5th = true
          if (CONS_ROUNDS.has(round)) f.regionConsWins++
        }
        if (isDist) {
          if (round === '3rd_Place') { /* winner = 3rd → advances to regions */ }
          if (QF_ROUNDS.has(round))  f.distMadeQF = true
        }
      }
    }

    // Process loser
    if (m.loser_entry_id) {
      const wId = entryToWrestler.get(m.loser_entry_id)
      const tId = entryToTournament.get(m.loser_entry_id)
      if (wId && tId) {
        const f = getFact(wId)
        const isState  = (tByType.get(PS_TYPE) ?? []).includes(tId)
        const isRegion = (tByType.get('regions') ?? []).includes(tId)
        const isDist   = (tByType.get('districts') ?? []).includes(tId)

        if (isState) {
          if (round === 'F'         && !f.statePlacement)                f.statePlacement = 2
          else if (round === '3rd_Place' && (!f.statePlacement || f.statePlacement === 3)) f.statePlacement = 4
          else if (round === '5th_Place' && (!f.statePlacement || f.statePlacement > 5))   f.statePlacement = 6
          else if (round === '7th_Place' && (!f.statePlacement || f.statePlacement > 7))   f.statePlacement = 8
        }
        if (isRegion) {
          if (round === '5th_Place') f.regionMade6th = true
          if (QF_ROUNDS.has(round))  f.distMadeQF = true // reached at least QF level
        }
        if (isDist) {
          if (round === '3rd_Place') f.distMade4th = true
          if (QF_ROUNDS.has(round))  f.distMadeQF = true
        }
      }
    }
  }

  // Convert facts → tier rows
  const tierMap = new Map<string, TierRow>()
  const stateIds = new Set(
    allEntries.filter(e => (tByType.get(PS_TYPE) ?? []).includes(e.tournament_id)).map(e => e.wrestler_id)
  )
  const regionIds = new Set(
    allEntries.filter(e => (tByType.get('regions') ?? []).includes(e.tournament_id)).map(e => e.wrestler_id)
  )

  for (const [wId, f] of facts) {
    let key: TierKey
    if (stateIds.has(wId)) {
      key = stateTierKey(f.statePlacement, f.stateWins)
    } else if (regionIds.has(wId)) {
      key = regionTierKey(f.regionMade5th, f.regionMade6th, f.regionConsWins)
    } else if (f.madeDistrict) {
      key = districtTierKey(f.distMade4th, f.distMadeQF)
    } else {
      key = 'never'
    }
    tierMap.set(wId, TIER_MAP[key])
  }

  return tierMap
}

// ─── Current season match processing ─────────────────────────────────────────

type RawMatch = {
  oppId: string | null
  isOOS: boolean
  isWin: boolean
  isFall: boolean
  isForfeit: boolean
  isDecLoss: boolean
  date: string
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const gender  = (searchParams.get('gender') ?? 'M') as 'M' | 'F'
  const season  = searchParams.get('season') ?? '2025-26'
  const weight  = searchParams.get('weight') ?? 'all'  // e.g. "157" or "all"

  const db = createSupabaseAdmin()

  // Look up season IDs
  const { data: seasons } = await db
    .from('seasons')
    .select('id, year_label')
    .order('id', { ascending: false })
    .limit(10)

  const currentSeason = seasons?.find(s => s.year_label === season)
  if (!currentSeason) return NextResponse.json({ error: `Season "${season}" not found` }, { status: 404 })

  const currentSeasonId = currentSeason.id as number
  const priorSeasonId   = currentSeasonId - 1  // assumes sequential IDs

  // ── Step 1: Prior-year tiers ──────────────────────────────────────────────
  const tierMap = await computePriorYearTiers(db, priorSeasonId, gender)

  // ── Step 2: NJ wrestler set ───────────────────────────────────────────────
  const njIds = new Set<string>()
  for (let off = 0; ; off += 1000) {
    const { data } = await db
      .from('wrestlers')
      .select('id')
      .or('is_oos.is.null,is_oos.eq.false')
      .range(off, off + 999)
    if (!data?.length) break
    for (const r of data) njIds.add(r.id as string)
    if (data.length < 1000) break
  }

  // ── Step 3: Current season matches ────────────────────────────────────────
  // wrestler_id → weight_class (normalized)
  const weightMap = new Map<string, string>()
  // wrestler_id → list of raw matches
  const matchesByWrestler = new Map<string, RawMatch[]>()

  function addMatch(wId: string, m: RawMatch) {
    const arr = matchesByWrestler.get(wId) ?? []
    arr.push(m)
    matchesByWrestler.set(wId, arr)
  }

  const BOYS_WTS  = [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285]
  const GIRLS_WTS = [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235]
  const WTS = gender === 'F' ? GIRLS_WTS : BOYS_WTS

  function normalizeWt(raw: string | number | null): string | null {
    if (raw == null) return null
    const n = Number(raw)
    if (isNaN(n) || n <= 0) return null
    const sorted = [...WTS].sort((a, b) => a - b)
    for (const wt of sorted) {
      if (n <= wt + 4) return String(wt)
    }
    return String(sorted[sorted.length - 1])
  }

  // In-season tournament bouts
  {
    const istTable  = gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'
    const boutTable = gender === 'F' ? 'tournament_bouts_girls'      : 'tournament_bouts'

    const { data: tournaments } = await db
      .from(istTable)
      .select('id, start_date')
      .eq('season', season)

    for (const t of (tournaments ?? [])) {
      const { data: bouts } = await db
        .from(boutTable)
        .select('wrestler1_id, wrestler2_id, winner, result_type, is_forfeit, weight_class')
        .eq('in_season_tournament_id', t.id)

      for (const b of (bouts ?? [])) {
        const w1 = b.wrestler1_id as string | null
        const w2 = b.wrestler2_id as string | null
        const w1Wins = b.winner === 1
        const w2Wins = b.winner === 2
        const rt = b.result_type as string | null
        const isForfeit = !!(b as any).is_forfeit

        const nwc = normalizeWt(b.weight_class as string | null)
        if (nwc) {
          if (w1) weightMap.set(w1, nwc)
          if (w2) weightMap.set(w2, nwc)
        }

        if (w1Wins || w2Wins) {
          const winnerId = w1Wins ? w1 : w2
          const loserId  = w1Wins ? w2 : w1
          const fall     = isFallType(rt)
          const decLoss  = isDecisionLoss(rt)

          if (winnerId && njIds.has(winnerId)) {
            addMatch(winnerId, {
              oppId: loserId, isOOS: !!(loserId && !njIds.has(loserId)),
              isWin: true, isFall: fall, isForfeit, isDecLoss: false,
              date: t.start_date as string,
            })
          }
          if (loserId && njIds.has(loserId)) {
            addMatch(loserId, {
              oppId: winnerId, isOOS: !!(winnerId && !njIds.has(winnerId)),
              isWin: false, isFall: false, isForfeit: false,
              isDecLoss: decLoss, date: t.start_date as string,
            })
          }
        }
      }
    }
  }

  // Dual meet matches
  {
    const matchTable = gender === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches'
    const { data: meets } = await (gender === 'F'
      ? db.from('dual_meets_girls').select('id, meet_date').eq('season_id', currentSeasonId)
      : db.from('dual_meets').select('id, meet_date').eq('season_id', currentSeasonId).eq('gender', gender)
    )

    for (const meet of (meets ?? [])) {
      const { data: rows } = await db
        .from(matchTable)
        .select('wrestler_a_id, wrestler_b_id, winner_id, result_type, is_forfeit_win, is_double_forfeit, weight_class')
        .eq('dual_meet_id', meet.id)

      for (const m of (rows ?? [])) {
        if (m.is_double_forfeit) continue
        const aId = m.wrestler_a_id as string | null
        const bId = m.wrestler_b_id as string | null
        const winnerId  = m.winner_id as string | null
        const rt        = m.result_type as string | null
        const isForfeit = !!(m as any).is_forfeit_win
        const fall      = isFallType(rt)
        const decLoss   = isDecisionLoss(rt)
        const date      = meet.meet_date as string

        const nwc = normalizeWt(m.weight_class as string | null)
        if (nwc) {
          if (aId && !weightMap.has(aId)) weightMap.set(aId, nwc)
          if (bId && !weightMap.has(bId)) weightMap.set(bId, nwc)
        }

        for (const [myId, oppId] of [[aId, bId], [bId, aId]] as [string | null, string | null][]) {
          if (!myId || !njIds.has(myId)) continue
          const isWin = myId === winnerId
          const isLoss = !isWin && winnerId !== null
          if (!isWin && !isLoss) continue
          addMatch(myId, {
            oppId, isOOS: !!(oppId && !njIds.has(oppId)),
            isWin, isFall: isWin && fall, isForfeit: isWin && isForfeit,
            isDecLoss: !isWin && decLoss, date,
          })
        }
      }
    }
  }

  // ── Step 4: Load wrestler names + schools ─────────────────────────────────
  const allWrestlerIds = [...new Set([
    ...matchesByWrestler.keys(),
    ...weightMap.keys(),
  ])]

  type WrestlerInfo = { id: string; first_name: string; last_name: string; school_name: string }
  const wrestlerInfo = new Map<string, WrestlerInfo>()

  for (let i = 0; i < allWrestlerIds.length; i += 100) {
    const chunk = allWrestlerIds.slice(i, i + 100)
    const { data } = await db
      .from('wrestlers')
      .select('id, first_name, last_name, schools(display_name)')
      .in('id', chunk)
    for (const w of (data ?? []) as any[]) {
      wrestlerInfo.set(w.id, {
        id: w.id,
        first_name: w.first_name ?? '',
        last_name:  w.last_name  ?? '',
        school_name: w.schools?.display_name ?? '',
      })
    }
  }

  // ── Step 5: Compute pre-seed scores ──────────────────────────────────────
  // Include all NJ wrestlers who have matches OR a weight class in current season
  const eligibleIds = new Set<string>([
    ...matchesByWrestler.keys(),
    ...weightMap.keys(),
  ])
  // Filter to NJ only
  for (const id of [...eligibleIds]) {
    if (!njIds.has(id)) eligibleIds.delete(id)
  }
  // Filter by weight if specified
  if (weight !== 'all') {
    for (const id of [...eligibleIds]) {
      if (weightMap.get(id) !== weight) eligibleIds.delete(id)
    }
  }

  const rows: PreSeedRow[] = []

  for (const wId of eligibleIds) {
    const info = wrestlerInfo.get(wId)
    if (!info) continue

    const myTier = tierMap.get(wId) ?? TIER_MAP['never']
    const rawMatches = matchesByWrestler.get(wId) ?? []

    // Compute caliber per match
    const caliberRecords: (MatchCaliberRecord & { earned: number })[] = []
    for (const m of rawMatches) {
      const oppTier = m.oppId
        ? (tierMap.get(m.oppId) ?? (njIds.has(m.oppId) ? TIER_MAP['never'] : OOS_TIER))
        : OOS_TIER
      const earned = matchCaliberPts(oppTier, m.isWin, m.isFall, m.isForfeit, m.isDecLoss, m.isOOS)

      const oppInfo = m.oppId ? wrestlerInfo.get(m.oppId) : null
      caliberRecords.push({
        oppId:        m.oppId,
        oppName:      oppInfo ? `${oppInfo.first_name} ${oppInfo.last_name}` : 'Unknown',
        oppTierLabel: oppTier.label,
        earned,
        isWin:  m.isWin,
        isFall: m.isFall,
      })
    }

    // Best 20 by caliber earned (descending), but losses count against so include all
    // Sort by earned desc, take top 20
    const sorted = [...caliberRecords].sort((a, b) => b.earned - a.earned)
    const top20 = sorted.slice(0, 20)
    const caliber = Math.round(top20.reduce((s, r) => s + r.earned, 0) * 100) / 100

    rows.push({
      wrestler_id:   wId,
      first_name:    info.first_name,
      last_name:     info.last_name,
      school_name:   info.school_name,
      weight_class:  weightMap.get(wId) ?? null,
      tier_key:      myTier.key,
      tier_label:    myTier.label,
      prestige:      myTier.prestige,
      caliber,
      preseed_total: Math.round((myTier.prestige + caliber) * 100) / 100,
      match_count:   top20.length,
      top_matches:   top20.slice(0, 5),  // top 5 for display
    })
  }

  // Sort by pre-seed total descending
  rows.sort((a, b) => b.preseed_total - a.preseed_total || b.prestige - a.prestige)

  return NextResponse.json({ rows, meta: { gender, season, weight } })
}
