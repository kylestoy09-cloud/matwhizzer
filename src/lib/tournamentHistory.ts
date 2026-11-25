// A postseason tournament's history across the years on file (Kyle 2026-11-14): one district, region or the state
// tournament, every season it was held — team champions and scores, placers by weight, and the quickest pins and techs.
// Districts realign every year, so "District 18" is the number, never the same schools. Weight classes changed over
// the years: each year's class is set against the nearest of today's (mapWeights) and the pages mark where it differs
// (History tab and weight pages only). Service role, cached an hour; the caller keeps to the seasons its viewer may see.
import { unstable_cache } from 'next/cache'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { getSchoolSeasonNames } from '@/lib/schoolSeasonNames'
import { regionLabels } from '@/lib/postseasonSeason'
import { schoolMatcher, historyFinishSchools, historySchoolLabel } from '@/lib/historySchools'
import { sameLastName } from '@/lib/trophyRows'

export type HistLevel = 'district' | 'region' | 'state'
// old: a year before our brackets, from NJ Wrestling History (boys state 1934 on, regions 1961 on); its school may be one
// that closed (school_id null, the name as NJ Wrestling History spells it); weightLabel "Hwt" for the old heavyweight
export type HistPlacer = { season: number; weight: number; place: number; wrestler_id: string | null; name: string; school_id: number | null; school: string; old?: boolean; weightLabel?: string; seed?: number | null }
export type HistTeam = { season: number; school_id: number | null; school: string; points: number; calculated: boolean }
export type HistBout = { season: number; weight: number; tech: boolean; secs: number; wrestler_id: string | null; name: string; school_id: number | null; school: string; round: string | null }
export type HistYear = { season: number; label: string; event: string; old?: boolean }
export type TournamentHistoryData = { years: HistYear[]; placers: HistPlacer[]; teams: HistTeam[]; bouts: HistBout[]; oldWeights: Record<number, number[]> }

const tourName = (g: 'M' | 'F', level: HistLevel, num: number | null) =>
  `${g === 'M' ? 'Boy_s' : 'Girl_s'} ${level === 'state' ? 'States' : level === 'district' ? `Districts District ${num}` : `Regions r${num}`}`

type Who = { school_id: number | null; wrestler_id: string | null; wrestler: { first_name: string; last_name: string } | null } | null

// Girls regions are followed by name, not number: the numbers moved (2025-26 made Central 1), and the 2018-19 to
// 2021-22 North region carries on as North I (Kyle 2026-11-16: "1 and 4 have the entire history and 2 and 3 start the
// new split history")
const regionKey = (name: string | null | undefined) => {
  const n = (name ?? '').replace(/^Girls Region /, '').replace(/^Region /, '').trim()
  return n === 'North' ? 'North I' : n
}

