import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

// ── NJ weight class order ─────────────────────────────────────────────────────

const NJ_WEIGHTS = [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285]

// ── Bracket routing tables ────────────────────────────────────────────────────

type Routing = {
  slot:        number
  round:       string
  winner_to:   number | null
  winner_top:  boolean | null
  loser_to:    number | null
  loser_top:   boolean | null
}

// Standard 8-man single-elimination with full consolation
const ROUTING_8: Routing[] = [
  { slot: 1,  round: 'QF',  winner_to: 5,    winner_top: true,  loser_to: 7,    loser_top: true  },
  { slot: 2,  round: 'QF',  winner_to: 5,    winner_top: false, loser_to: 7,    loser_top: false },
  { slot: 3,  round: 'QF',  winner_to: 6,    winner_top: true,  loser_to: 8,    loser_top: true  },
  { slot: 4,  round: 'QF',  winner_to: 6,    winner_top: false, loser_to: 8,    loser_top: false },
  { slot: 5,  round: 'SF',  winner_to: 9,    winner_top: true,  loser_to: 10,   loser_top: true  },
  { slot: 6,  round: 'SF',  winner_to: 9,    winner_top: false, loser_to: 10,   loser_top: false },
  { slot: 7,  round: 'CSF', winner_to: 11,   winner_top: true,  loser_to: 12,   loser_top: true  },
  { slot: 8,  round: 'CSF', winner_to: 11,   winner_top: false, loser_to: 12,   loser_top: false },
  { slot: 9,  round: 'F',   winner_to: null,  winner_top: null,  loser_to: null,  loser_top: null },
  { slot: 10, round: '3rd', winner_to: null,  winner_top: null,  loser_to: null,  loser_top: null },
  { slot: 11, round: '5th', winner_to: null,  winner_top: null,  loser_to: null,  loser_top: null },
  { slot: 12, round: '7th', winner_to: null,  winner_top: null,  loser_to: null,  loser_top: null },
]

// 4-man: 2 semis + finals + 3rd
const ROUTING_4: Routing[] = [
  { slot: 1, round: 'SF',  winner_to: 3,   winner_top: true,  loser_to: 4,   loser_top: true  },
  { slot: 2, round: 'SF',  winner_to: 3,   winner_top: false, loser_to: 4,   loser_top: false },
  { slot: 3, round: 'F',   winner_to: null, winner_top: null,  loser_to: null, loser_top: null },
  { slot: 4, round: '3rd', winner_to: null, winner_top: null,  loser_to: null, loser_top: null },
]

