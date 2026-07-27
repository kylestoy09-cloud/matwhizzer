// Shared types for the RTF import pipeline.
// No 'use server' or 'use client' — safe to import from both sides.

export type SchoolFlag = {
  raw: string
  confidence: 'exact' | 'alias' | 'high' | 'low' | 'none'
  school_id: number | null
  display_name: string | null
  alternates: { school_id: number; display_name: string; score: number }[]
  bout_count: number
}

export type WrestlerFlag = {
  raw_name: string
  school_raw: string
  school_id: number
  weight_class: number
  confidence: 'exact' | 'high' | 'low' | 'none'
  is_new: boolean
  wrestler_id: string | null
  display_name: string | null
  alternates: { wrestler_id: string; display_name: string; score: number }[]
}

export type TournamentSummary = {
  name: string
  date_raw: string
  start_date: string
  end_date: string | null
  source_format: 'full_bracket' | 'school_tracking'
  bout_count: number
  placement_count: number
  existing_id: string | null
  has_existing_bouts: boolean
}

export type ReviewedTournament = TournamentSummary & {
  school_flags: SchoolFlag[]
  wrestler_flags: WrestlerFlag[]
}

export type SchoolOverride =
  | { type: 'nj'; school_id: number; display_name: string }
  | { type: 'oos' }

export type ImportResult = {
  tournament: string
  bouts_inserted: number
  placements_upserted: number
  wrestlers_created: number
  skipped: boolean
  error?: string
}
