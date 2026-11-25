// The high school a hub prospect's linked wrestler was last seen at (their newest name alias), for the
// hub leaderboard and tournament lists. Admin only (service role).
import type { SupabaseClient } from '@supabase/supabase-js'
import { latestTransfers } from '@/lib/transfers'

/** Each linked wrestler's current school, by display name. Kyle 2026-11-13 (Tristan Rosemeyer showed Williamstown, his
 *  freshman school, not Lower Cape May): the school is never just the newest name link, since links get added for
 *  earlier schools in reviews. In order: a logged transfer (src/lib/transfers.ts) for that season or later; the school on their newest roster import row (the season's roster); else,
 *  for anyone linked at more than one school, the school of their most recent dual or in-season tournament bout;
 *  else their one linked school (the newest link only as a last resort). */
export async function schoolsOfWrestlers(db: SupabaseClient, wrestlerIds: string[]): Promise<Map<string, string>> {
  const pick = await schoolIdsOfWrestlers(db, wrestlerIds)
  const ids = [...new Set(pick.values())]
  const name = new Map<number, string>()
  for (let i = 0; i < ids.length; i += 300) {
    const { data, error } = await db.from('schools').select('id, display_name').in('id', ids.slice(i, i + 300))
    if (error) throw new Error(error.message)
    for (const s of data ?? []) name.set(s.id, s.display_name)
  }
  return new Map([...pick].flatMap(([w, id]) => (name.has(id) ? [[w, name.get(id)!] as [string, string]] : [])))
}

/** The same, as school ids (a logged transfer first) */
export async function schoolIdsOfWrestlers(db: SupabaseClient, wrestlerIds: string[]): Promise<Map<string, number>> {
  const chunks = (xs: string[]) => Array.from({ length: Math.ceil(xs.length / 300) }, (_, i) => xs.slice(i * 300, i * 300 + 300))
  const pick = new Map<string, number>()
  // 1. the newest roster import row with a school
  const roster = new Map<string, { school_id: number; season: number }>()
  for (const ids of chunks(wrestlerIds)) {
    const { data, error } = await db.from('roster_grade_import').select('wrestler_id, school_id, season_id').in('wrestler_id', ids).not('school_id', 'is', null)
    if (error) throw new Error(error.message)
    for (const r of data ?? []) {
      const cur = roster.get(r.wrestler_id)
      if (!cur || r.season_id > cur.season) roster.set(r.wrestler_id, { school_id: r.school_id, season: r.season_id })
    }
  }
  for (const [w, r] of roster) pick.set(w, r.school_id)
  // 0. a logged transfer (src/lib/transfers.ts) wins over a roster row from the same season or earlier
  for (const [w, t] of await latestTransfers(db, wrestlerIds)) {
    const r = roster.get(w)
    if (!r || t.season_id >= r.season) pick.set(w, t.school_id)
  }
  // 2. name links: one school = that school; several = the school of the latest bout
  const links = new Map<string, { schools: Set<number>; newest: { school_id: number; at: string } }>()
  for (const ids of chunks(wrestlerIds.filter(w => !pick.has(w)))) {
    const { data, error } = await db.from('wrestler_name_aliases').select('wrestler_id, school_id, created_at').in('wrestler_id', ids)
    if (error) throw new Error(error.message)
    for (const r of data ?? []) {
      if (!r.school_id) continue
      const cur = links.get(r.wrestler_id) ?? links.set(r.wrestler_id, { schools: new Set(), newest: { school_id: r.school_id, at: r.created_at } }).get(r.wrestler_id)!
      cur.schools.add(r.school_id)
      if (r.created_at > cur.newest.at) cur.newest = { school_id: r.school_id, at: r.created_at }
    }
  }
  const several = [...links].filter(([, l]) => l.schools.size > 1).map(([w]) => w)
  const latest = new Map<string, { school_id: number; date: string }>()
  const seen = (w: string | null, school: number | null, date: string | null | undefined) => {
    if (!w || school == null || !date || !links.has(w)) return
    const cur = latest.get(w)
    if (!cur || date > cur.date) latest.set(w, { school_id: school, date })
  }
  // 80 at a time: both id lists go in the request address
  for (let i = 0; i < several.length; i += 80) {
    const list = several.slice(i, i + 80).join(',')
    for (const [bouts, meets] of [['dual_meet_matches', 'dual_meets'], ['dual_meet_matches_girls', 'dual_meets_girls']]) {
      const { data, error } = await db.from(bouts).select(`wrestler_a_id, wrestler_b_id, school_a_id, school_b_id, meet:${meets}!dual_meet_id(meet_date)`).or(`wrestler_a_id.in.(${list}),wrestler_b_id.in.(${list})`)
      if (error) throw new Error(error.message)
      for (const b of (data ?? []) as unknown as { wrestler_a_id: string | null; wrestler_b_id: string | null; school_a_id: number | null; school_b_id: number | null; meet: { meet_date: string | null } | null }[]) {
        seen(b.wrestler_a_id, b.school_a_id, b.meet?.meet_date); seen(b.wrestler_b_id, b.school_b_id, b.meet?.meet_date)
      }
    }
    for (const [bouts, events] of [['tournament_bouts', 'in_season_tournaments'], ['tournament_bouts_girls', 'in_season_tournaments_girls']]) {
      const { data, error } = await db.from(bouts).select(`wrestler1_id, wrestler2_id, wrestler1_school_id, wrestler2_school_id, event:${events}!in_season_tournament_id(start_date)`).or(`wrestler1_id.in.(${list}),wrestler2_id.in.(${list})`)
      if (error) throw new Error(error.message)
      for (const b of (data ?? []) as unknown as { wrestler1_id: string | null; wrestler2_id: string | null; wrestler1_school_id: number | null; wrestler2_school_id: number | null; event: { start_date: string | null } | null }[]) {
        seen(b.wrestler1_id, b.wrestler1_school_id, b.event?.start_date); seen(b.wrestler2_id, b.wrestler2_school_id, b.event?.start_date)
      }
    }
  }
  for (const [w, l] of links) pick.set(w, l.schools.size === 1 ? [...l.schools][0] : latest.get(w)?.school_id ?? l.newest.school_id)
  return pick
}

/** Each linked wrestler's current Whizzer Resume Rating: the 2026-27 (preseason) row when there is one, else the
 *  season before. Keyed by wrestler id. */
export async function ratingsOfWrestlers(db: SupabaseClient, wrestlerIds: string[], seasons: string[]): Promise<Map<string, { score: number; season: string; weight: string | null }>> {
  const out = new Map<string, { score: number; season: string; weight: string | null }>()
  for (let i = 0; i < wrestlerIds.length; i += 300) {
    const { data, error } = await db.from('wrestler_hammer_scores').select('wrestler_id, season, hammer_score, weight_class').in('wrestler_id', wrestlerIds.slice(i, i + 300)).in('season', seasons)
    if (error) throw new Error(error.message)
    for (const r of data ?? []) {
      const cur = out.get(r.wrestler_id)
      if (!cur || seasons.indexOf(r.season) < seasons.indexOf(cur.season)) out.set(r.wrestler_id, { score: Number(r.hammer_score), season: r.season, weight: r.weight_class ?? null })
    }
  }
  return out
}

/** The rating seasons to read, newest first: the school year today falls in (from July) and the one before. */
export function ratingSeasons(today = new Date()): string[] {
  const y = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1
  return [`${y}-${String(y + 1).slice(2)}`, `${y - 1}-${String(y).slice(2)}`]
}