// 32-man: R1(1-16) → R2(17-24) → QF(25-28) → SF(29-30) → F(31)
// Consolation: QF losers cross-bracket in CQF(32-33) → CQF winners face opposite SF loser in CSF(34-35) → 3rd(36)/5th(37)
const ROUTING_32: Routing[] = [
  // R1: pairs (1,2)→17, (3,4)→18, (5,6)→19, (7,8)→20, (9,10)→21, (11,12)→22, (13,14)→23, (15,16)→24
  { slot: 1,  round: 'R1',  winner_to: 17, winner_top: true,  loser_to: null, loser_top: null },
  { slot: 2,  round: 'R1',  winner_to: 17, winner_top: false, loser_to: null, loser_top: null },
  { slot: 3,  round: 'R1',  winner_to: 18, winner_top: true,  loser_to: null, loser_top: null },
  { slot: 4,  round: 'R1',  winner_to: 18, winner_top: false, loser_to: null, loser_top: null },
  { slot: 5,  round: 'R1',  winner_to: 19, winner_top: true,  loser_to: null, loser_top: null },
  { slot: 6,  round: 'R1',  winner_to: 19, winner_top: false, loser_to: null, loser_top: null },
  { slot: 7,  round: 'R1',  winner_to: 20, winner_top: true,  loser_to: null, loser_top: null },
  { slot: 8,  round: 'R1',  winner_to: 20, winner_top: false, loser_to: null, loser_top: null },
  { slot: 9,  round: 'R1',  winner_to: 21, winner_top: true,  loser_to: null, loser_top: null },
  { slot: 10, round: 'R1',  winner_to: 21, winner_top: false, loser_to: null, loser_top: null },
  { slot: 11, round: 'R1',  winner_to: 22, winner_top: true,  loser_to: null, loser_top: null },
  { slot: 12, round: 'R1',  winner_to: 22, winner_top: false, loser_to: null, loser_top: null },
  { slot: 13, round: 'R1',  winner_to: 23, winner_top: true,  loser_to: null, loser_top: null },
  { slot: 14, round: 'R1',  winner_to: 23, winner_top: false, loser_to: null, loser_top: null },
  { slot: 15, round: 'R1',  winner_to: 24, winner_top: true,  loser_to: null, loser_top: null },
  { slot: 16, round: 'R1',  winner_to: 24, winner_top: false, loser_to: null, loser_top: null },
  // R2: pairs (17,18)→25, (19,20)→26, (21,22)→27, (23,24)→28
  { slot: 17, round: 'R2',  winner_to: 25, winner_top: true,  loser_to: null, loser_top: null },
  { slot: 18, round: 'R2',  winner_to: 25, winner_top: false, loser_to: null, loser_top: null },
  { slot: 19, round: 'R2',  winner_to: 26, winner_top: true,  loser_to: null, loser_top: null },
  { slot: 20, round: 'R2',  winner_to: 26, winner_top: false, loser_to: null, loser_top: null },
  { slot: 21, round: 'R2',  winner_to: 27, winner_top: true,  loser_to: null, loser_top: null },
  { slot: 22, round: 'R2',  winner_to: 27, winner_top: false, loser_to: null, loser_top: null },
  { slot: 23, round: 'R2',  winner_to: 28, winner_top: true,  loser_to: null, loser_top: null },
  { slot: 24, round: 'R2',  winner_to: 28, winner_top: false, loser_to: null, loser_top: null },
  // QF: winners→SF, losers cross-bracket into CQF
  { slot: 25, round: 'QF',  winner_to: 29, winner_top: true,  loser_to: 32,  loser_top: true  },
  { slot: 26, round: 'QF',  winner_to: 29, winner_top: false, loser_to: 33,  loser_top: true  },
  { slot: 27, round: 'QF',  winner_to: 30, winner_top: true,  loser_to: 32,  loser_top: false },
  { slot: 28, round: 'QF',  winner_to: 30, winner_top: false, loser_to: 33,  loser_top: false },
  // SF: winners→F, losers cross into CSF (opposite side)
  { slot: 29, round: 'SF',  winner_to: 31, winner_top: true,  loser_to: 35,  loser_top: false },
  { slot: 30, round: 'SF',  winner_to: 31, winner_top: false, loser_to: 34,  loser_top: false },
  { slot: 31, round: 'F',   winner_to: null, winner_top: null, loser_to: null, loser_top: null },
  // CQF: QF-top-side losers (25,27) vs QF-bottom-side losers (26,28)
  { slot: 32, round: 'CQF', winner_to: 34, winner_top: true,  loser_to: null, loser_top: null },
  { slot: 33, round: 'CQF', winner_to: 35, winner_top: true,  loser_to: null, loser_top: null },
  // CSF: CQF winner faces opposite-side SF loser
  { slot: 34, round: 'CSF', winner_to: 36, winner_top: true,  loser_to: 37,  loser_top: true  },
  { slot: 35, round: 'CSF', winner_to: 36, winner_top: false, loser_to: 37,  loser_top: false },
  { slot: 36, round: '3rd', winner_to: null, winner_top: null, loser_to: null, loser_top: null },
  { slot: 37, round: '5th', winner_to: null, winner_top: null, loser_to: null, loser_top: null },
]

// Seed → slot/position map for 8-man
const SEED_POSITIONS_8: Record<number, { slot: number; position: 'top' | 'bottom' }> = {
  1: { slot: 1, position: 'top'    },
  8: { slot: 1, position: 'bottom' },
  4: { slot: 2, position: 'top'    },
  5: { slot: 2, position: 'bottom' },
  3: { slot: 3, position: 'top'    },
  6: { slot: 3, position: 'bottom' },
  2: { slot: 4, position: 'top'    },
  7: { slot: 4, position: 'bottom' },
}

// Seed → slot/position map for 4-man
const SEED_POSITIONS_4: Record<number, { slot: number; position: 'top' | 'bottom' }> = {
  1: { slot: 1, position: 'top'    },
  4: { slot: 1, position: 'bottom' },
  2: { slot: 2, position: 'top'    },
  3: { slot: 2, position: 'bottom' },
}

// Seed → slot/position map for 32-man (standard NJ balanced bracket)
const SEED_POSITIONS_32: Record<number, { slot: number; position: 'top' | 'bottom' }> = {
  1:  { slot: 1,  position: 'top'    },
  32: { slot: 1,  position: 'bottom' },
  16: { slot: 2,  position: 'top'    },
  17: { slot: 2,  position: 'bottom' },
  9:  { slot: 3,  position: 'top'    },
  24: { slot: 3,  position: 'bottom' },
  8:  { slot: 4,  position: 'top'    },
  25: { slot: 4,  position: 'bottom' },
  5:  { slot: 5,  position: 'top'    },
  28: { slot: 5,  position: 'bottom' },
  12: { slot: 6,  position: 'top'    },
  21: { slot: 6,  position: 'bottom' },
  13: { slot: 7,  position: 'top'    },
  20: { slot: 7,  position: 'bottom' },
  4:  { slot: 8,  position: 'top'    },
  29: { slot: 8,  position: 'bottom' },
  3:  { slot: 9,  position: 'top'    },
  30: { slot: 9,  position: 'bottom' },
  14: { slot: 10, position: 'top'    },
  19: { slot: 10, position: 'bottom' },
  11: { slot: 11, position: 'top'    },
  22: { slot: 11, position: 'bottom' },
  6:  { slot: 12, position: 'top'    },
  27: { slot: 12, position: 'bottom' },
  7:  { slot: 13, position: 'top'    },
  26: { slot: 13, position: 'bottom' },
  10: { slot: 14, position: 'top'    },
  23: { slot: 14, position: 'bottom' },
  15: { slot: 15, position: 'top'    },
  18: { slot: 15, position: 'bottom' },
  2:  { slot: 16, position: 'top'    },
  31: { slot: 16, position: 'bottom' },
}

