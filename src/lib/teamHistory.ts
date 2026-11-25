// Team Post Season History (Kyle 2026-11-16): the team champions by year. Boys: each group's state champion and its
// sectional champions — from our team brackets (playoff_seeds + playoff dual_meets) for every season we have them, and
// from NJ Wrestling History (history_team_titles, 1980 on) only for the years before ("njwrestlinghistory only fills in
// gaps for years we don't have bracket info"), each of their schools matched to one of ours as on the Trophy Case. Girls: the State, North and South champions from our girls team brackets (src/lib/girlsTeamBracket.ts).
import { unstable_cache } from 'next/cache'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { schoolMatcher } from '@/lib/historySchools'
import { getGirlsTeamBracket, GIRLS_TEAM_SEASONS } from '@/lib/girlsTeamBracket'
import { getSchoolSeasonNames } from '@/lib/schoolSeasonNames'

// one champion: a row of the table (row: 'State' or the section) in a year (season end year)
export type TeamChamp = { year: number; row: string; school_id: number | null; school: string; njwh?: boolean }   // njwh: from NJ Wrestling History
// a group's tab: its rows top to bottom and every champion
export type TeamHistoryGroup = { key: string; label: string; rows: string[]; champs: TeamChamp[] }

// NJ Wrestling History's section names, as the site writes them
const SECTION: Record<string, string> = { 'North 1': 'North I', 'North 2': 'North II', Central: 'Central', South: 'South', North: 'North' }
const GROUPS: [string, string, string][] = [   // tab key, tab label, NJ Wrestling History's group
  ['1', 'Group 1', 'Group 1'], ['2', 'Group 2', 'Group 2'], ['3', 'Group 3', 'Group 3'], ['4', 'Group 4', 'Group 4'], ['5', 'Group 5', 'Group 5'],
  ['npa', 'Non-Public A', 'Non-Public A'], ['npb', 'Non-Public B', 'Non-Public B'],
]

// one title from our brackets, written the way history_team_titles writes it (grp "Group 2" / "Non-Public A", section "North 1")
export type OurTeamTitle = { year: number; kind: 'group' | 'sectional'; grp: string; section: string | null; school_id: number }
const NJWH_SECTION: Record<string, string> = { 'North I': 'North 1', 'North II': 'North 2', Central: 'Central', South: 'South' }

/** Boys team champions from our own brackets: a sectional's champion is unbeaten in the meets between its seeds, a
 *  group's state champion unbeaten in the meets between two of its sections (Non-Public: between its seeds) */
export const boysTeamChampions = unstable_cache(async (): Promise<OurTeamTitle[]> => {
  const db = createSupabaseAdmin()
  const seeds: { season_id: number; section: string; classification: string; school_id: number | null }[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('playoff_seeds').select('season_id, section, classification, school_id').eq('gender', 'M').eq('confirmed', true).order('id').range(from, from + 999)
    if (error) throw new Error(error.message)
    seeds.push(...(data ?? []))
    if ((data ?? []).length < 1000) break
  }
  const out: OurTeamTitle[] = []
  for (const season of [...new Set(seeds.map(x => x.season_id))]) {
    const { data, error } = await db.from('dual_meets').select('meet_date, team1_school_id, team2_school_id, team1_score, team2_score, criteria_winner_school_id')
      .eq('season_id', season).eq('gender', 'M').eq('is_playoff', true)
    if (error) throw new Error(error.message)
    const meets = (data ?? []) as { meet_date: string; team1_school_id: number; team2_school_id: number; team1_score: number | null; team2_score: number | null; criteria_winner_school_id: number | null }[]
    const winner = (m: typeof meets[number]) => m.team1_score != null && m.team2_score != null && m.team1_score !== m.team2_score
      ? (m.team1_score > m.team2_score ? m.team1_school_id : m.team2_school_id) : m.criteria_winner_school_id
    // the champion of the meets the test allows: the one team that won and never lost among them (the most wins if more
    // than one; a later playoff-flagged meet outside the bracket can't take the title from it)
    const last = (ok: (a: number, b: number) => boolean) => {
      const won = new Map<number, number>(), lost = new Set<number>()
      for (const m of meets.filter(x => ok(x.team1_school_id, x.team2_school_id))) {
        const w = winner(m)
        if (w == null) continue
        won.set(w, (won.get(w) ?? 0) + 1)
        lost.add(w === m.team1_school_id ? m.team2_school_id : m.team1_school_id)
      }
      const best = [...won].filter(([id]) => !lost.has(id)).sort((a, b) => b[1] - a[1])
      return best.length && (best.length === 1 || best[0][1] > best[1][1]) ? best[0][0] : null
    }
    const mine = seeds.filter(x => x.season_id === season && x.school_id != null)
    for (const cls of [...new Set(mine.map(x => x.classification))]) {
      const sectionOf = new Map(mine.filter(x => x.classification === cls).map(x => [x.school_id!, x.section]))
      const np = [...sectionOf.values()].every(sec => sec === 'Non-Public')
      const grp = np ? `Non-Public ${cls}` : `Group ${cls}`
      const state = np ? last((a, b) => sectionOf.has(a) && sectionOf.has(b))
        : last((a, b) => sectionOf.has(a) && sectionOf.has(b) && sectionOf.get(a) !== sectionOf.get(b))
      if (state != null) out.push({ year: season, kind: 'group', grp, section: null, school_id: state })
      if (np) continue
      for (const sec of [...new Set(sectionOf.values())]) {
        const champ = last((a, b) => sectionOf.get(a) === sec && sectionOf.get(b) === sec)
        if (champ != null) out.push({ year: season, kind: 'sectional', grp, section: NJWH_SECTION[sec] ?? sec, school_id: champ })
      }
    }
  }
  return out
}, ['boys-team-champions-v2'], { revalidate: 3600 })

