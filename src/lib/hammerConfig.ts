/**
 * Typed reader for hammer_score_config.
 * Call getHammerConfig(gender, season) server-side to get all formula parameters.
 * Falls back to hardcoded defaults if no DB row is found.
 */

import { createSupabaseAdmin } from '@/lib/supabase/service'

// ─── Types ────────────────────────────────────────────────────────────────────

export type OosBand = { lo: number; hi: number }

export type HammerMatchConfig = {
  group_weights: { a: number; b: number; c: number; d: number }
  fall_time_buckets_seconds: number[]       // 5 values: [60,120,180,240,300]
  expected_outcome_thresholds: number[]     // 15 values; descending
  score_rates: {
    favored_better_per_tier: number
    favored_worse_per_tier: number
    favored_loss_to_ot_per_tier: number
    favored_loss_past_ot_per_tier: number
    underdog_better_per_tier: number
    underdog_upset_per_tier: number
    underdog_worse_per_tier: number
    cap_diff: number
  }
  weight_class_adjustment: {
    up_per_class: number
    down_per_class: number
  }
  oos_bands: {
    tier_20: OosBand
    tier_15: OosBand
    tier_other: OosBand
  }
  bootstrap_multiplier: number
  ps_elevation_threshold: number
}

export type PlacePointsRow = {
  '1': number; '2': number; '3': number; '4': number
  '5': number; '6': number; '7': number; '8': number
}

export type HammerTournamentConfig = {
  place_points: {
    '20': PlacePointsRow
    '15': PlacePointsRow
    '10': PlacePointsRow
    '5':  PlacePointsRow
    '1':  PlacePointsRow
  }
  exclude_winner_below_avg: boolean
  component_ceiling: number
}

export type HammerPostseasonConfig = {
  state: {
    place_1: number
    place_2: number
    place_3_4: number
    place_5_6: number
    place_7_8: number
    wins_3plus: number
    wins_2: number
    wins_1: number
    wins_0: number
  }
  district: {
    champion: number
    runner_up: number
    third: number
    entry: number
  }
  component_ceiling: number
}

export type HammerConfig = {
  matches: HammerMatchConfig
  tournaments: HammerTournamentConfig
  postseason: HammerPostseasonConfig
  component_ceilings: {
    postseason: number
    tournament: number
    match: number
  }
}

// ─── Default (mirrors seeded DB values) ──────────────────────────────────────

const DEFAULT_CONFIG: HammerConfig = {
  matches: {
    group_weights: { a: 8, b: 6, c: 4, d: 2 },
    fall_time_buckets_seconds: [60, 120, 180, 240, 300],
    expected_outcome_thresholds: [38, 36, 34, 32, 30, 28, 26, 24, 22, 20, 18, 17, 13, 9, 5],
    score_rates: {
      favored_better_per_tier:    0.25,
      favored_worse_per_tier:     4,
      favored_loss_to_ot_per_tier: 4,
      favored_loss_past_ot_per_tier: 0.5,
      underdog_better_per_tier:   4,
      underdog_upset_per_tier:    0.5,
      underdog_worse_per_tier:    0.25,
      cap_diff: 40,
    },
    weight_class_adjustment: { up_per_class: 8, down_per_class: 6 },
    oos_bands: {
      tier_20:    { lo: 50, hi: 90 },
      tier_15:    { lo: 40, hi: 75 },
      tier_other: { lo: 10, hi: 30 },
    },
    bootstrap_multiplier: 2,
    ps_elevation_threshold: 16,
  },
  tournaments: {
    place_points: {
      '20': { '1': 20, '2': 19, '3': 18, '4': 17, '5': 16, '6': 15, '7': 14, '8': 13 },
      '15': { '1': 15, '2': 14, '3': 13, '4': 12, '5': 11, '6': 10, '7':  9, '8':  8 },
      '10': { '1': 10, '2':  9, '3':  8, '4':  7, '5':  0, '6':  0, '7':  0, '8':  0 },
      '5':  { '1':  5, '2':  3, '3':  1, '4':  0, '5':  0, '6':  0, '7':  0, '8':  0 },
      '1':  { '1':  1, '2':  0, '3':  0, '4':  0, '5':  0, '6':  0, '7':  0, '8':  0 },
    },
    exclude_winner_below_avg: true,
    component_ceiling: 20,
  },
  postseason: {
    state: {
      place_1: 50, place_2: 49, place_3_4: 48,
      place_5_6: 47, place_7_8: 46,
      wins_3plus: 40, wins_2: 38, wins_1: 36, wins_0: 32,
    },
    district: { champion: 20, runner_up: 16, third: 10, entry: 4 },
    component_ceiling: 50,
  },
  component_ceilings: { postseason: 50, tournament: 20, match: 30 },
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

let _cache: Map<string, HammerConfig> | null = null

function cacheKey(gender: string, season: string) {
  return `${gender}:${season}`
}

export async function getHammerConfig(
  gender: 'M' | 'F',
  season: string,
): Promise<HammerConfig> {
  if (!_cache) _cache = new Map()
  const key = cacheKey(gender, season)
  if (_cache.has(key)) return _cache.get(key)!

  const db = createSupabaseAdmin()
  const { data } = await db
    .from('hammer_score_config')
    .select('config')
    .eq('gender', gender)
    .eq('season', season)
    .eq('is_active', true)
    .single()

  const cfg = (data?.config as HammerConfig | null) ?? DEFAULT_CONFIG
  _cache.set(key, cfg)
  return cfg
}

/** Clear the in-process cache (call after saving a new active config). */
export function clearHammerConfigCache() {
  _cache = null
}
