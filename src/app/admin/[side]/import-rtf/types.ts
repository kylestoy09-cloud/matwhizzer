import type { GradeChoice } from '@/lib/rosterGradeSuggest'

// Shared types for the RTF import pipeline.
// No 'use server' or 'use client' — safe to import from both sides.

import type { BoutForReview, InferenceConfidence } from '@/lib/parseRtf'
export type { BoutForReview, InferenceConfidence }

export type BoutReviewConfirmation = {
  key: string
  round: string
  isDuplicate: boolean
}

export type SchoolFlag = {
  raw: string
  confidence: 'exact' | 'alias' | 'high' | 'low' | 'none' | 'oos'
  school_id: number | null
  display_name: string | null
  alternates: { school_id: number; display_name: string; score: number; is_oos?: boolean }[]
  bout_count: number
  oos_event?: boolean  // out-of-state event: every school must be confirmed, even exact matches
  nj_lookalike?: boolean  // OOS school whose name resembles an NJ school — never bulk-confirmed
  bulk_ok?: boolean       // existing OOS school, distinct from every NJ name — can be bulk-confirmed
  // out-of-state event, NJ match: how many of this name's wrestlers in the event are known at the
  // NJ school (an alias there, or its Track roster). None known → probably an OOS namesake.
  nj_known?: { known: number; total: number; names: string[] }
}

export type WrestlerFlag = {
  key: string  // `${raw_name}|${school_id}|${weight_class}`
  raw_name: string
  school_raw: string
  school_id: number
  weight_class: number
  confidence: 'exact' | 'high' | 'low' | 'none'
  is_new: boolean
  is_oos?: boolean
  wrestler_id: string | null
  display_name: string | null
  alternates: { wrestler_id: string; display_name: string; score: number }[]
  prospect_candidates?: ProspectCandidate[]
}

export type WrestlerOverride =
  // grade: chosen in the review; not set = the single exact Track roster match, if any
  | { type: 'create'; first_name: string; last_name: string; grade?: GradeChoice }
  | { type: 'existing'; wrestler_id: string; display_name: string }
  | { type: 'accept' }
  | { type: 'skip' }

// A tournament hub prospect (Middle School / Offseason Hub) offered for a new high school wrestler
export type ProspectFinish = {
  id: number
  tournament_name: string
  season: string
  weight: string
  place: number
  label: string
}

export type ProspectCandidate = {
  pool: 'M' | 'F' | 'X'   // the side's own list, or the mixed Middle School pool
  prospect_id: number
  primary_name: string
  score: number
  finishes: ProspectFinish[]
}

export type ProspectLink =
  | { type: 'confirm'; pool?: 'M' | 'F' | 'X'; prospect_id: number; canonical_name: string }
  | { type: 'skip' }

export type TournamentType = 'outside' | 'inside_outside' | 'inside'

export type TournamentMatchInfo = {
  tournament_id: string
  tournament_name: string
  start_date: string | null
  confidence: 'exact' | 'high' | 'low' | 'none'
  score: number
}

export type TournamentOverride =
  | { type: 'existing'; tournament_id: string; tournament_name: string }
  | { type: 'new' }

export type TournamentSummary = {
  name: string
  date_raw: string
  start_date: string
  end_date: string | null
  source_format: 'full_bracket' | 'school_tracking'
  tournament_type: TournamentType
  bout_count: number
  placement_count: number
  team_score_count: number
  existing_id: string | null
  has_existing_bouts: boolean
  venue_name: string | null
  venue_address: string | null
  tournament_match: TournamentMatchInfo | null
  tournament_alternates: TournamentMatchInfo[]
}

export type ReviewedTournament = TournamentSummary & {
  school_flags: SchoolFlag[]
  team_score_flags: SchoolFlag[]
  wrestler_flags: WrestlerFlag[]
  bouts_for_review: BoutForReview[]
}

export type SchoolOverride =
  | { type: 'nj'; school_id: number; display_name: string }
  | { type: 'oos'; school_id?: number; display_name?: string; state?: string }  // school_id present = link to existing OOS school; a new one needs state
  | { type: 'skip' }

export type ImportResult = {
  tournament: string
  bouts_inserted: number
  placements_upserted: number
  placements_parsed?: number
  team_scores_inserted: number
  wrestlers_created: number
  skipped: boolean
  error?: string
  pl_error?: string
  ts_error?: string
  // wrestlers whose profile could not be created (e.g. no last name): their bouts were not saved
  wr_error?: string
}