type SeedEntry = {
  seed:        number
  wrestler_id: string | null
  name_raw:    string
  school_id:   number | null
  school_raw:  string
}

type SlotInsert = {
  in_season_tournament_id: string  // uuid, passed as string from URL params
  weight_class:            number
  round_name:              string
  slot_number:             number
  bracket_size:            number
  top_wrestler_id:         string | null
  top_name_raw:            string | null
  top_school_id:           number | null
  top_seed:                number | null
  bottom_wrestler_id:      string | null
  bottom_name_raw:         string | null
  bottom_school_id:        number | null
  bottom_seed:             number | null
  advances_winner_to_slot: number | null
  advances_loser_to_slot:  number | null
  winner_is_top_in_next:   boolean | null
  loser_is_top_in_next:    boolean | null
}

function buildSlots(tid: string, weight: number, size: 4 | 8 | 32, seeds: SeedEntry[]): SlotInsert[] {
  const routing = size === 4 ? ROUTING_4 : size === 32 ? ROUTING_32 : ROUTING_8
  const seedPositions = size === 4 ? SEED_POSITIONS_4 : size === 32 ? SEED_POSITIONS_32 : SEED_POSITIONS_8
  const seedMap = new Map(seeds.map(s => [s.seed, s]))

  // Invert seed positions: slot → { top: seed, bottom: seed }
  const slotSeeds: Record<number, { top: SeedEntry | null; bottom: SeedEntry | null }> = {}
  for (const [seedNum, pos] of Object.entries(seedPositions)) {
    const seed = parseInt(seedNum)
    const entry = seedMap.get(seed) ?? null
    if (!slotSeeds[pos.slot]) slotSeeds[pos.slot] = { top: null, bottom: null }
    slotSeeds[pos.slot][pos.position] = entry
  }

  return routing.map(r => {
    const wrestlers = slotSeeds[r.slot] ?? { top: null, bottom: null }
    // Find seeds for this slot
    const topSeedNum    = Object.entries(seedPositions).find(([, v]) => v.slot === r.slot && v.position === 'top')?.[0]
    const bottomSeedNum = Object.entries(seedPositions).find(([, v]) => v.slot === r.slot && v.position === 'bottom')?.[0]

    return {
      in_season_tournament_id: tid,
      weight_class:            weight,
      round_name:              r.round,
      slot_number:             r.slot,
      bracket_size:            size,
      top_wrestler_id:         wrestlers.top?.wrestler_id ?? null,
      top_name_raw:            wrestlers.top?.name_raw ?? null,
      top_school_id:           wrestlers.top?.school_id ?? null,
      top_seed:                topSeedNum ? parseInt(topSeedNum) : null,
      bottom_wrestler_id:      wrestlers.bottom?.wrestler_id ?? null,
      bottom_name_raw:         wrestlers.bottom?.name_raw ?? null,
      bottom_school_id:        wrestlers.bottom?.school_id ?? null,
      bottom_seed:             bottomSeedNum ? parseInt(bottomSeedNum) : null,
      advances_winner_to_slot: r.winner_to,
      advances_loser_to_slot:  r.loser_to,
      winner_is_top_in_next:   r.winner_top,
      loser_is_top_in_next:    r.loser_top,
    }
  })
}

// ── Auth helper ───────────────────────────────────────────────────────────────

async function requireAdmin() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return null
  const { data: appUser } = await userSupabase
    .from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

// ── GET /api/admin/tournament-brackets?tid=X[&weight=Y] ──────────────────────
// Returns bracket slots. If weight is omitted, returns all weights.

