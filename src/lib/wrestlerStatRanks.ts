// A wrestler's place on the regular-season leaderboards (Kyle 2026-11-16), for the stats board on the profile: the
// state rank when it's in the top 25, else the rank in the school's section when that's in the top 25. Read from
// lb_rs_wrestler, the table the Leaders page shows, ordered the way it orders (a tie on pins or techs goes to the faster
// average; bonus % needs the leaderboard's minimum matches). Every wrestler's ranks are worked out once, cached an hour.
import { unstable_cache } from 'next/cache'
import { supabase } from '@/lib/supabase/public-cached'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { MIN_RS_MATCHES } from '@/lib/leaderboards/config'

export type StatKey = 'pins' | 'techs' | 'bonus' | 'wrr'
export type StatRank = { rank: number; where: string }   // where: "State" or the section's name
export const TOP = 25

type Row = { wrestler_id: string; pins: number; pin_avg: number | null; techs: number; tf_avg: number | null
  bonus_pct: number | null; bonus_wins: number; matches: number; wrr: number | null; school: { section: string | null } | null }

// how each list is ordered: who's in it, and whether a is ahead of b
const LISTS: Record<StatKey, { in: (r: Row) => boolean; ahead: (a: Row, b: Row) => boolean }> = {
  pins:  { in: r => r.pins > 0, ahead: (a, b) => a.pins > b.pins || (a.pins === b.pins && (a.pin_avg ?? Infinity) < (b.pin_avg ?? Infinity)) },
  techs: { in: r => r.techs > 0, ahead: (a, b) => a.techs > b.techs || (a.techs === b.techs && (a.tf_avg ?? Infinity) < (b.tf_avg ?? Infinity)) },
  bonus: { in: r => r.matches >= MIN_RS_MATCHES && r.bonus_pct != null, ahead: (a, b) => a.bonus_pct! > b.bonus_pct! || (a.bonus_pct === b.bonus_pct && a.bonus_wins > b.bonus_wins) },
  wrr:   { in: r => (r.wrr ?? 0) > 0, ahead: (a, b) => a.wrr! > b.wrr! },
}

// a rank shared by a tie: one more than the number ahead
function ranks(rows: Row[], key: StatKey): Map<string, number> {
  const L = LISTS[key], out = new Map<string, number>()
  const list = rows.filter(L.in).sort((a, b) => L.ahead(a, b) ? -1 : L.ahead(b, a) ? 1 : 0)
  let rank = 0
  for (let i = 0; i < list.length; i++) {
    if (i === 0 || L.ahead(list[i - 1], list[i])) rank = i + 1
    if (rank > TOP) break
    out.set(list[i].wrestler_id, rank)
  }
  return out
}

const load = unstable_cache(async (g: 'M' | 'F', season: number): Promise<Record<string, Partial<Record<StatKey, StatRank>>>> => {
  const { data, error } = await fetchAllRows<Row>((f, t) => supabase.from('lb_rs_wrestler')
    .select('wrestler_id, pins, pin_avg, techs, tf_avg, bonus_pct, bonus_wins, matches, wrr, school:schools(section)')
    .eq('gender', g).eq('season_id', season).order('wrestler_id').range(f, t) as never)
  if (error) throw new Error(error.message)
  const out: Record<string, Partial<Record<StatKey, StatRank>>> = {}
  const bySection = new Map<string, Row[]>()
  for (const r of data) if (r.school?.section) bySection.set(r.school.section, [...(bySection.get(r.school.section) ?? []), r])
  for (const key of Object.keys(LISTS) as StatKey[]) {
    const state = ranks(data, key)
    for (const [id, rank] of state) (out[id] ??= {})[key] = { rank, where: 'State' }
    for (const [section, rows] of bySection) for (const [id, rank] of ranks(rows, key))
      if (!state.has(id)) (out[id] ??= {})[key] = { rank, where: section }
  }
  return out
}, ['wrestler-stat-ranks-v1'], { revalidate: 3600 })

/** The wrestler's leaderboard ranks that season (only the ones in a top 25) */
export async function wrestlerStatRanks(g: 'M' | 'F', season: number, wrestlerId: string): Promise<Partial<Record<StatKey, StatRank>>> {
  return (await load(g, season))[wrestlerId] ?? {}
}
