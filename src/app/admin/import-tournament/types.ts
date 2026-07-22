export type Confidence = 'exact' | 'high' | 'low' | 'none' | 'oos'

export type SchoolResolution = {
  school_id: number | null
  display_name: string | null
  confidence: Confidence
  alternates: { school_id: number; display_name: string; score: number }[]
}

export type WrestlerResolution = {
  wrestler_id: string | null
  display_name: string | null
  confidence: Confidence
  is_new: boolean
  alternates: { wrestler_id: string; display_name: string; score: number }[]
}

export type BoutRow = {
  weight: number
  round: string
  winner_name: string
  winner_school_raw: string
  winner_key: string | null
  loser_name: string
  loser_school_raw: string
  loser_key: string | null
  result_type: string
  result_detail: string | null
  fall_time_seconds: number | null
  flagged: boolean
  flag_reasons: string[]
}

export type TournamentBlock = {
  name: string
  existing_id: string | null
  start_date: string | null
  end_date: string | null
  skipped: boolean
  bouts: BoutRow[]
}

export type PipeImportJSON = {
  schema_version: number
  source_format: 'pipe'
  generated_at: string
  csv_file: string
  summary: {
    total_bouts: number
    total_tournaments: number
    skipped_tournaments: string[]
    flagged_school_count: number
    flagged_wrestler_count: number
    new_wrestler_count: number
  }
  schools: Record<string, SchoolResolution>
  wrestlers: Record<string, WrestlerResolution>
  tournaments: TournamentBlock[]
}

export type SchoolOverride =
  | { type: 'nj'; school_id: number; display_name: string }
  | { type: 'oos' }

export type WrestlerOverride =
  | { type: 'existing'; wrestler_id: string; display_name: string }
  | { type: 'new' }
