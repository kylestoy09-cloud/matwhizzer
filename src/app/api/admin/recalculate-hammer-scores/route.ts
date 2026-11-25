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
import { tableMissing, transferTable } from '@/lib/transfers'
import { cronSkipBeforeSeason } from '@/lib/cronGuard'
import { schoolIdsOfWrestlers } from '@/lib/hubSchools'
import { getWorkingSeason, getPreviousSeason, parseGender } from '@/lib/season-context'
import { recordProjections } from '@/lib/projectionTrack'
import { orderBouts } from '@/lib/boutOrder'
import { getSeasons } from '@/lib/seasons-server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import {
  classifyOutcome,
  computeMatchScore,
  computeMatchComponent,
  tournamentAverage,
  tournamentPointsForPlace,
  postseasonScore,
  totalHammerScore,
  getWeightAdjustment,
  WEIGHT_ORDER_GIRLS,
  type PostseasonFact,
} from '@/lib/hammerScore'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const BOOTSTRAP_SLOTS      = 20

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function authorize(req: NextRequest): Promise<boolean> {
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  // (an unset secret never matches — "Bearer undefined" must not pass)
  const secret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (secret && authHeader === `Bearer ${secret}`) return true
  // Legacy header (manual calls)
  const cronSecret = req.headers.get('x-cron-secret')
  if (secret && cronSecret === secret) return true
  // Admin session (any signed-in user is not enough: fans have accounts)
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return false
  const { data: appUser } = await sb.from('app_users').select('role').eq('id', user.id).single()
  return appUser?.role === 'admin'
}

// ─── win_type normalizer ───────────────────────────────────────────────────────
// matches.win_type uses all-caps; classifyOutcome expects mixed-case result_type.

