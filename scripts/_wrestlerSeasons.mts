// The seasons a wrestler is on record in (start years: 2015 = 2015-16), for the history import's timing check
// (Kyle 2026-11-20: the name matcher only looked at the school, so a 2015 name could be offered a 2024 wrestler).
// From postseason entries (tournaments.season_id = the end year), in-season tournament bouts (the edition's season
// label) and dual meet bouts (dual_meets.season_id = the end year).
import type { SupabaseClient } from '@supabase/supabase-js'

export async function wrestlerSeasons(db: SupabaseClient, ids: string[]): Promise<Map<string, number[]>> {
  const out = new Map<string, Set<number>>()
  const add = (id: string | null, start: number | null) => { if (id && start && start > 1900) (out.get(id) ?? out.set(id, new Set()).get(id)!).add(start) }
  const uniq = [...new Set(ids)]
  for (let i = 0; i < uniq.length; i += 150) {
    const chunk = uniq.slice(i, i + 150)
    const [entries, b1, b2, d1, d2] = await Promise.all([
      db.from('tournament_entries').select('wrestler_id, t:tournaments!tournament_id(season_id)').in('wrestler_id', chunk).limit(5000),
      db.from('tournament_bouts').select('wrestler1_id, t:in_season_tournaments!in_season_tournament_id(season)').in('wrestler1_id', chunk).limit(10000),
      db.from('tournament_bouts').select('wrestler2_id, t:in_season_tournaments!in_season_tournament_id(season)').in('wrestler2_id', chunk).limit(10000),
      db.from('dual_meet_matches').select('wrestler_a_id, m:dual_meets!dual_meet_id(season_id)').in('wrestler_a_id', chunk).limit(10000),
      db.from('dual_meet_matches').select('wrestler_b_id, m:dual_meets!dual_meet_id(season_id)').in('wrestler_b_id', chunk).limit(10000),
    ])
    for (const r of (entries.data ?? []) as unknown as { wrestler_id: string; t: { season_id: number } | null }[]) add(r.wrestler_id, r.t ? r.t.season_id - 1 : null)
    for (const r of (b1.data ?? []) as unknown as { wrestler1_id: string; t: { season: string } | null }[]) add(r.wrestler1_id, r.t ? parseInt(r.t.season, 10) : null)
    for (const r of (b2.data ?? []) as unknown as { wrestler2_id: string; t: { season: string } | null }[]) add(r.wrestler2_id, r.t ? parseInt(r.t.season, 10) : null)
    for (const r of (d1.data ?? []) as unknown as { wrestler_a_id: string; m: { season_id: number } | null }[]) add(r.wrestler_a_id, r.m ? r.m.season_id - 1 : null)
    for (const r of (d2.data ?? []) as unknown as { wrestler_b_id: string; m: { season_id: number } | null }[]) add(r.wrestler_b_id, r.m ? r.m.season_id - 1 : null)
  }
  return new Map([...out].map(([id, s]) => [id, [...s].sort((a, b) => a - b)]))
}

/** "2019–2022" (season start years shown as the years they began) */
export const yearsLabel = (ys: number[] | undefined) => (!ys?.length ? '' : ys.length === 1 ? `${ys[0]}-${String((ys[0] + 1) % 100).padStart(2, '0')}` : `${ys[0]}–${ys[ys.length - 1] + 1}`)

/** Could a wrestler on record in these seasons have wrestled in season `start`? Within 4 seasons of their record;
 *  a wrestler with no seasons on record can't be ruled out */
export const fitsTiming = (ys: number[] | undefined, start: number, slack = 4) => !ys?.length || ys.some(y => Math.abs(y - start) <= slack)