export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tid    = req.nextUrl.searchParams.get('tid')
  const weight = req.nextUrl.searchParams.get('weight')
  if (!tid) return NextResponse.json({ error: 'tid required' }, { status: 400 })

  const db = createSupabaseAdmin()
  let q = db
    .from('tournament_bracket_slots')
    .select('*')
    .eq('in_season_tournament_id', tid)
    .order('weight_class')
    .order('slot_number')

  if (weight) q = q.eq('weight_class', parseInt(weight))

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by weight_class for convenience
  const byWeight: Record<number, unknown[]> = {}
  for (const slot of data ?? []) {
    const wc = (slot as { weight_class: number }).weight_class
    if (!byWeight[wc]) byWeight[wc] = []
    byWeight[wc].push(slot)
  }

  // Also return how many seeds exist per weight class so the UI knows
  // which weights can be auto-generated from seeds.
  const { data: seedRows } = await db
    .from('in_season_tournament_seeds')
    .select('weight_class')
    .eq('in_season_tournament_id', tid)

  const seedCounts: Record<number, number> = {}
  for (const row of seedRows ?? []) {
    const wc = (row as { weight_class: number }).weight_class
    seedCounts[wc] = (seedCounts[wc] ?? 0) + 1
  }

  return NextResponse.json({ slots: data ?? [], byWeight, seedCounts })
}