// Snap a raw weight to a class on the gender's ladder. Boys keep their original
// cut-offs; girls snap to the nearest of the 12 girls classes (the boys ladder
// turned every girls 100/107 into "106", 114 into "113", and so on).
function normalizeWeight(raw: string | number | null | undefined, gender: 'M' | 'F'): string | null {
  if (raw == null) return null
  const n = Number(raw)
  if (isNaN(n) || n <= 0) return null
  if (gender === 'F') {
    let best = WEIGHT_ORDER_GIRLS[0]
    for (const c of WEIGHT_ORDER_GIRLS) if (Math.abs(c - n) < Math.abs(best - n) || (Math.abs(c - n) === Math.abs(best - n) && c > best)) best = c
    return String(best)
  }
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
  // Latest result at each tournament (keyed by tournament, across seasons), 12-month rolling (Kyle
  // 2026-11-12): see tournamentAverage. Independent of the match part.
  tournaments:          Map<string, TournamentEntry>
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

type TournamentEntry = { date: string; points: number; won: boolean }

/** True while a result dated `date` is under a year old on `asOf` (both YYYY-MM-DD). */
function withinYear(date: string, asOf: string): boolean {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCFullYear(d.getUTCFullYear() + 1)
  return d.toISOString().slice(0, 10) > asOf
}

/** The tournament part on a given day: results under a year old. */
function tournamentPart(s: WrestlerState, asOf: string): number {
  return tournamentAverage([...s.tournaments.values()].filter(t => withinYear(t.date, asOf)))
}

/** One key per tournament across seasons ("2026 Beast of the East" = "Beast of the East"). Editions linked by
 *  prior_id take the first edition's name (keyOf below); unlinked ones go by their own name. */
function tournamentKey(name: string): string {
  return name.toLowerCase()
    .replace(/\b(19|20)\d{2}(-\d{2,4})?\b/g, ' ')
    .replace(/\b\d+(st|nd|rd|th)\s+annual\b|\bannual\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ').trim()
}

// A loss at a tournament by injury default or medical forfeit (a plain forfeit or a DQ is not)
const TOURNAMENT_MEDICAL = new Set(['Inj.', 'Def.', 'MFF', 'MFFL'])

function getHammer(s: WrestlerState, asOf: string): number {
  const matchComp = computeMatchComponent(buildScoreWindow(s))
  return totalHammerScore(s.postseasonAdjusted, tournamentPart(s, asOf), matchComp)
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
      ? db.from('dual_meets_girls').select('id').eq('season_id', CURRENT_SEASON_ID).order('id').range(offset, offset + 999)
      : db.from('dual_meets').select('id').eq('season_id', CURRENT_SEASON_ID).eq('gender', gender).order('id').range(offset, offset + 999)
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
      const nwc = normalizeWeight((m as any).weight_class, gender as 'M' | 'F')
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
      const nwc = normalizeWeight((b as any).weight_class, gender as 'M' | 'F')
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
        .order('id')
        .range(offset, offset + 999)
      if (!data?.length) break
      for (const e of (data as any[])) {
        const nwc = normalizeWeight(e.weight_classes?.weight, gender as 'M' | 'F')
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
  // The admin button sends { gender }; the daily crons call GET ?gender=M / ?gender=F
  const gender     = ((body?.gender ?? req.nextUrl.searchParams.get('gender')) === 'F' ? 'F' : 'M') as string
  const stateType  = gender === 'F' ? 'girls_state'   : 'boys_state'
  const regionsType = gender === 'F' ? 'girls_regions' : 'regions'
  const psTypes    = ['districts', regionsType, stateType]

  // Normally the gender's working season. For one past season of this gender:
  //   { season: '2025-26', logOnly: true }   rebuilds its match log and writes nothing
  //                                          else; its hammer scores and weights stay
  //   { season: '2025-26', archive: true }   rebuilds its match log and scores from the
  //                                          data as it is now (after fixes to that
  //                                          season); a row whose school is unchanged keeps
  //                                          its archived conference, section and
  //                                          classification, and current main weights are untouched
  //   { season: '2025-26', dryRun: true }     computes everything and writes nothing: returns each
  //                                          wrestler's rating, to compare formula changes
  const logOnly = body?.logOnly === true
  const archive = body?.archive === true
  const dryRun  = body?.dryRun === true
  if ((logOnly || archive || dryRun) && typeof body?.season !== 'string') {
    return NextResponse.json({ error: 'logOnly / archive / dryRun require season (a seasons.year_label)' }, { status: 400 })
  }
  const working = await getWorkingSeason(parseGender(gender))
  const season = logOnly || archive || dryRun
    ? (await getSeasons()).find(s => s.label === body.season)
    : working
  if (!season) return NextResponse.json({ error: `Unknown season ${body?.season}` }, { status: 400 })
  if (archive && season.id === working.id) {
    return NextResponse.json({ error: `${season.label} is the season in progress; run it without archive` }, { status: 400 })
  }
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

  // Medical exits per season: a postseason loss by injury default or forfeit (in the postseason a
  // forfeit is a medical forfeit; a DQ is not medical), or a region top-4 finisher missing from a
  // loaded state bracket (in NJ the alternate replaces a qualifier who withdraws).
  const medicalBySeason = new Map<number, Set<string>>()

  async function computePostseasonFacts(seasonId: number): Promise<Map<string, PostseasonFact>> {
    const factMap = new Map<string, PostseasonFact>()
    const medical = new Set<string>()
    medicalBySeason.set(seasonId, medical)
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
        .order('id')
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

    type MRow = { id: string; round: string; win_type: string | null; winner_entry_id: string | null; loser_entry_id: string | null }
    const validated = [{ col: 'validated', val: true }]
    const wMatches = await chunkIn<MRow>(db, 'matches', 'winner_entry_id', entryIds, 'id, round, win_type, winner_entry_id, loser_entry_id', validated)
    const lMatches = await chunkIn<MRow>(db, 'matches', 'loser_entry_id',  entryIds, 'id, round, win_type, winner_entry_id, loser_entry_id', validated)
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
        if (m.win_type === 'INJ' || m.win_type === 'FORF') medical.add(loserInfo.wrestlerId)
      }
    }

    // A top-4 region finish qualifies for state (Kyle 2026-11-12): it counts as making state as soon as
    // regions are loaded, not when the state bracket is. Top 4 = both wrestlers in a region final or
    // 3rd-place bout.
    const typeOf = new Map(psTournaments.map(t => [String(t.id), t.tournament_type as string]))
    const inState = new Set(allEntries.filter(e => typeOf.get(String(e.tournament_id)) === stateType).map(e => e.wrestler_id))
    for (const m of matchMap.values()) {
      if (m.round !== 'F' && m.round !== '3rd_Place') continue
      for (const eid of [m.winner_entry_id, m.loser_entry_id]) {
        const info = eid ? entryToInfo.get(eid) : null
        if (!info || typeOf.get(String(info.tournamentId)) !== regionsType) continue
        getOrCreate(info.wrestlerId).madeState = true
        if (inState.size && !inState.has(info.wrestlerId)) medical.add(info.wrestlerId)
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

  // ── Carry from last season (Kyle 2026-11-12: "the end of one season and the start of the next season is
  // no different than day 45 to day 46") ─────────────────────────────────────────────────────────────
  // When last season saved its end state (wrestler_rating_carry), this season continues from it: no
  // placeholders and no replay of last season's postseason bouts (they're already in the last 20).
  // Without it (the first season with regular-season data, 2025-26), the season starts the old way:
  // postseason score from last season's postseason, 20 placeholder matches, its postseason bouts replayed.
  type Carry = { postseason: number; matchScores: number[]; bootstrapSlots: number; bootstrapValue: number; tournaments: [string, TournamentEntry][]; weight: string | null }
  const PREV_SEASON_STR = (await getPreviousSeason(season)).label
  const carry = new Map<string, Carry>()
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from('wrestler_rating_carry').select('wrestler_id, state')
      .eq('season', PREV_SEASON_STR).eq('gender', gender).order('wrestler_id').range(offset, offset + 999)
    // No carry table yet (before 20261112_wrestler_rating_carry.sql) = no carry: the season starts the old way
    if (error && /wrestler_rating_carry/.test(error.message) && /does not exist|schema cache/.test(error.message)) break
    if (error) throw new Error(`READ wrestler_rating_carry failed: ${error.message}`)
    for (const r of data ?? []) carry.set(r.wrestler_id as string, r.state as Carry)
    if (!data || data.length < 1000) break
  }
  const soup = carry.size > 0
  // The postseason score carried into this season: last season's final one (soup), or its postseason
  const carriedScore = (wId: string): number => {
    if (soup) return carry.get(wId)?.postseason ?? 0
    const f = psFactMap.get(wId); return f ? postseasonScore(f) : 0
  }
  // The weight for this season (Kyle 2026-11-13): this season's bouts; before any, the projected weight (set from
  // offseason tournaments after 9/1, or by hand on the wrestler's profile); else last season's weight
  const projected = new Map<string, string>()
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from('wrestlers').select('id, projected_weight_class')
      .eq('gender', gender).not('projected_weight_class', 'is', null).order('id').range(offset, offset + 999)
    if (error) throw new Error(`READ projected weights failed: ${error.message}`)
    for (const r of data ?? []) projected.set(r.id as string, String(r.projected_weight_class))
    if (!data || data.length < 1000) break
  }
  for (const [wId, w] of projected) if (!mainWeightByWrestler.has(wId)) mainWeightByWrestler.set(wId, w)
  for (const [wId, c] of carry) if (c.weight && !mainWeightByWrestler.has(wId)) mainWeightByWrestler.set(wId, c.weight)

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
        .order('id')
        .range(offset, offset + PAGE - 1)
      if (error) throw new Error('nj wrestlers: ' + error.message)
      if (!data?.length) break
      for (const r of data) njWrestlerIds.add(r.id as string)
      if (data.length < PAGE) break
    }
  }

  // Every wrestler id that exists (both genders, OOS included). A few bouts and
  // entries still point at deleted wrestlers (e.g. a deleted OOS roster, the
  // removed "Forfeit" placeholders); the log's opponent FK rejects those ids, so
  // the opponent is logged as unknown instead of failing the whole run.
  const existingWrestlerIds = new Set<string>()
  {
    const PAGE = 1000
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await db.from('wrestlers').select('id').order('id').range(offset, offset + PAGE - 1)
      if (error) throw new Error('wrestler ids: ' + error.message)
      if (!data?.length) break
      for (const r of data) existingWrestlerIds.add(r.id as string)
      if (data.length < PAGE) break
    }
  }
  const knownOpponent = (id: string | null) => (id && existingWrestlerIds.has(id) ? id : null)

  function getState(wrestlerId: string): WrestlerState {
    if (!states.has(wrestlerId)) {
      const c = carry.get(wrestlerId)
      if (c) {
        // Yesterday's soup: last season's end state, unchanged (last 20 matches, tournament results,
        // postseason score). This season's first match is just the next match.
        states.set(wrestlerId, {
          wrestlerId,
          postseasonBase:      c.postseason,
          postseasonAdjusted:  c.postseason,
          tournaments:         new Map(c.tournaments),
          matchScores:         [...c.matchScores],
          bootstrapSlots:      c.bootstrapSlots,
          bootstrapValue:      c.bootstrapValue,
          matchCount:          0,
          lastMatchDate:       null,
        })
        return states.get(wrestlerId)!
      }
      const fact = soup ? undefined : psFactMap.get(wrestlerId)
      const psBase = fact ? postseasonScore(fact) : 0
      states.set(wrestlerId, {
        wrestlerId,
        postseasonBase:      psBase,
        postseasonAdjusted:  psBase,
        tournaments:         new Map(),
        matchScores:         [],
        bootstrapSlots:      BOOTSTRAP_SLOTS,
        bootstrapValue:      psBase * 2,
        matchCount:          0,
        lastMatchDate:       null,
      })
    }
    return states.get(wrestlerId)!
  }

  // In-season bump (Kyle 2026-11-12): a wrestler with no postseason entry last season gets a postseason
  // score of 20 while their record against opponents whose postseason score is above 20 (state level) is a
  // winning one over at least 2 such bouts (NJ opponents); it drops back to 0 if the record stops being a
  // winning one. Counts current-season bouts only (not last season's postseason replay). Kyle chose this
  // over WRR 20+ (2025-26: 25 boys bumped, 76% made state, vs 93 and 55%): "I'd rather miss a contender
  // than bump a non contender."
  const BUMP_OPPONENT_POSTSEASON = 20, BUMP_MIN_BOUTS = 2, BUMP_SCORE = 20
  // Dry runs can test another opponent measure: { bumpTest: { measure: 'wrr' | 'postseason', min: number, strict?: boolean } }
  const bumpTest = dryRun ? body?.bumpTest as { measure: 'wrr' | 'postseason'; min: number; strict?: boolean } | undefined : undefined
  const strongOpponent = (opp: WrestlerState, oppHammer: number) => {
    if (!bumpTest) return opp.postseasonAdjusted > BUMP_OPPONENT_POSTSEASON
    const v = bumpTest.measure === 'postseason' ? opp.postseasonAdjusted : oppHammer
    return bumpTest.strict ? v > bumpTest.min : v >= bumpTest.min
  }
  const bumpRecord = new Map<string, { w: number; l: number }>()
  const bumpFirstOn = new Map<string, string>()   // wrestler → date the 20 was first earned (dry-run report)
  let countBump = false
  function applyBump(s: WrestlerState, opp: WrestlerState, opponentHammer: number, won: boolean, date: string) {
    if (!countBump || psFactMap.has(s.wrestlerId) || !strongOpponent(opp, opponentHammer)) return
    const r = bumpRecord.get(s.wrestlerId) ?? bumpRecord.set(s.wrestlerId, { w: 0, l: 0 }).get(s.wrestlerId)!
    if (won) r.w++; else r.l++
    const on = r.w > r.l && r.w + r.l >= BUMP_MIN_BOUTS
    const base = carriedScore(s.wrestlerId)
    s.postseasonBase = s.postseasonAdjusted = on ? Math.max(BUMP_SCORE, base) : base
    if (!soup) s.bootstrapValue = on ? BUMP_SCORE * 2 : 0
    if (on && !bumpFirstOn.has(s.wrestlerId)) bumpFirstOn.set(s.wrestlerId, date)
  }

  // Pre-seed states for NJ wrestlers: from the carry (still active, i.e. not graduated), or else from
  // last season's postseason
  const activeIds = new Set<string>()
  if (soup) {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db.from('wrestlers').select('id').eq('gender', gender).eq('is_active', true)
        .or('is_oos.is.null,is_oos.eq.false').order('id').range(offset, offset + 999)
      if (error) throw new Error('active wrestlers: ' + error.message)
      for (const r of data ?? []) activeIds.add(r.id as string)
      if (!data || data.length < 1000) break
    }
    for (const wId of carry.keys()) if (activeIds.has(wId)) getState(wId)
  } else {
    for (const [wId] of psFactMap) {
      if (njWrestlerIds.has(wId)) getState(wId)
    }
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

    // Apply weight-class adjustment: a wrestler competing away from their main weight
    // gets –8 per class up or +6 per class down applied to their effective hammer.
    const matchWc = matchWeightClass ? normalizeWeight(matchWeightClass, gender as 'M' | 'F') : null
    const adjA = stateA ? getWeightAdjustment(mainWeightByWrestler.get(wrestlerAId!) ?? null, matchWc, gender as 'M' | 'F') : 0
    const adjB = stateB ? getWeightAdjustment(mainWeightByWrestler.get(wrestlerBId!) ?? null, matchWc, gender as 'M' | 'F') : 0

    // A non-NJ (or unknown) opponent gets the round default in brackets. Duals have no
    // round, so there it is rated equal to the NJ wrestler's effective rating (Kyle
    // 2026-11-11): an even match, never the 0 it used to get.
    const nonNj = (njState: WrestlerState, njAdj: number) => round ? oosHammerForRound(round) : getHammer(njState, date) + njAdj
    const hammerA = stateA ? getHammer(stateA, date) : nonNj(stateB!, adjB)
    const hammerB = stateB ? getHammer(stateB, date) : nonNj(stateA!, adjA)

    const { scoreA, scoreB } = computeMatchScore(hammerA + adjA, hammerB + adjB, outcomeRankA)
    const isWinnerA = outcomeRankA <= 16

    if (stateA) {
      addMatchScore(stateA, scoreA, date)
      logEntries.push({
        wrestler_id: wrestlerAId!, season: CURRENT_SEASON_STR, gender, match_date: date,
        match_source: source, source_id: sourceId,
        opponent_wrestler_id: knownOpponent(wrestlerBId),
        pre_match_hammer: hammerA, opponent_pre_match_hammer: hammerB,
        outcome_rank: outcomeRankA, is_winner: isWinnerA, score_earned: scoreA,
      })
    }
    if (stateB) {
      addMatchScore(stateB, scoreB, date)
      logEntries.push({
        wrestler_id: wrestlerBId!, season: CURRENT_SEASON_STR, gender, match_date: date,
        match_source: source, source_id: sourceId,
        opponent_wrestler_id: knownOpponent(wrestlerAId),
        pre_match_hammer: hammerB, opponent_pre_match_hammer: hammerA,
        outcome_rank: 33 - outcomeRankA, is_winner: !isWinnerA, score_earned: scoreB,
      })
    }

    // NJ opponents only: a non-NJ opponent's rating is a stand-in, not a record
    if (stateA && stateB) {
      const psA = stateA.postseasonAdjusted
      applyBump(stateA, stateB, hammerB, isWinnerA, date)
      applyBump(stateB, { ...stateA, postseasonAdjusted: psA }, hammerA, !isWinnerA, date)
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
      // in the order wrestled — each entrant's own rounds in sequence (src/lib/boutOrder.ts)
      for (const m of orderBouts([...matchRowMap.values()], x => x.round, x => [x.winner_entry_id, x.loser_entry_id])) {
        const winnerWId = m.winner_entry_id ? entryToWrestler.get(m.winner_entry_id) ?? null : null
        const loserWId  = m.loser_entry_id  ? entryToWrestler.get(m.loser_entry_id)  ?? null : null
        const rank = classifyOutcome(normalizeWinType(m.win_type), m.fall_time_seconds, m.winner_score, m.loser_score, true)
        recordMatch(matchDate, 'postseason', m.id, winnerWId, loserWId, rank, m.round)
      }
    }
  }

  if (!soup) await processPostseasonMatches(POSTSEASON_SEASON_ID)
  countBump = true

  // ── 4. Process current-season in-season tournaments + dual meets (chronological) ──────
  // All events are interleaved by date so a December dual meet is never scored
  // using a January tournament's match results as prior context.
  const schoolByWrestler = new Map<string, number>() // wrestler_id → school_id
  const tournamentSchool = new Map<string, number>()  // wrestler_id → school on their latest in-season tournament bout this season
  {
    const PLACE_ROUNDS = ['F', '3rd_Place', '5th_Place', '7th_Place']
    const PLACE_ROUND_WINNER: Record<string, number> = { F: 1, '3rd_Place': 3, '5th_Place': 5, '7th_Place': 7 }

    // ── Fetch all in-season tournaments ─────────────────────────────────────────
    const inSeasonTable = gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'
    const inSeasonBoutTable = gender === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts'

    const { data: tournaments } = await db
      .from(inSeasonTable)
      .select('id, name, start_date, point_value, prior_id')
      .eq('season', CURRENT_SEASON_STR)
      .order('start_date', { ascending: true })

    // A tournament linked to last season's edition (prior_id: the slate import or a Hub merge) keeps that edition's
    // key, so a renamed event ("Gary Vittorio Holiday Classic" = "Parsippany Hills Holiday Tournament") is one tournament
    const keyOf = new Map<string, string>()
    for (const t of (tournaments ?? [])) {
      let name = t.name as string, prior = (t.prior_id as string | null) ?? null
      for (let hops = 0; prior && hops < 20; hops++) {
        const { data: p } = await db.from(inSeasonTable).select('name, prior_id').eq('id', prior).maybeSingle()
        if (!p) break
        name = p.name as string; prior = (p.prior_id as string | null) ?? null
      }
      keyOf.set(String(t.id), tournamentKey(name))
    }

    // Pre-fetch all tournament bouts grouped by tournament id (paginated for large events)
    const boutsByTournament = new Map<string, any[]>()
    for (const t of (tournaments ?? [])) {
      const bouts: any[] = []
      for (let offset = 0; ; offset += 1000) {
        const { data: page } = await db
          .from(inSeasonBoutTable)
          .select('id, round, wrestler1_id, wrestler2_id, wrestler1_school_id, wrestler2_school_id, winner, result_type, fall_time_seconds, winner_score, loser_score, weight_class')
          .eq('in_season_tournament_id', t.id)
          .order('id')
          .range(offset, offset + 999)
        if (!page?.length) break
        bouts.push(...page)
        if (page.length < 1000) break
      }
      boutsByTournament.set(String(t.id), bouts)
      // tournaments come oldest first, so the latest one's school wins
      for (const b of bouts) {
        if (b.wrestler1_id && b.wrestler1_school_id) tournamentSchool.set(b.wrestler1_id, b.wrestler1_school_id)
        if (b.wrestler2_id && b.wrestler2_school_id) tournamentSchool.set(b.wrestler2_id, b.wrestler2_school_id)
      }
    }

    // ── Fetch all dual meets ─────────────────────────────────────────────────────
    // Paged by date then id: date alone is not unique, so pages overlapped and the
    // boys run skipped 17 meets every time (2026-11-02)
    const meetDateMap = new Map<string, string>() // meet_id → meet_date
    const MEET_PAGE = 1000
    for (let offset = 0; ; offset += MEET_PAGE) {
      const { data } = await (gender === 'F'
        ? db.from('dual_meets_girls').select('id, meet_date').eq('season_id', CURRENT_SEASON_ID).order('meet_date', { ascending: true }).order('id').range(offset, offset + MEET_PAGE - 1)
        : db.from('dual_meets').select('id, meet_date').eq('season_id', CURRENT_SEASON_ID).eq('gender', gender).order('meet_date', { ascending: true }).order('id').range(offset, offset + MEET_PAGE - 1)
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
      | { date: string; type: 'tournament'; id: string; pointValue: number; key: string }
      | { date: string; type: 'meet'; id: string }

    const events: SeasonEvent[] = []
    for (const t of (tournaments ?? [])) {
      events.push({ date: t.start_date as string, type: 'tournament', id: String(t.id), pointValue: t.point_value as number, key: keyOf.get(String(t.id)) ?? tournamentKey(t.name as string) })
    }
    for (const [meetId, meetDate] of meetDateMap) {
      events.push({ date: meetDate, type: 'meet', id: meetId })
    }
    events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

    // ── Process events in date order ────────────────────────────────────────────
    for (const event of events) {
      if (event.type === 'tournament') {
        // in the order wrestled — each wrestler's own rounds in sequence (src/lib/boutOrder.ts); id order was random
        const bouts = orderBouts(boutsByTournament.get(event.id) ?? [], b => b.round as string, b => [b.wrestler1_id as string | null, b.wrestler2_id as string | null])
        const tDate  = event.date
        const ptVal  = event.pointValue
        // wrestler-centric best-place tracking (handles multi-bracket tournaments)
        const wrestlerBestPlace = new Map<string, number>()
        const entered = new Set<string>(), medicalOut = new Set<string>()

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

          const nwc = normalizeWeight(b.weight_class as string | null, gender as 'M' | 'F')
          if (nwc) {
            if (w1) weightByWrestler.set(w1, nwc)
            if (w2) weightByWrestler.set(w2, nwc)
          }

          const w1IsWinner = b.winner === 1
          if (w1) entered.add(w1)
          if (w2) entered.add(w2)
          if (loserOf && TOURNAMENT_MEDICAL.has(b.result_type as string)) medicalOut.add(loserOf)
          const rank = classifyOutcome(b.result_type, b.fall_time_seconds, b.winner_score, b.loser_score, w1IsWinner)
          if (rank !== null) recordMatch(tDate, 'tournament_bout', String(b.id), w1, w2, rank, b.round as string, b.weight_class as string | null)
        }

        // This edition's result replaces the wrestler's last one at this tournament (no place = 0). An
        // injury default here averages the two (Kyle 2026-11-12), when the old one is under a year old.
        for (const wId of entered) {
          if (!njWrestlerIds.has(wId)) continue
          const place = wrestlerBestPlace.get(wId)
          const earned = place ? tournamentPointsForPlace(place, ptVal) : 0
          const st = getState(wId)
          const old = st.tournaments.get(event.key)
          const prior = old && withinYear(old.date, tDate) ? old : null
          st.tournaments.set(event.key, medicalOut.has(wId) && prior
            ? { date: tDate, points: (prior.points + earned) / 2, won: false }
            : { date: tDate, points: earned, won: place === 1 })
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
          const dnwc = normalizeWeight(m.weight_class as string | null, gender as 'M' | 'F')
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

  // ── 7. Postseason score from this season's postseason (Kyle 2026-11-12) ──────────────
  // While the postseason is under way, only doing better than the score carried in counts right away
  // (a returning state champ who wins districts stays at 50). Once state results are loaded:
  //   matched or beat last season       → this season's result
  //   finished lower                    → this season's result, or the average of the two after a
  //                                       medical exit (injury default, medical forfeit, withdrawal)
  //   never entered the postseason      → 75% of last season's score; a wrestler holding the in-season 20
  //                                       keeps it (had they wrestled, odds are they'd have done well)
  const medical25 = medicalBySeason.get(CURRENT_SEASON_ID) ?? new Set<string>()
  const postseasonComplete = [...psFactMap25.values()].some(f => f.statePlacement === 1)
  const psRule = new Map<string, string>()   // dry-run report: which rule set the postseason score
  for (const s of states.values()) {
    if (!njWrestlerIds.has(s.wrestlerId)) continue
    const f25 = psFactMap25.get(s.wrestlerId)
    const current = f25 ? postseasonScore(f25) : null
    const carried = carriedScore(s.wrestlerId)
    if (!postseasonComplete) {
      if (current != null) s.postseasonAdjusted = Math.max(s.postseasonAdjusted, current)
      psRule.set(s.wrestlerId, current != null && current > carried ? 'improved (live)' : 'in progress (carried)')
    } else if (current == null) {
      const held = !psFactMap.has(s.wrestlerId) ? s.postseasonAdjusted : 0   // the in-season 20, if held
      s.postseasonAdjusted = Math.max(Math.round(carried * 0.75 * 100) / 100, held)
      psRule.set(s.wrestlerId, held ? 'missed postseason (kept in-season 20)' : 'missed postseason (75%)')
    } else if (current >= carried) {
      s.postseasonAdjusted = current
      psRule.set(s.wrestlerId, current > carried ? 'beat last season' : 'matched last season')
    } else {
      const med = medical25.has(s.wrestlerId)
      s.postseasonAdjusted = med ? (carried + current) / 2 : current
      psRule.set(s.wrestlerId, med ? 'lower, medical (average)' : 'lower (this season)')
    }
  }

  // Preseason (soup): a wrestler with no bout this season yet keeps last season's school, so their rating
  // has a section, group and conference to sort by (Kyle 2026-11-12: state and sectional rankings). Their
  // first bout this season sets the school from then on, so a transfer corrects itself.
  if (soup) {
    // a transfer logged for this season (src/lib/transfers.ts) comes first: they rate at the new team
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db.from(transferTable(gender as 'M' | 'F')).select('wrestler_id, to_school_id, created_at')
        .eq('season_id', CURRENT_SEASON_ID).order('created_at', { ascending: false }).range(offset, offset + 999)
      if (tableMissing(error)) break   // before docs/migrations/20261116_transfers.sql
      if (error) throw new Error(`READ this season's transfers failed: ${error.message}`)
      for (const r of data ?? []) {
        if (states.has(r.wrestler_id as string) && !schoolByWrestler.has(r.wrestler_id as string)) schoolByWrestler.set(r.wrestler_id as string, r.to_school_id as number)
      }
      if (!data || data.length < 1000) break
    }
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db.from('wrestler_hammer_scores').select('wrestler_id, school_id')
        .eq('season', PREV_SEASON_STR).eq('gender', gender).not('school_id', 'is', null).order('wrestler_id').range(offset, offset + 999)
      if (error) throw new Error(`READ last season's schools failed: ${error.message}`)
      for (const r of data ?? []) {
        if (states.has(r.wrestler_id as string) && !schoolByWrestler.has(r.wrestler_id as string)) schoolByWrestler.set(r.wrestler_id as string, r.school_id as number)
      }
      if (!data || data.length < 1000) break
    }
  }

  // Anyone who only wrestled in-season tournaments this season: the school on their latest tournament bout (the dual
  // pass doesn't see them; before 2026-11-17, 314 rated wrestlers in 2025-26 got no school this way)
  for (const [w, school] of tournamentSchool) if (states.has(w) && !schoolByWrestler.has(w)) schoolByWrestler.set(w, school)

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
          .order('id')
          .range(offset, offset + PAGE - 1)
        if (!data?.length) break
        for (const e of (data as any[])) {
          if (!e.wrestler_id) continue
          const nwc = normalizeWeight((e.weight_classes as any)?.weight, gender as 'M' | 'F')
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

    // Last resort, after every source from this season: the wrestler's current school as the rest of the site reads
    // it (transfer → roster row → latest bout → name link; schoolIdsOfWrestlers). Then section / group / conference
    // for every school found after the first pass (a school from postseason entries used to get none: 20 rows in 2025-26).
    const missing = [...states.keys()].filter(id => !schoolByWrestler.has(id))
    if (missing.length) {
      for (const [w, school] of await schoolIdsOfWrestlers(db, missing)) {
        schoolByWrestler.set(w, school)
        wrestlerMeta.set(w, { ...(wrestlerMeta.get(w) ?? { conference: null, section: null, classification: null, district: null, region: null }), schoolId: school })
      }
    }
    const bare = [...wrestlerMeta.values()].filter(m => m.schoolId && !m.section && !m.classification && !m.conference)
    const bareIds = [...new Set(bare.map(m => m.schoolId!))]
    for (let i = 0; i < bareIds.length; i += 100) {
      const { data: sc } = await db.from('schools').select('id, athletic_conference, section, classification').in('id', bareIds.slice(i, i + 100))
      const byId = new Map((sc ?? []).map(x => [x.id as number, x]))
      for (const m of bare) {
        const a = byId.get(m.schoolId!)
        if (a) { m.conference = (a.athletic_conference as string | null) ?? null; m.section = (a.section as string | null) ?? null; m.classification = (a.classification as string | null) ?? null }
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
  for (const [wc, ids] of logOnly || archive || dryRun ? [] : byWeight) {
    for (let i = 0; i < ids.length; i += 500) {
      const { error } = await db.from('wrestlers').update({ main_weight: wc }).in('id', ids.slice(i, i + 500))
      if (error) throw new Error(`UPDATE wrestlers.main_weight failed: ${error.message}`)
    }
  }

  // The rating as of today for the season in progress, as of the end of a past season. In the season in
  // progress every returning (active) wrestler has a rating from day 1 (soup); otherwise a wrestler is
  // rated once they wrestle this season.
  const asOf = season.id === working.id ? new Date().toISOString().slice(0, 10) : `${season.end_year}-03-31`
  const scoreRows = [...states.values()]
    .filter(s => (s.matchCount > 0 && s.lastMatchDate != null && s.lastMatchDate >= `${season.start_year}-04-01`)
      || (soup && carry.has(s.wrestlerId) && activeIds.has(s.wrestlerId)))
    .map(s => {
      const tourComp  = tournamentPart(s, asOf)
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
        weight_class:        weightByWrestler.get(s.wrestlerId) ?? projected.get(s.wrestlerId) ?? carry.get(s.wrestlerId)?.weight ?? null,
        school_id:           meta?.schoolId ?? null,
        conference:          meta?.conference ?? null,
        section:             meta?.section ?? null,
        classification:      meta?.classification ?? null,
        district:            meta?.district ?? null,
        region:              meta?.region ?? null,
        last_calculated_at:  new Date().toISOString(),
      }
    })

  if (dryRun) {
    return NextResponse.json({ dry_run: true, season: CURRENT_SEASON_STR, gender, bouts_processed: logEntries.length, rows: scoreRows.map(r => ({
      wrestler_id: r.wrestler_id, postseason_base: r.postseason_base, postseason_adjusted: r.postseason_adjusted,
      tournament_score: r.tournament_score, match_score: r.match_score, hammer_score: r.hammer_score, match_count: r.match_count,
      carried: carriedScore(r.wrestler_id), ps_rule: psRule.get(r.wrestler_id) ?? null,
      bump_first_on: bumpFirstOn.get(r.wrestler_id) ?? null, bump_on_at_end: !psFactMap.has(r.wrestler_id) && r.postseason_base === BUMP_SCORE,
    })) })
  }

  // ── 7. Write results to DB ────────────────────────────────────────────────────
  // Replace this gender's log for the season (only this gender's — a
  // season-wide delete wiped the boys log on a girls run, 2026-10-26). New rows
  // go in first; the old ones are removed only after every batch succeeds, and a
  // failed run removes its own partial rows, so the previous log survives
  // intact. Old and new rows are told apart by id, read through the primary
  // key: a full season's log (138k boys rows) times out any statement that
  // filters or deletes it by created_at (2026-11-01).
  const oldLogIds: string[] = []
  for (let last: string | null = null; ;) {
    let q = db.from('wrestler_match_score_log').select('id')
      .eq('season', CURRENT_SEASON_STR).eq('gender', gender).order('id').limit(1000)
    if (last) q = q.gt('id', last)
    const { data, error } = await q
    if (error) throw new Error(`READ wrestler_match_score_log failed: ${error.message}`)
    for (const r of data ?? []) oldLogIds.push(String(r.id))
    if (!data || data.length < 1000) break
    last = String(data[data.length - 1].id)
  }

  // 200 ids per delete: the ids go in the request URL
  async function deleteLogIds(ids: string[]): Promise<string | null> {
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await db.from('wrestler_match_score_log').delete().in('id', ids.slice(i, i + 200))
      if (error) return error.message
    }
    return null
  }

  const BATCH = 500
  const newLogIds: string[] = []
  for (let i = 0; i < logEntries.length; i += BATCH) {
    const batchStart = Date.now()
    const { data, error } = await db.from('wrestler_match_score_log').insert(logEntries.slice(i, i + BATCH)).select('id')
    if (error) {
      // a network failure only says "fetch failed": keep the cause and how long the batch ran
      const why = `${error.message}${error.details ? ` — ${String(error.details).split('\n').slice(0, 3).join(' | ')}` : ''} (batch ran ${Math.round((Date.now() - batchStart) / 1000)}s, ${JSON.stringify(logEntries.slice(i, i + BATCH)).length} bytes)`
      // A batch can be written even though its reply failed (a timeout), so its ids
      // never reached newLogIds: re-read the season's ids and remove all that are new
      const old = new Set(oldLogIds)
      const current: string[] = []
      let undoErr: string | null = null
      for (let last: string | null = null; ;) {
        let q = db.from('wrestler_match_score_log').select('id')
          .eq('season', CURRENT_SEASON_STR).eq('gender', gender).order('id').limit(1000)
        if (last) q = q.gt('id', last)
        const { data: page, error: readErr } = await q
        if (readErr) { undoErr = readErr.message; break }
        for (const r of page ?? []) current.push(String(r.id))
        if (!page || page.length < 1000) break
        last = String(page[page.length - 1].id)
      }
      undoErr = undoErr ?? await deleteLogIds([...new Set([...newLogIds, ...current.filter(id => !old.has(id))])])
      throw new Error(`INSERT wrestler_match_score_log failed at row ${i}: ${why}` +
        (undoErr ? ` (removing this run's partial rows also failed: ${undoErr})` : '; previous log kept'))
    }
    for (const r of data ?? []) newLogIds.push(String(r.id))
  }
  const delLogErr = await deleteLogIds(oldLogIds)
  if (delLogErr) throw new Error(`DELETE old wrestler_match_score_log failed: ${delLogErr}`)

  // Projection tracking (src/lib/projectionTrack.ts): every new NJ-vs-NJ bout gets the active settings' projection,
  // frozen; bouts on file get a corrected result. A failure here is reported, never fails the rating run.
  let projections: { recorded: number; updated: number; orphaned?: number; skipped?: string } | { error: string }
  try {
    projections = await recordProjections(db, gender as 'M' | 'F', CURRENT_SEASON_STR, logEntries, logOnly || archive ? 'backfill' : 'live')
  } catch (e) { projections = { error: (e as Error).message } }

  // School, district and region come from the season's own bouts and entries. Conference,
  // section and classification come from today's school record, which may have moved on
  // since: an archived row keeps them when its school is unchanged. (Keeping the archived
  // school itself kept a split profile at the other person's school, 2026-11-02.)
  if (archive) {
    const kept = new Map<string, Record<string, unknown>>()
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db.from('wrestler_hammer_scores')
        .select('wrestler_id, school_id, conference, section, classification')
        .eq('season', CURRENT_SEASON_STR).eq('gender', gender).order('wrestler_id').range(offset, offset + 999)
      if (error) throw new Error(`READ archived wrestler_hammer_scores failed: ${error.message}`)
      for (const r of data ?? []) kept.set(r.wrestler_id as string, r)
      if (!data || data.length < 1000) break
    }
    for (const row of scoreRows) {
      const k = kept.get(row.wrestler_id)
      if (!k || k.school_id !== row.school_id) continue
      Object.assign(row, { conference: k.conference, section: k.section, classification: k.classification })
    }
  }

  // Upsert in place, then drop this gender's rows the run didn't write. The
  // table is never empty or half-written, so the Hammer Scores page can be
  // read mid-run (delete-then-insert showed partial, repeated rows).
  const runStamp = new Date(startedAt).toISOString()
  for (let i = 0; i < (logOnly ? 0 : scoreRows.length); i += BATCH) {
    const { error } = await db.from('wrestler_hammer_scores')
      .upsert(scoreRows.slice(i, i + BATCH), { onConflict: 'wrestler_id,season' })
    if (error) throw new Error(`UPSERT wrestler_hammer_scores failed at row ${i}: ${error.message}`)
  }
  if (!logOnly) {
    const { error: staleErr } = await db.from('wrestler_hammer_scores').delete()
      .eq('season', CURRENT_SEASON_STR).eq('gender', gender).lt('last_calculated_at', runStamp)
    if (staleErr) throw new Error(`DELETE stale wrestler_hammer_scores failed: ${staleErr.message}`)
  }

  // Save this season's end state for the next season to continue from (wrestler_rating_carry). The
  // season in progress rewrites it on every run, so its last run before the next season is the one carried.
  if (!logOnly) {
    const carryRows = scoreRows.map(r => {
      const st = states.get(r.wrestler_id)!
      return {
        wrestler_id: r.wrestler_id, season: CURRENT_SEASON_STR, gender, updated_at: runStamp,
        state: {
          postseason: st.postseasonAdjusted, matchScores: st.matchScores, bootstrapSlots: st.bootstrapSlots,
          bootstrapValue: st.bootstrapValue, tournaments: [...st.tournaments], weight: r.weight_class,
        },
      }
    })
    for (let i = 0; i < carryRows.length; i += BATCH) {
      const { error } = await db.from('wrestler_rating_carry').upsert(carryRows.slice(i, i + BATCH), { onConflict: 'wrestler_id,season' })
      if (error) throw new Error(`UPSERT wrestler_rating_carry failed at row ${i}: ${error.message}`)
    }
    const { error: staleCarry } = await db.from('wrestler_rating_carry').delete()
      .eq('season', CURRENT_SEASON_STR).eq('gender', gender).lt('updated_at', runStamp)
    if (staleCarry) throw new Error(`DELETE stale wrestler_rating_carry failed: ${staleCarry.message}`)
  }

  const duration_ms = Date.now() - startedAt
  const wrestlers_scored = logOnly ? 0 : scoreRows.length
  const bouts_processed  = logEntries.length

  // A cron or script call has no session
  const user = await createSupabaseServer().then(sb => sb.auth.getUser()).then(r => r.data.user).catch(() => null)
  await db.rpc('log_admin_activity', {
    p_admin_email: user?.email ?? 'cron',
    p_action:      'scoring_run',
    p_entity_type: 'wrestler_hammer_scores',
    p_entity_id:   null,
    p_details: { wrestlers_scored, bouts_processed, duration_ms, season: CURRENT_SEASON_STR, gender, log_only: logOnly, archive },
  })

  return NextResponse.json({ wrestlers_scored, bouts_processed, duration_ms, season: CURRENT_SEASON_STR, gender, log_only: logOnly, archive, projections })
}

// GET handler for Vercel cron job (crons fire GET, not POST)
export async function GET(req: NextRequest) {
  const skip = await cronSkipBeforeSeason(req)   // src/lib/cronGuard.ts
  if (skip) return NextResponse.json({ skipped: skip })
  return POST(req)
}
