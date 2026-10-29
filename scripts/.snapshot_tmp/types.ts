// ─── Snapshot Dashboard types ─────────────────────────────────────────────────

export type SectionScope = 'state' | 'north_i' | 'north_ii' | 'central' | 'south'

export const SECTION_SCOPE_NAMES: Record<SectionScope, string> = {
  state:    'State',
  north_i:  'North I',
  north_ii: 'North II',
  central:  'Central',
  south:    'South',
}

// DB section name → SectionScope
export const DB_SECTION_TO_SCOPE: Record<string, SectionScope> = {
  'North I':  'north_i',
  'North II': 'north_ii',
  'Central':  'central',
  'South':    'south',
}

// ── Individual streaks ────────────────────────────────────────────────────────

export type StreakRow = {
  wrestler_id:   string
  wrestler_name: string
  school_name:   string
  school_id:     number | null
  streak_len:    number
  season_high:   number
}

export type SnappedStreakRow = {
  wrestler_id:   string
  wrestler_name: string
  school_name:   string
  school_id:     number | null
  streak_was:    number    // streak length before it snapped
  result_type:   string    // e.g. 'Dec', 'MD', 'Fall' (the result that ended it)
}

export type StreaksData = {
  pin:   StreakRow[]        // top 3 active pin streaks
  tech:  StreakRow[]        // top 3 active tech streaks
  bonus: StreakRow[]        // top 3 active bonus streaks
  win:   StreakRow[]        // top 3 active win streaks
}

export type SnappedData = {
  pin:   SnappedStreakRow[]
  tech:  SnappedStreakRow[]
  bonus: SnappedStreakRow[]
}

// ── Match lists ───────────────────────────────────────────────────────────────

export type RatedMatchRow = {
  winner_id:      string | null
  winner_name:    string
  winner_school:  string
  loser_id:       string | null
  loser_name:     string
  loser_school:   string
  winner_hammer:  number
  loser_hammer:   number
  combined:       number
  result_type:    string
  weight_class:   number
  source:         'dual' | 'tournament'
}

export type UpsetByGapRow = RatedMatchRow & { gap: number }

// ── Team rankings (from ranking_published) ────────────────────────────────────

export type TeamRankEntry = {
  rank:        number
  school_id:   number
  school_name: string
  score:       number
  meet_result: string | null   // e.g. 'W 42–6 vs Hackettstown', null if no meet today
}

// ── Team upsets ───────────────────────────────────────────────────────────────

export type TeamUpsetRow = {
  winner_school_id:   number
  winner_school_name: string
  winner_rank:        number | null
  loser_school_id:    number
  loser_school_name:  string
  loser_rank:         number | null
  score:              string   // e.g. '34–21'
  rank_gap:           number | null
}

// ── Final bout victories ──────────────────────────────────────────────────────

export type FinalBoutRow = {
  dual_meet_id:      string
  winning_school:    string
  losing_school:     string
  score:             string    // e.g. '27–24'
  last_weight_class: number
  last_winner_name:  string
  last_result_type:  string
}

// ── Speed records ─────────────────────────────────────────────────────────────

export type SpeedRecord = {
  wrestler_id:   string | null
  wrestler_name: string
  school_name:   string
  opponent_name: string
  fall_time_sec: number
  weight_class:  number
  source:        'dual' | 'tournament'
  season_high:   boolean
}

// ── Team stoppage stats ───────────────────────────────────────────────────────

export type TeamStoppageRow = {
  school_id:    number
  school_name:  string
  count:        number
  avg_time_sec: number | null
}

export type TeamBonusPctRow = {
  school_id:       number
  school_name:     string
  bonus_pct:       number    // 0–1
  bonus_wins:      number
  total_bouts:     number
  pins:            number
  techs:           number
}

export type TeamScoreRow = {
  school_id:   number | null
  school_name: string
  score:       number
  opponent:    string
  meet_score:  string        // e.g. '51–6'
}

export type TeamMarginRow = {
  winner_school:  string
  loser_school:   string
  margin:         number
  score:          string
  season_high:    boolean
}

// ── First career wins ─────────────────────────────────────────────────────────

export type FirstWinRow = {
  wrestler_id:       string
  wrestler_name:     string
  school_name:       string
  school_id:         number | null
  weight_class:      number
  opponent_name:     string
  opponent_hammer:   number
  result_type:       string
  truly_first_match: boolean    // true = 0 wins AND 0 losses before today
}

