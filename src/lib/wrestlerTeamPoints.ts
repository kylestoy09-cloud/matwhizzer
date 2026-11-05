// Per-wrestler postseason team points ("Individual Team Points" leaderboards) are hidden
// (Kyle, 2026-11-05): the site's formula can't be matched to how TrackWrestling scores wrestlers
// (e.g. 4 District 7/14 wrestlers 0.5 off with no known cause), so the numbers are bad info.
// Set to true to show them again once the scoring is understood. Pages skip loading the data
// while hidden. Team totals are unaffected: they are the copied official standings.
export const SHOW_WRESTLER_TEAM_POINTS = false