// ── POST /api/admin/tournament-brackets ──────────────────────────────────────

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, in_season_tournament_id: tid, gender } = body

  if (!tid) return NextResponse.json({ error: 'in_season_tournament_id required' }, { status: 400 })

  const db = createSupabaseAdmin()
  const boutTable = gender === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts'

  // ── generate_from_seeds ───────────────────────────────────────────────────
  // Reads in_season_tournament_seeds, generates bracket slots for one weight
  // or all weights that have seeds. Upserts (replaces any existing bracket).
  if (action === 'generate_from_seeds') {
    const weight = body.weight_class ? parseInt(body.weight_class) : null
    // bracket_size can be forced via body; otherwise auto-detected per weight from seed count
    const forcedSize: 4 | 8 | 32 | null = body.bracket_size === 4 ? 4 : body.bracket_size === 8 ? 8 : body.bracket_size === 32 ? 32 : null

    // Fetch seeds
    let seedQ = db
      .from('in_season_tournament_seeds')
      .select('weight_class, seed, wrestler_name_raw, school_name_raw, wrestler_id, school_id')
      .eq('in_season_tournament_id', tid)
      .order('weight_class')
      .order('seed')
    if (weight) seedQ = seedQ.eq('weight_class', weight)

    const { data: seedRows, error: seedErr } = await seedQ
    if (seedErr) return NextResponse.json({ error: seedErr.message }, { status: 500 })
    if (!seedRows?.length) return NextResponse.json({ error: 'No seeds found' }, { status: 404 })

    // Group seeds by weight class
    const seedsByWeight = new Map<number, SeedEntry[]>()
    for (const row of seedRows) {
      const wc = row.weight_class as number
      if (!seedsByWeight.has(wc)) seedsByWeight.set(wc, [])
      seedsByWeight.get(wc)!.push({
        seed:        row.seed as number,
        wrestler_id: (row.wrestler_id as string | null),
        name_raw:    (row.wrestler_name_raw as string) ?? '',
        school_id:   (row.school_id as number | null),
        school_raw:  (row.school_name_raw as string) ?? '',
      })
    }

    const allSlots: SlotInsert[] = []
    for (const [wc, seeds] of seedsByWeight) {
      let bracketSize: 4 | 8 | 32
      if (forcedSize) {
        bracketSize = forcedSize
      } else {
        const n = seeds.length
        bracketSize = n > 8 ? 32 : n > 4 ? 8 : 4
      }
      allSlots.push(...buildSlots(tid, wc, bracketSize, seeds))
    }

    // Delete existing slots for these weights, then insert fresh
    const weights = [...seedsByWeight.keys()]
    await db
      .from('tournament_bracket_slots')
      .delete()
      .eq('in_season_tournament_id', tid)
      .in('weight_class', weights)

    const { error: insErr } = await db.from('tournament_bracket_slots').insert(allSlots)
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, weights_generated: weights, slot_count: allSlots.length })
  }

  // ── generate_empty ────────────────────────────────────────────────────────
  // Creates an empty bracket template for a single weight class with no wrestlers assigned.
  if (action === 'generate_empty') {
    const weight      = parseInt(body.weight_class)
    const bracketSize = (body.bracket_size === 4 ? 4 : 8) as 4 | 8
    if (!weight) return NextResponse.json({ error: 'weight_class required' }, { status: 400 })

    const slots = buildSlots(tid, weight, bracketSize, [])
    await db.from('tournament_bracket_slots').delete()
      .eq('in_season_tournament_id', tid).eq('weight_class', weight)

    const { error } = await db.from('tournament_bracket_slots').insert(slots)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, slot_count: slots.length })
  }

  // ── set_wrestler ──────────────────────────────────────────────────────────
  // Assign a wrestler to a specific slot position (for manual bracket building).
  if (action === 'set_wrestler') {
    const { weight_class, slot_number, position, wrestler_id, name_raw, school_id, seed } = body
    if (!weight_class || !slot_number || !position) {
      return NextResponse.json({ error: 'weight_class, slot_number, position required' }, { status: 400 })
    }

    const col = position === 'top' ? 'top' : 'bottom'
    const update: Record<string, unknown> = {
      [`${col}_wrestler_id`]: wrestler_id ?? null,
      [`${col}_name_raw`]:    name_raw    ?? null,
      [`${col}_school_id`]:   school_id   ?? null,
      [`${col}_seed`]:        seed        ?? null,
    }

    const { error } = await db
      .from('tournament_bracket_slots')
      .update(update)
      .eq('in_season_tournament_id', tid)
      .eq('weight_class', weight_class)
      .eq('slot_number', slot_number)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ── update_result ─────────────────────────────────────────────────────────
  // Record the result of a match and auto-advance wrestlers to the next slot.
  if (action === 'update_result') {
    const { weight_class, slot_number, winner_position, result_type, result_detail } = body
    if (!weight_class || !slot_number || !winner_position) {
      return NextResponse.json({ error: 'weight_class, slot_number, winner_position required' }, { status: 400 })
    }

    // Fetch the current slot
    const { data: slot, error: slotErr } = await db
      .from('tournament_bracket_slots')
      .select('*')
      .eq('in_season_tournament_id', tid)
      .eq('weight_class', weight_class)
      .eq('slot_number', slot_number)
      .single()

    if (slotErr || !slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })

    const s = slot as Record<string, unknown>
    const winnerWrestlerId = winner_position === 'top' ? s.top_wrestler_id : s.bottom_wrestler_id
    const winnerNameRaw    = winner_position === 'top' ? s.top_name_raw    : s.bottom_name_raw
    const winnerSchoolId   = winner_position === 'top' ? s.top_school_id   : s.bottom_school_id
    const winnerSeed       = winner_position === 'top' ? s.top_seed        : s.bottom_seed
    const loserWrestlerId  = winner_position === 'top' ? s.bottom_wrestler_id : s.top_wrestler_id
    const loserNameRaw     = winner_position === 'top' ? s.bottom_name_raw    : s.top_name_raw
    const loserSchoolId    = winner_position === 'top' ? s.bottom_school_id   : s.top_school_id
    const loserSeed        = winner_position === 'top' ? s.bottom_seed        : s.top_seed

    // Update this slot with the result
    const updates: Record<string, unknown>[] = [{
      eq: { in_season_tournament_id: tid, weight_class, slot_number },
      data: {
        winner_position,
        winner_wrestler_id: winnerWrestlerId,
        result_type:        result_type    ?? null,
        result_detail:      result_detail  ?? null,
      },
    }]

    // Auto-advance winner
    if (s.advances_winner_to_slot) {
      const winnerPos = s.winner_is_top_in_next ? 'top' : 'bottom'
      updates.push({
        eq: { in_season_tournament_id: tid, weight_class, slot_number: s.advances_winner_to_slot },
        data: {
          [`${winnerPos}_wrestler_id`]: winnerWrestlerId,
          [`${winnerPos}_name_raw`]:    winnerNameRaw,
          [`${winnerPos}_school_id`]:   winnerSchoolId,
          [`${winnerPos}_seed`]:        winnerSeed,
        },
      })
    }

    // Auto-advance loser
    if (s.advances_loser_to_slot) {
      const loserPos = s.loser_is_top_in_next ? 'top' : 'bottom'
      updates.push({
        eq: { in_season_tournament_id: tid, weight_class, slot_number: s.advances_loser_to_slot },
        data: {
          [`${loserPos}_wrestler_id`]: loserWrestlerId,
          [`${loserPos}_name_raw`]:    loserNameRaw,
          [`${loserPos}_school_id`]:   loserSchoolId,
          [`${loserPos}_seed`]:        loserSeed,
        },
      })
    }

    // Apply all updates
    for (const u of updates) {
      const eq = u.eq as Record<string, unknown>
      let q = db.from('tournament_bracket_slots').update(u.data as Record<string, unknown>)
        .eq('in_season_tournament_id', eq.in_season_tournament_id as string)
        .eq('weight_class', eq.weight_class as number)
        .eq('slot_number', eq.slot_number as number)
      const { error } = await q
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      advanced_winner_to: s.advances_winner_to_slot ?? null,
      advanced_loser_to:  s.advances_loser_to_slot  ?? null,
    })
  }

  // ── diagnose ─────────────────────────────────────────────────────────────
  // Returns raw round values and sample names from bouts + slots so we can
  // see exactly what format difference is causing sync failures.
  if (action === 'diagnose') {
    const weightFilter = body.weight_class ? parseInt(body.weight_class) : null

    let boutQ = db
      .from(boutTable)
      .select('weight_class, round, winner, wrestler1_name_raw, wrestler2_name_raw')
      .eq('in_season_tournament_id', tid)
    if (weightFilter) boutQ = boutQ.eq('weight_class', weightFilter)
    const { data: bouts } = await boutQ

    let slotQ = db
      .from('tournament_bracket_slots')
      .select('weight_class, round_name, slot_number, top_name_raw, bottom_name_raw, winner_position')
      .eq('in_season_tournament_id', tid)
    if (weightFilter) slotQ = slotQ.eq('weight_class', weightFilter)
    const { data: slots } = await slotQ

    // Count bouts per round (including round=null)
    const boutsByRound: Record<string, number> = {}
    const boutSampleNames: Record<string, string> = {}
    for (const b of bouts ?? []) {
      const r = String((b as Record<string, unknown>).round ?? 'NULL')
      boutsByRound[r] = (boutsByRound[r] ?? 0) + 1
      if (!boutSampleNames[r]) {
        boutSampleNames[r] = `"${(b as Record<string, unknown>).wrestler1_name_raw}" vs "${(b as Record<string, unknown>).wrestler2_name_raw}"`
      }
    }

    // Count slots per round_name
    const slotsByRound: Record<string, { total: number; withResult: number; withTop: number; withBot: number; sample: string }> = {}
    for (const s of slots ?? []) {
      const r = String((s as Record<string, unknown>).round_name ?? 'NULL')
      if (!slotsByRound[r]) slotsByRound[r] = { total: 0, withResult: 0, withTop: 0, withBot: 0, sample: '' }
      slotsByRound[r].total++
      if ((s as Record<string, unknown>).winner_position) slotsByRound[r].withResult++
      if ((s as Record<string, unknown>).top_name_raw) slotsByRound[r].withTop++
      if ((s as Record<string, unknown>).bottom_name_raw) slotsByRound[r].withBot++
      if (!slotsByRound[r].sample && ((s as Record<string, unknown>).top_name_raw || (s as Record<string, unknown>).bottom_name_raw)) {
        slotsByRound[r].sample = `"${(s as Record<string, unknown>).top_name_raw ?? ''}" / "${(s as Record<string, unknown>).bottom_name_raw ?? ''}"`
      }
    }

    return NextResponse.json({
      bouts_by_round: boutsByRound,
      bout_sample_names: boutSampleNames,
      slots_by_round: slotsByRound,
      total_bouts: (bouts ?? []).length,
      total_slots: (slots ?? []).length,
    })
  }

  // ── sync_from_bouts ───────────────────────────────────────────────────────
  // Reads tournament_bouts with results and matches them to bracket slots by
  // round + wrestler name. Applies results and auto-advances wrestlers in
  // round order so that downstream slots are populated before being matched.
  if (action === 'sync_from_bouts') {
    const weightFilter = body.weight_class ? parseInt(body.weight_class) : null

    const BOUT_ROUND_MAP: Record<string, string> = {
      'R1': 'R1', 'R2': 'R2',
      'QF': 'QF', 'SF': 'SF', 'F': 'F',
      'CQF': 'CQF', 'Cons. QF': 'CQF',
      'CSF': 'CSF', 'Cons. SF': 'CSF',
      '3rd_Place': '3rd', '3rd': '3rd',
      '5th_Place': '5th', '5th': '5th',
      '7th_Place': '7th', '7th': '7th',
    }
    // Process championship rounds first (R1→R2→QF) so advancement populates later slots
    const ROUND_ORDER = ['R1', 'R2', 'QF', 'SF', 'CQF', 'CSF', 'F', '3rd', '5th', '7th']

    // Pull wrestler IDs from bouts so we can propagate linked identities into slots
    let boutQ = db
      .from(boutTable)
      .select('weight_class, round, winner, result_type, result_detail, fall_time_seconds, wrestler1_name_raw, wrestler2_name_raw, wrestler1_id, wrestler2_id, wrestler1_school_id, wrestler2_school_id')
      .eq('in_season_tournament_id', tid)
      .not('wrestler1_name_raw', 'is', null)
    if (weightFilter) boutQ = boutQ.eq('weight_class', weightFilter)

    const { data: boutRows, error: boutErr } = await boutQ
    if (boutErr) return NextResponse.json({ error: boutErr.message }, { status: 500 })

    type NormBout = {
      weight_class: number
      slotRound: string
      winner: number | null
      result_type: string | null
      result_detail: string | null
      fall_time_seconds: number | null
      wrestler1_name_raw: string | null
      wrestler2_name_raw: string | null
      wrestler1_id: string | null
      wrestler2_id: string | null
      wrestler1_school_id: number | null
      wrestler2_school_id: number | null
    }

    const normalizedBouts = (boutRows ?? []).flatMap(b => {
      const slotRound = BOUT_ROUND_MAP[(b.round as string) ?? ''] ?? null
      if (!slotRound) return []
      return [{ ...b, slotRound } as NormBout]
    })

    // Build wrestler name lookup: id → proper site name
    const wrestlerIds = [...new Set(
      normalizedBouts.flatMap(b => [b.wrestler1_id, b.wrestler2_id].filter(Boolean) as string[])
    )]
    const wrestlerNameMap = new Map<string, string>()
    if (wrestlerIds.length) {
      const { data: wRows } = await db.from('wrestlers').select('id, name').in('id', wrestlerIds)
      for (const w of wRows ?? []) wrestlerNameMap.set(w.id as string, w.name as string)
    }

    const weights = weightFilter
      ? [weightFilter]
      : [...new Set(normalizedBouts.map(b => b.weight_class))]

    let synced = 0
    let skipped = 0

    // Step 1: Clear all result data from existing slots so we start from a clean state.
    // Keep the slot structure (slot_number, round_name, routing columns, bracket_size)
    // but wipe names, seeds, and results — the sync re-populates everything from bouts.
    for (const wc of weights) {
      await db.from('tournament_bracket_slots')
        .update({
          top_name_raw: null, top_wrestler_id: null, top_school_id: null, top_seed: null,
          bottom_name_raw: null, bottom_wrestler_id: null, bottom_school_id: null, bottom_seed: null,
          winner_position: null, winner_wrestler_id: null, result_type: null, result_detail: null,
        })
        .eq('in_season_tournament_id', tid)
        .eq('weight_class', wc as number)
    }

    // Step 2: For each weight, process rounds in order. Assign each bout to the next
    // available (not-yet-won) slot in that round. No name-matching required.
    for (const wc of weights) {
      // Load all slots for this weight once, keyed by round
      const { data: allSlots } = await db
        .from('tournament_bracket_slots')
        .select('*')
        .eq('in_season_tournament_id', tid)
        .eq('weight_class', wc as number)
        .order('slot_number')

      if (!allSlots) continue

      // Build a mutable map: round → ordered array of slots
      const slotsByRound: Record<string, Record<string, unknown>[]> = {}
      for (const s of allSlots) {
        const r = (s as Record<string, unknown>).round_name as string
        if (!slotsByRound[r]) slotsByRound[r] = []
        slotsByRound[r].push(s as Record<string, unknown>)
      }

      // Build a mutable map: slot_number → slot object (for advancing into next rounds)
      const slotByNum: Record<number, Record<string, unknown>> = {}
      for (const s of allSlots) {
        slotByNum[(s as Record<string, unknown>).slot_number as number] = s as Record<string, unknown>
      }

      for (const slotRound of ROUND_ORDER) {
        const roundBouts = normalizedBouts.filter(b => b.weight_class === wc && b.slotRound === slotRound)
        if (!roundBouts.length) continue

        const slots = slotsByRound[slotRound] ?? []
        const isR1 = slotRound === 'R1'
        let seqIdx = 0

        for (const bout of roundBouts) {
          const w1id   = (bout.wrestler1_id as string | null) ?? null
          const w2id   = (bout.wrestler2_id as string | null) ?? null
          const w1name = (w1id && wrestlerNameMap.get(w1id)) || bout.wrestler1_name_raw || null
          const w2name = (w2id && wrestlerNameMap.get(w2id)) || bout.wrestler2_name_raw || null
          const s1id   = (bout.wrestler1_school_id as number | null) ?? null
          const s2id   = (bout.wrestler2_school_id as number | null) ?? null

          let slot: Record<string, unknown> | null = null

          if (isR1) {
            // R1: sequential — the bracket draw order isn't guaranteed to match seed order,
            // so just fill slots in order; winner advancement will populate R2 slots correctly.
            while (seqIdx < slots.length && slots[seqIdx].winner_position) seqIdx++
            if (seqIdx >= slots.length) { skipped++; continue }
            slot = slots[seqIdx++]
          } else {
            // R2+: winner advancement already placed the correct wrestlers into these slots.
            // Match this bout against the slot whose wrestlers match.
            const w1 = w1name ?? ''
            const w2 = w2name ?? ''
            slot = slots.find(s => {
              if (s.winner_position) return false
              const top = (s.top_name_raw as string | null) ?? ''
              const bot = (s.bottom_name_raw as string | null) ?? ''
              return (top === w1 && bot === w2) || (top === w2 && bot === w1)
            }) ?? null

            // Fallback: if name match fails (wrestler not linked / different import format),
            // use the next slot that doesn't yet have a result.
            if (!slot) {
              slot = slots.find(s => !s.winner_position) ?? null
            }
            if (!slot) { skipped++; continue }
          }

          // Determine winner position.
          // For R1: wrestler1 is always top (we just filled it that way).
          // For R2+: check which slot position wrestler1 is actually in.
          const w1wins = (bout.winner ?? 1) === 1
          let winnerPosition: 'top' | 'bottom'
          if (isR1) {
            winnerPosition = w1wins ? 'top' : 'bottom'
          } else {
            const slotTop = (slot.top_name_raw as string | null) ?? ''
            const w1IsTop = slotTop === (w1name ?? '') || (w1name !== null && w1name !== '' && slotTop.toLowerCase() === w1name.toLowerCase())
            winnerPosition = w1wins ? (w1IsTop ? 'top' : 'bottom') : (w1IsTop ? 'bottom' : 'top')
          }

          let resultDetail: string | null = bout.result_detail ?? null
          if ((bout.result_type ?? '').toLowerCase() === 'fall' && bout.fall_time_seconds) {
            const secs = bout.fall_time_seconds
            resultDetail = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
          }

          // For R2+, reuse whatever wrestler IDs/names are already in the slot
          // (they were placed there by winner advancement and are authoritative).
          const topWid  = isR1 ? w1id  : (slot.top_wrestler_id as string | null)
          const botWid  = isR1 ? w2id  : (slot.bottom_wrestler_id as string | null)
          const topName = isR1 ? w1name : (slot.top_name_raw as string | null)
          const botName = isR1 ? w2name : (slot.bottom_name_raw as string | null)
          const topSid  = isR1 ? s1id  : (slot.top_school_id as number | null)
          const botSid  = isR1 ? s2id  : (slot.bottom_school_id as number | null)

          const winnerName = winnerPosition === 'top' ? topName : botName
          const winnerWid  = winnerPosition === 'top' ? topWid  : botWid
          const winnerSid  = winnerPosition === 'top' ? topSid  : botSid
          const loserName  = winnerPosition === 'top' ? botName : topName
          const loserWid   = winnerPosition === 'top' ? botWid  : topWid
          const loserSid   = winnerPosition === 'top' ? botSid  : topSid

          const updatePayload: Record<string, unknown> = {
            winner_position: winnerPosition,
            winner_wrestler_id: winnerWid,
            result_type: bout.result_type ?? null,
            result_detail: resultDetail,
          }
          if (isR1) {
            // Only write wrestler names/IDs for R1 (R2+ slots already have them from advancement)
            updatePayload.top_name_raw = w1name
            updatePayload.top_wrestler_id = w1id
            updatePayload.top_school_id = s1id
            updatePayload.bottom_name_raw = w2name
            updatePayload.bottom_wrestler_id = w2id
            updatePayload.bottom_school_id = s2id
          }

          const { error: slotErr } = await db.from('tournament_bracket_slots')
            .update(updatePayload)
            .eq('in_season_tournament_id', tid)
            .eq('weight_class', wc as number)
            .eq('slot_number', slot.slot_number as number)

          if (slotErr) { skipped++; continue }

          slot.winner_position = winnerPosition
          synced++

          // Advance winner to next round slot
          if (slot.advances_winner_to_slot) {
            const nextSlot = slotByNum[slot.advances_winner_to_slot as number]
            const pos = slot.winner_is_top_in_next ? 'top' : 'bottom'
            if (nextSlot) {
              nextSlot[`${pos}_name_raw`]    = winnerName
              nextSlot[`${pos}_wrestler_id`] = winnerWid
              nextSlot[`${pos}_school_id`]   = winnerSid
            }
            await db.from('tournament_bracket_slots')
              .update({ [`${pos}_name_raw`]: winnerName, [`${pos}_wrestler_id`]: winnerWid, [`${pos}_school_id`]: winnerSid })
              .eq('in_season_tournament_id', tid).eq('weight_class', wc as number).eq('slot_number', slot.advances_winner_to_slot as number)
          }

          // Advance loser to consolation slot
          if (slot.advances_loser_to_slot) {
            const nextSlot = slotByNum[slot.advances_loser_to_slot as number]
            const pos = slot.loser_is_top_in_next ? 'top' : 'bottom'
            if (nextSlot) {
              nextSlot[`${pos}_name_raw`]    = loserName
              nextSlot[`${pos}_wrestler_id`] = loserWid
              nextSlot[`${pos}_school_id`]   = loserSid
            }
            await db.from('tournament_bracket_slots')
              .update({ [`${pos}_name_raw`]: loserName, [`${pos}_wrestler_id`]: loserWid, [`${pos}_school_id`]: loserSid })
              .eq('in_season_tournament_id', tid).eq('weight_class', wc as number).eq('slot_number', slot.advances_loser_to_slot as number)
          }
        }
      }
    }

    return NextResponse.json({ ok: true, synced, skipped, total_bouts: boutRows?.length ?? 0, normalized_bouts: normalizedBouts.length, weights_found: weights })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

// ── DELETE /api/admin/tournament-brackets?tid=X[&weight=Y] ──────────────────
// Deletes all bracket slots for a tournament (or a single weight class).

export async function DELETE(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tid    = req.nextUrl.searchParams.get('tid')
  const weight = req.nextUrl.searchParams.get('weight')
  if (!tid) return NextResponse.json({ error: 'tid required' }, { status: 400 })

  const db = createSupabaseAdmin()
  let q = db.from('tournament_bracket_slots').delete().eq('in_season_tournament_id', tid)
  if (weight) q = q.eq('weight_class', parseInt(weight))

  const { error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