// ── Dual meet mat time ────────────────────────────────────────────────────────

export type DualMatTimeRow = {
  dual_meet_id:      string
  school1:           string
  school2:           string
  total_seconds:     number
  allotted_seconds:  number    // always 5040 (84 min)
  bout_count:        number
  season_high:       boolean   // true = fastest on record this season
}

// ── Tournament tab ────────────────────────────────────────────────────────────

export type TournamentChampRow = {
  tournament_id:   string
  tournament_name: string
  weight_class:    number
  wrestler_id:     string | null
  wrestler_name:   string
  school_name:     string
  combined_opp_hammer: number
}

export type LowestSeedWinRow = {
  tournament_id:   string
  tournament_name: string
  weight_class:    number
  wrestler_id:     string | null
  wrestler_name:   string
  school_name:     string
  seed:            number
}

export type TournamentMatTimeRow = {
  tournament_id:    string
  tournament_name:  string
  total_seconds:    number
  bout_count:       number
  avg_seconds:      number
}

export type TournamentBiggestUpset = {
  tournament_id:   string
  tournament_name: string
  weight_class:    number
  winner_name:     string
  winner_school:   string
  loser_name:      string
  loser_school:    string
  gap:             number
  winner_hammer:   number
  loser_hammer:    number
  result_type:     string
}

export type TournamentsData = {
  top_champs:       TournamentChampRow[]
  lowest_seed_wins: LowestSeedWinRow[]
  mat_times:        TournamentMatTimeRow[]
  biggest_upset:    TournamentBiggestUpset | null
}

// ── Per-section data ──────────────────────────────────────────────────────────

export type SectionData = {
  streaks:             StreaksData
  snapped:             SnappedData
  top_rated_matches:   RatedMatchRow[]      // top 10
  top_rated_upsets:    RatedMatchRow[]      // top 10
  top_upsets_by_gap:   UpsetByGapRow[]      // top 10
  top25_teams:         TeamRankEntry[]
  team_upsets:         TeamUpsetRow[]
  final_bout_wins:     FinalBoutRow[]
  fastest_pin:         SpeedRecord[]
  fastest_tech:        SpeedRecord[]
  team_pins:           TeamStoppageRow[]    // top 3
  team_techs:          TeamStoppageRow[]    // top 3
  team_combined_stops: TeamStoppageRow[]    // top 3 (pins + techs)
  team_bonus_pct:      TeamBonusPctRow[]    // top 3
  most_points_single:  TeamScoreRow | null
  most_points_combined:TeamScoreRow | null
  largest_margin:      TeamMarginRow | null
  first_career_wins:   FirstWinRow[]        // won today, 0 prior wins
  first_career_matches:FirstWinRow[]        // won today, 0 prior wins AND 0 prior losses
  fastest_duals:       DualMatTimeRow[]     // top 3
}

// ── Full snapshot payload ─────────────────────────────────────────────────────

export type SnapshotPayload = {
  date:       string
  season:     string
  state:      SectionData
  north_i:    SectionData
  north_ii:   SectionData
  central:    SectionData
  south:      SectionData
  tournaments: TournamentsData
}

// ── Season highs (flat record, stat_key → value) ──────────────────────────────

export type SeasonHighs = Record<string, { value: number; context: Record<string, unknown>; set_on: string }>

// ── Team season highs (per-school best single-match performance) ───────────────

export type TeamSeasonHighRow = {
  school_id:    number
  school_name:  string
  best_value:   number           // count for stoppages; 0–1 fraction for bonus_pct
  avg_time_sec: number | null    // average stoppage time; null for bonus_pct
  bonus_wins:   number | null    // display context for bonus_pct / combined rows
  total_bouts:  number | null
  pins:         number | null
  techs:        number | null
  best_on:      string           // 'YYYY-MM-DD'
}

export type TeamSeasonHighs = {
  pins:      TeamSeasonHighRow[]
  techs:     TeamSeasonHighRow[]
  combined:  TeamSeasonHighRow[]
  bonus_pct: TeamSeasonHighRow[]
}

export type SeasonHighsBundle = {
  team:   TeamSeasonHighs
  scalar: SeasonHighs
}
