// Approved corrections to TrackWrestling's official postseason team totals (precomputed_team_scores).
// The copied standings are the truth (CLAUDE.md) except here: TrackWrestling scored "TF-1" tech falls
// with a 1-point bonus instead of 1.5, a scoring-table input error (Kyle, 2026-11-06: correct them).
// The official-totals loaders apply these after copying the standings, so a reload keeps them.
export type TeamScoreCorrection = { tournament_id: number; school_id: number; trackwrestling: number; add: number; why: string }

export const OFFICIAL_TEAM_SCORE_CORRECTIONS: TeamScoreCorrection[] = [
  { tournament_id: 146, school_id: 21,  trackwrestling: 345,  add: 0.5, why: '2025-26 D7: Anthony Riotto (Bergen Catholic) TF-1 over Chuck Willoe' },
  { tournament_id: 146, school_id: 52,  trackwrestling: 132,  add: 0.5, why: '2025-26 D7: Tommy Perrota (Fair Lawn) TF-1 over Xavian Robinson' },
  { tournament_id: 153, school_id: 322, trackwrestling: 72.5, add: 0.5, why: '2025-26 D14: Ethan Delacruz (Bound Brook) TF-1 over Matthew Vazquez' },
  { tournament_id: 153, school_id: 135, trackwrestling: 252,  add: 0.5, why: '2025-26 D14: Nicholas Romaniello (North Hunterdon) TF-1 over Oscar Casas' },
  { tournament_id: 155, school_id: 126, trackwrestling: 96,   add: 0.5, why: '2025-26 D16: Yehuda Pincus (Scotch Plains-Fanwood) TF-1 over Selah Davis' },
  { tournament_id: 129, school_id: 167, trackwrestling: 250,  add: 0.5, why: '2024-25 R5: Salvatore Borrometi (St. Peter\'s Prep) TF-1 over Joaquin Duque' },
]

// Rows about to be written: each correction's school gets its added points, when the copied total is
// still TrackWrestling's figure (a different figure means the standings changed: stop and look).
export function applyTeamScoreCorrections<T extends { tournament_id: number; school_id: number; total_points: number }>(rows: T[]): T[] {
  for (const c of OFFICIAL_TEAM_SCORE_CORRECTIONS) {
    const r = rows.find(x => x.tournament_id === c.tournament_id && x.school_id === c.school_id)
    if (!r) continue
    if (Math.abs(Number(r.total_points) - c.trackwrestling) > 0.001) throw new Error(`correction ${c.why}: TrackWrestling total is now ${r.total_points}, expected ${c.trackwrestling}`)
    r.total_points = c.trackwrestling + c.add
  }
  return rows
}
