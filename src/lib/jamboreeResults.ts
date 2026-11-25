// A jamboree's team results (Kyle 2026-11-11): each school's team points by standard dual scoring, summed over
// its pairings, with its pairings won-lost-tied. Most points ranks first (Kyle: total points, not per pairing).
export type JamboreePairing = { team1_school_id: number; team2_school_id: number; team1_score: number | null; team2_score: number | null }
export type JamboreeTeam = { school_id: number; pts: number; w: number; l: number; t: number }

export function jamboreeTeams(pairings: JamboreePairing[]): JamboreeTeam[] {
  const by = new Map<number, JamboreeTeam>()
  for (const p of pairings) {
    const s1 = Number(p.team1_score ?? 0), s2 = Number(p.team2_score ?? 0)
    for (const [id, mine, theirs] of [[p.team1_school_id, s1, s2], [p.team2_school_id, s2, s1]] as const) {
      const r = by.get(id) ?? { school_id: id, pts: 0, w: 0, l: 0, t: 0 }
      r.pts += mine
      if (mine > theirs) r.w++; else if (mine < theirs) r.l++; else r.t++
      by.set(id, r)
    }
  }
  return [...by.values()].sort((a, b) => b.pts - a.pts || b.w - a.w)
}

export const jamboreeRecord = (r: JamboreeTeam) => `${r.w}-${r.l}${r.t ? `-${r.t}` : ''}`
