// District pre-seed computation — mirrors the NJSIAA Trackwrestling formula.
// Pre-seed = Prestige Points (prior year advancement) + Caliber Points (best 20 current-season matches).

export type TierKey =
  | '1st_state' | '2nd_state' | '3rd_state' | '4th_state'
  | '5th_state' | '6th_state' | '7th_state' | '8th_state'
  | 'wb4_state' | 'wb3_state' | 'wb2_state' | 'wb1_state'
  | '5th_region' | '6th_region' | 'wb1_region' | '2v3_region'
  | '4th_dist' | 'qtrs_dist' | 'prelim_dist' | 'never'

export type TierRow = {
  key: TierKey
  label: string
  prestige: number
  caliber: number
  decLoss: number  // caliber earned by decision-loss opponent (can be negative)
}

// The NJSIAA district pre-seed chart, in descending order.
// decLoss = 20% of caliber for region/state tiers, 0 for 4th_dist, -1 for lower.
export const TIER_TABLE: TierRow[] = [
  { key: '1st_state',   label: '1st States',       prestige: 125, caliber: 62.5, decLoss: 12.5 },
  { key: '2nd_state',   label: '2nd States',       prestige: 115, caliber: 57.5, decLoss: 11.5 },
  { key: '3rd_state',   label: '3rd States',       prestige: 110, caliber: 55,   decLoss: 11   },
  { key: '4th_state',   label: '4th States',       prestige: 105, caliber: 52.5, decLoss: 10.5 },
  { key: '5th_state',   label: '5th States',       prestige: 100, caliber: 50,   decLoss: 10   },
  { key: '6th_state',   label: '6th States',       prestige:  95, caliber: 47.5, decLoss:  9.5 },
  { key: '7th_state',   label: '7th States',       prestige:  90, caliber: 45,   decLoss:  9   },
  { key: '8th_state',   label: '8th States',       prestige:  85, caliber: 42.5, decLoss:  8.5 },
  { key: 'wb4_state',   label: 'WB4 States',       prestige:  80, caliber: 40,   decLoss:  8   },
  { key: 'wb3_state',   label: 'WB3 States',       prestige:  75, caliber: 37.5, decLoss:  7.5 },
  { key: 'wb2_state',   label: 'WB2 States',       prestige:  70, caliber: 35,   decLoss:  7   },
  { key: 'wb1_state',   label: 'WB1 States',       prestige:  65, caliber: 32.5, decLoss:  6.5 },
  { key: '5th_region',  label: '5th Regions',      prestige:  50, caliber: 25,   decLoss:  5   },
  { key: '6th_region',  label: '6th Regions',      prestige:  45, caliber: 22.5, decLoss:  4.5 },
  { key: 'wb1_region',  label: 'WB1 Regions',      prestige:  40, caliber: 20,   decLoss:  4   },
  { key: '2v3_region',  label: '2v3 Regions',      prestige:  35, caliber: 17.5, decLoss:  3.5 },
  { key: '4th_dist',    label: '4th Districts',    prestige:  15, caliber:  7.5, decLoss:  0   },
  { key: 'qtrs_dist',   label: 'Qtrs Districts',   prestige:  10, caliber:  5,   decLoss: -1   },
  { key: 'prelim_dist', label: 'Prelim Districts', prestige:   5, caliber:  2.5, decLoss: -1   },
  { key: 'never',       label: 'Never Districts',  prestige:   0, caliber:  2,   decLoss: -1   },
]

export const TIER_MAP: Record<TierKey, TierRow> = Object.fromEntries(
  TIER_TABLE.map(t => [t.key, t])
) as Record<TierKey, TierRow>

// OOS / non-NJ opponents: flat 2 pts for a win, -1 for a decision loss
export const OOS_TIER: TierRow = {
  key: 'never', label: 'Non-NJ', prestige: 0, caliber: 2, decLoss: -1,
}

// Map prior-year state placement + wins to a tier key.
export function stateTierKey(statePlacement: number | null, stateWins: number): TierKey {
  if (statePlacement) {
    const map: Record<number, TierKey> = {
      1: '1st_state', 2: '2nd_state', 3: '3rd_state', 4: '4th_state',
      5: '5th_state', 6: '6th_state', 7: '7th_state', 8: '8th_state',
    }
    return map[statePlacement] ?? 'wb4_state'
  }
  // No placement — use win count as WB proxy
  if (stateWins >= 3) return 'wb4_state'
  if (stateWins === 2) return 'wb3_state'
  if (stateWins === 1) return 'wb2_state'
  return 'wb1_state'
}

// Map region match history (for non-state qualifiers) to a tier key.
// made5th/made6th: won/lost the 5th-place match at regions
// consWins: number of consolation wins at regions
export function regionTierKey(made5th: boolean, made6th: boolean, consWins: number): TierKey {
  if (made5th) return '5th_region'
  if (made6th) return '6th_region'
  if (consWins > 0) return 'wb1_region'
  return '2v3_region'
}

// Map district match history (for non-region qualifiers) to a tier key.
// made4th: lost the 3rd-place match at districts
// madeQF: reached at least the quarterfinal round
export function districtTierKey(made4th: boolean, madeQF: boolean): TierKey {
  if (made4th) return '4th_dist'
  if (madeQF) return 'qtrs_dist'
  return 'prelim_dist'
}

// Caliber points earned from a single match result.
// isFall applies to wins only (pin-point bonus).
// isForfeit: forfeit wins earn 2 pts flat regardless of opponent tier.
// isDecisionLoss: only decision losses earn points (positive for strong opponents, negative for weak).
// Other losses (fall, MD, TF, DQ) earn 0.
export function matchCaliberPts(
  oppTier: TierRow,
  isWin: boolean,
  isFall: boolean,
  isForfeit: boolean,
  isDecisionLoss: boolean,
  isOOS: boolean,
): number {
  if (isWin) {
    if (isForfeit) return 2
    const base = isOOS ? 2 : oppTier.caliber
    return isFall ? base + 1 : base
  }
  if (isDecisionLoss) {
    return isOOS ? -1 : oppTier.decLoss
  }
  return 0
}

export type MatchCaliberRecord = {
  oppId: string | null
  oppName: string
  oppTierLabel: string
  earned: number
  isWin: boolean
  isFall: boolean
}

export type PreSeedRow = {
  wrestler_id: string
  first_name: string
  last_name: string
  school_name: string
  weight_class: string | null
  tier_key: TierKey
  tier_label: string
  prestige: number
  caliber: number
  preseed_total: number
  match_count: number
  top_matches: MatchCaliberRecord[]
}
