export interface Tournament {
  id: number
  name: string
  tournament_type: string
  gender: string
  season_id: number
}

export interface WeightClass {
  id: number
  weight: number
  gender: string
}

export interface EntryRecord {
  id: string
  seed: number | null
  wrestlerFirst: string
  wrestlerLast: string
  schoolName: string | null
}

export interface MatchRecord {
  id: string
  tournament_id: number
  weight_class_id: number
  round: string
  bracket_side: string | null
  winner_entry_id: string | null
  loser_entry_id: string | null
  win_type: string | null
  winner_score: number | null
  loser_score: number | null
  fall_time_seconds: number | null
  score_raw: string | null
  bout_number: number | null
  validated: boolean | null
}

export type MatchStatus = 'complete' | 'partial' | 'broken' | 'empty'

export interface BracketSlot {
  round: string
  position: number
  match: MatchRecord | null
  status: MatchStatus
}
