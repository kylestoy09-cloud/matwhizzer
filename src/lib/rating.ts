// The name of MatWhizzer's wrestler rating (stored as wrestler_hammer_scores /
// hammer_score in the database — those names never appear on the site).
//
// It rates what a wrestler has accomplished — who they beat, in which
// tournaments, how they finished in the postseason, weighted toward the last 20
// matches. It is a resume, not a prediction. Every page and admin tool reads the
// name from here, so a rename is a one-line change.

export const RATING_NAME  = 'Whizzer Resume Rating'
export const RATING_SHORT = 'WRR'
export const RATING_BLURB =
  'The Whizzer Resume Rating rates what a wrestler has accomplished — who they beat, '
  + 'the tournaments they placed in and their postseason finish, weighted toward the last 20 matches. '
  + 'It rates the past, not who would win next.'