export const boysTeamHistory = unstable_cache(async (): Promise<TeamHistoryGroup[]> => {
  const db = createSupabaseAdmin()
  const titles: { kind: string; year: number; grp: string; section: string | null; champion: string }[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('history_team_titles').select('kind, year, grp, section, champion').order('id').range(from, from + 999)
    if (error) throw new Error(error.message)
    titles.push(...(data ?? []))
    if ((data ?? []).length < 1000) break
  }
  const m = await schoolMatcher(db)
  const ours = await boysTeamChampions()
  const ourYears = new Set(ours.map(o => o.year))
  const names = new Map(await Promise.all([...ourYears].map(async y => [y, await getSchoolSeasonNames(db as never, y, 'M')] as const)))
  return GROUPS.map(([key, label, grp]) => {
    const mine = titles.filter(t => t.grp === grp && t.champion && !ourYears.has(t.year))   // NJ Wrestling History only before our brackets
    const sections = [...new Set(mine.filter(t => t.kind === 'sectional' && t.section).map(t => SECTION[t.section!] ?? t.section!))]
      .sort((a, b) => Object.values(SECTION).indexOf(a) - Object.values(SECTION).indexOf(b))
    const champs = mine.map(t => {
      const id = m.idOf(t.champion)
      return { year: t.year, row: t.kind === 'group' ? 'State' : SECTION[t.section ?? ''] ?? t.section ?? '', school_id: id, school: id != null ? m.school.get(id)?.display_name ?? t.champion : t.champion, njwh: true }
    })
    for (const o of ours.filter(o => o.grp === grp)) {
      const row = o.kind === 'group' ? 'State' : SECTION[o.section ?? ''] ?? o.section ?? ''
      if (o.kind === 'sectional' && !sections.includes(row)) sections.push(row)
      champs.push({ year: o.year, row, school_id: o.school_id, school: names.get(o.year)?.get(o.school_id) ?? m.school.get(o.school_id)?.display_name ?? 'TBD', njwh: false })
    }
    return { key, label, rows: ['State', ...sections], champs }
  })
}, ['boys-team-history-v4'], { revalidate: 3600 })

export async function girlsTeamHistory(): Promise<TeamHistoryGroup> {
  const db = createSupabaseAdmin()
  const champs: TeamChamp[] = []
  for (const year of GIRLS_TEAM_SEASONS) {
    const b = await getGirlsTeamBracket(year)
    if (!b) continue
    const names = await getSchoolSeasonNames(db as never, year, 'F')
    const ids = [b.champion, ...b.regions.map(r => r.champion)].filter((x): x is number => x != null)
    const { data } = ids.length ? await db.from('schools').select('id, display_name').in('id', ids) : { data: [] }
    const base = new Map((data ?? []).map(s => [s.id as number, s.display_name as string]))
    const add = (row: string, id: number | null) => { if (id != null) champs.push({ year, row, school_id: id, school: names.get(id) ?? base.get(id) ?? 'TBD' }) }
    add('State', b.champion)
    for (const r of b.regions) add(r.title, r.champion)
  }
  return { key: 'girls', label: 'Girls', rows: ['State', 'North', 'South'], champs }
}