const load = unstable_cache(async (g: 'M' | 'F', level: HistLevel, num: number | null, regionName: string | null = null): Promise<TournamentHistoryData> => {
  const db = createSupabaseAdmin()
  const all = async <T,>(q: (f: number, t: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>) => {
    const out: T[] = []
    for (let f = 0; ; f += 1000) {
      const { data, error } = await q(f, f + 999)
      if (error) throw new Error(error.message)
      out.push(...((data ?? []) as T[]))
      if (((data ?? []) as T[]).length < 1000) return out
    }
  }
  let tours: { id: number; season_id: number; name: string }[]
  if (regionName) {
    const { data, error } = await db.from('tournaments').select('id, season_id, name, region_id').eq('gender', g).like('name', `${tourName(g, 'region', 0).slice(0, -1)}%`)
    if (error) throw new Error(error.message)
    const { data: regs, error: e2 } = await db.from('regions').select('id, name')
    if (e2) throw new Error(e2.message)
    const rn = new Map((regs ?? []).map(r => [r.id as number, r.name as string]))
    const want = regionKey(regionName)
    tours = (data ?? []).filter(t => regionKey(rn.get(t.region_id)) === want)
  } else {
    const { data, error } = await db.from('tournaments').select('id, season_id, name').eq('gender', g).eq('name', tourName(g, level, num))
    if (error) throw new Error(error.message)
    tours = data ?? []
  }
  const seasonOf = new Map(tours.map(t => [t.id, t.season_id]))
  const numOf = new Map(tours.map(t => [t.season_id, Number(/r(\d+)$/.exec(t.name)?.[1]) || num]))   // the region's number that year
  const tids = [...seasonOf.keys()]

  const [pl, ts, bt, wcs, schools] = !tids.length ? [[], [], [], [], []] : await Promise.all([
    all<{ tournament_id: number; place: number; weight_class_id: number; entry: Who & { seed?: number | null } }>((f, t) => db.from('placements')
      .select('tournament_id, place, weight_class_id, entry:entry_id(school_id, wrestler_id, seed, wrestler:wrestlers(first_name, last_name))').in('tournament_id', tids).order('id').range(f, t)),
    all<{ tournament_id: number; school_id: number | null; total_points: number; source: string | null }>((f, t) => db.from('precomputed_team_scores')
      .select('tournament_id, school_id, total_points, source').in('tournament_id', tids).order('id').range(f, t)),
    all<{ tournament_id: number; weight_class_id: number; win_type: string; fall_time_seconds: number | null; round: string | null; w: Who }>((f, t) => db.from('matches')
      .select('tournament_id, weight_class_id, win_type, fall_time_seconds, round, w:winner_entry_id(school_id, wrestler_id, wrestler:wrestlers(first_name, last_name))')
      .in('tournament_id', tids).eq('validated', true).in('win_type', ['FALL', 'TF', 'TF-1.5']).order('id').range(f, t)),
    all<{ id: number; weight: number }>((f, t) => db.from('weight_classes').select('id, weight').order('id').range(f, t)),
    all<{ id: number; display_name: string }>((f, t) => db.from('schools').select('id, display_name').order('id').range(f, t)),
  ])
  const weightOf = new Map(wcs.map(w => [w.id, w.weight]))
  const base = new Map(schools.map(s => [s.id, s.display_name]))
  // each school by its name that season (co-ops, renamed schools)
  const seasons = [...new Set(seasonOf.values())]
  const seasonNames = new Map(await Promise.all(seasons.map(async s => [s, await getSchoolSeasonNames(db as never, s, g)] as const)))
  const schoolName = (season: number, id: number | null) => id == null ? 'TBD' : seasonNames.get(season)?.get(id) ?? base.get(id) ?? 'TBD'
  const who = (season: number, e: Who) => ({ wrestler_id: e?.wrestler_id ?? null, name: e?.wrestler ? `${e.wrestler.first_name} ${e.wrestler.last_name}` : 'TBD', school_id: e?.school_id ?? null, school: schoolName(season, e?.school_id ?? null) })

  const years: HistYear[] = []
  for (const s of seasons.sort((a, b) => a - b)) {
    const event = level === 'region' ? (await regionLabels(g, s)).label(numOf.get(s)!) : level === 'state' ? 'State' : `District ${num}`
    years.push({ season: s, label: `${s - 1}-${String(s).slice(-2)}`, event })
  }
  const placers: HistPlacer[] = pl.map(p => { const s = seasonOf.get(p.tournament_id)!; return { season: s, weight: weightOf.get(p.weight_class_id) ?? 0, place: p.place, seed: p.entry?.seed ?? null, ...who(s, p.entry) } })
  const teams: HistTeam[] = ts.map(t => { const s = seasonOf.get(t.tournament_id)!; return { season: s, school_id: t.school_id, school: schoolName(s, t.school_id), points: Number(t.total_points), calculated: t.source === 'calculated' } })
  // the ten quickest pins and techs of each year (a tech of 0:15 or under isn't honored; untimed bouts carry 6:00)
  const bouts: HistBout[] = []
  for (const s of seasons) for (const tech of [false, true]) {
    bouts.push(...bt.filter(m => seasonOf.get(m.tournament_id) === s && (m.win_type !== 'FALL') === tech && m.fall_time_seconds != null && (!tech || m.fall_time_seconds > 15))
      .sort((a, b) => a.fall_time_seconds! - b.fall_time_seconds!).slice(0, 10)
      .map(m => ({ season: s, weight: weightOf.get(m.weight_class_id) ?? 0, tech, secs: m.fall_time_seconds!, round: m.round, ...who(s, m.w) })))
  }

  // the years before our brackets (Kyle 2026-11-16: "fill that table through all time"): boys state and region
  // finishes from NJ Wrestling History, each school matched to ours as on the Trophy Case
  const oldWeights: Record<number, number[]> = {}
  if (g === 'M' && level !== 'district') {
    // wrestler_id (2026-11-17): the profile a finish belongs to, so multi-time champions count by person across the
    // history and our brackets (Ashnault 2010–13 = 4); '*' so it works before docs/migrations/20261117_history_profiles.sql
    const fin: { level: string; year: number; region: number | null; weight: string; place: number; name: string; school: string | null; wrestler_id?: string | null }[] = []
    for (let f = 0; ; f += 1000) {
      const { data, error } = await db.from('history_finishes').select('*').eq('gender', 'M').order('id').range(f, f + 999)
      if (error) throw new Error(error.message)
      fin.push(...(data ?? []))
      if ((data ?? []).length < 1000) break
    }
    const ids = historyFinishSchools(fin, await schoolMatcher(db), sameLastName)
    const { data: first } = await db.from('tournaments').select('season_id').eq('gender', g).order('season_id').limit(1)
    const before = first?.[0]?.season_id ?? 9999
    const wt = (w: string) => /^h/i.test(w) ? 285 : Number(w)
    fin.forEach((f, i) => {
      if (f.level !== level || f.year >= before || (level === 'region' && f.region !== num) || !f.name) return
      const id = ids[i]
      placers.push({ season: f.year, weight: wt(f.weight), place: f.place, wrestler_id: f.wrestler_id ?? null, name: f.name, school_id: id, school: id != null ? historySchoolLabel(f.school, base.get(id) ?? null) ?? f.school ?? '' : f.school ?? '', old: true, ...(/^h/i.test(f.weight) ? { weightLabel: 'Hwt' } : {}) })
      oldWeights[f.year] = [...new Set([...(oldWeights[f.year] ?? []), wt(f.weight)])].sort((a, b) => a - b)
    })
    for (const y of Object.keys(oldWeights).map(Number).sort((a, b) => a - b))
      years.push({ season: y, label: `${y - 1}-${String(y).slice(-2)}`, event: level === 'state' ? 'State' : `Region ${num}`, old: true })
    years.sort((a, b) => a.season - b.season)
  }
  return { years, placers, teams, bouts, oldWeights }
}, ['tournament-history-v8'], { revalidate: 3600 })

/** The tournament's history in the seasons given (the viewer's postseason seasons); a girls region by its name */
export async function tournamentHistory(g: 'M' | 'F', level: HistLevel, num: number | null, visible: number[], regionName: string | null = null): Promise<TournamentHistoryData> {
  const d = await load(g, level, num, regionName)
  const ok = new Set([...visible, ...Object.keys(d.oldWeights).map(Number)])   // the years before our brackets show to everyone
  return { years: d.years.filter(y => ok.has(y.season)), placers: d.placers.filter(p => ok.has(p.season)), teams: d.teams.filter(t => ok.has(t.season)), bouts: d.bouts.filter(b => ok.has(b.season)), oldWeights: d.oldWeights }
}

/** Each of a year's weight classes set against today's: one for one when the count is the same, else the nearest (a tie
 *  goes up) */
export function mapWeights(year: number[], current: readonly number[]): Map<number, number> {
  const ys = [...new Set(year)].sort((a, b) => a - b), cs = [...current].sort((a, b) => a - b)
  if (ys.length === cs.length) return new Map(ys.map((w, i) => [w, cs[i]]))
  return new Map(ys.map(w => [w, cs.reduce((best, c) => Math.abs(c - w) < Math.abs(best - w) || (Math.abs(c - w) === Math.abs(best - w) && c > best) ? c : best, cs[0])]))
}
