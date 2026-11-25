// NJSIAA medals for many wrestlers at once (Kyle 2026-11-17: the college page's dropdown — "their njsiaa accolades
// followed by their ncaa matches"). Read the way the wrestler profile reads them: a postseason bracket's final / place
// bouts, a postseason podium with no bracket (history_podiums), and the finishes from before our records
// (history_finishes, tied to the profile). Seasons hidden from visitors are left out. Oldest first.
import type { SupabaseClient } from '@supabase/supabase-js'
import { getHistorySeasons } from '@/lib/seasons-server'
import { canSeeHiddenHistory } from '@/lib/get-season'

export type HsAccolade = { year: number; level: 0 | 1 | 2; label: string; place: number }

const POSTSEASON: Record<string, 0 | 1 | 2> = { districts: 0, regions: 1, girls_regions: 1, boys_state: 2, girls_state: 2 }
const PLACE_ROUND: Record<string, [number, number]> = { F: [1, 2], '3rd_Place': [3, 4], '5th_Place': [5, 6], '7th_Place': [7, 8] }
const labelOf = (name: string, level: 0 | 1 | 2) => (level === 2 ? 'State' : name.match(/(District|Region) \d+/)?.[0] ?? name)

async function pages<T>(q: (from: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let f = 0; ; f += 1000) { const { data, error } = await q(f); if (error) throw new Error(error.message); const d = (data ?? []) as T[]; out.push(...d); if (d.length < 1000) break }
  return out
}

type Tourn = { name: string; tournament_type: string; season_id: number } | null

// seeHidden: pass false for a cached public page (the admin check reads the visitor's cookies)
export async function hsAccolades(db: SupabaseClient, g: 'M' | 'F', ids: string[], seeHiddenArg?: boolean): Promise<Map<string, HsAccolade[]>> {
  const [hist, seeHidden] = await Promise.all([getHistorySeasons(g), seeHiddenArg ?? canSeeHiddenHistory()])
  const hidden = new Set(seeHidden ? [] : hist.filter(h => !h.public).map(h => h.id))
  const out = new Map<string, HsAccolade[]>()
  const add = (w: string, a: HsAccolade) => {
    if (hidden.has(a.year)) return
    const list = out.get(w) ?? out.set(w, []).get(w)!
    if (!list.some(x => x.year === a.year && x.label === a.label)) list.push(a)
  }
  for (let i = 0; i < ids.length; i += 150) {
    const chunk = ids.slice(i, i + 150)
    const [ents, pods, fins] = await Promise.all([
      pages<{ id: number; wrestler_id: string; tournament: Tourn }>(f => db.from('tournament_entries').select('id, wrestler_id, tournament:tournaments(name, tournament_type, season_id)').in('wrestler_id', chunk).order('id').range(f, f + 999)),
      pages<{ wrestler_id: string; place: number; tournament: Tourn }>(f => db.from('history_podiums').select('wrestler_id, place, tournament:tournaments(name, tournament_type, season_id)').in('wrestler_id', chunk).not('weight', 'is', null).order('id').range(f, f + 999)),
      pages<{ wrestler_id: string; year: number; level: string; region: number | null; place: number }>(f => db.from('history_finishes').select('wrestler_id, year, level, region, place').in('wrestler_id', chunk).order('id').range(f, f + 999)),
    ])
    const post = ents.filter(e => e.tournament && POSTSEASON[e.tournament.tournament_type] != null)
    const entry = new Map(post.map(e => [e.id, e]))
    const eids = [...entry.keys()]
    for (let j = 0; j < eids.length; j += 200) {
      const part = eids.slice(j, j + 200), cols = 'round, bracket_side, winner_entry_id, loser_entry_id'
      const rounds = Object.keys(PLACE_ROUND)
      const [w, l] = await Promise.all([
        pages<{ round: string; bracket_side: string | null; winner_entry_id: number; loser_entry_id: number | null }>(f => db.from('matches').select(cols).in('round', rounds).in('winner_entry_id', part).order('id').range(f, f + 999)),
        pages<{ round: string; bracket_side: string | null; winner_entry_id: number; loser_entry_id: number | null }>(f => db.from('matches').select(cols).in('round', rounds).in('loser_entry_id', part).order('id').range(f, f + 999)),
      ])
      for (const m of [...w, ...l]) {
        // the final on the championship side; place bouts on the consolation side (as the profile reads them)
        if (m.round === 'F' ? m.bracket_side && m.bracket_side !== 'championship' : m.bracket_side !== 'consolation') continue
        for (const [eid, won] of [[m.winner_entry_id, true], [m.loser_entry_id, false]] as [number | null, boolean][]) {
          const e = eid != null ? entry.get(eid) : undefined
          if (!e) continue
          const t = e.tournament!, level = POSTSEASON[t.tournament_type]
          add(e.wrestler_id, { year: t.season_id, level, label: labelOf(t.name, level), place: PLACE_ROUND[m.round][won ? 0 : 1] })
        }
      }
    }
    for (const p of pods) {
      const t = p.tournament
      if (!t || POSTSEASON[t.tournament_type] == null) continue
      const level = POSTSEASON[t.tournament_type]
      add(p.wrestler_id, { year: t.season_id, level, label: labelOf(t.name, level), place: p.place })
    }
    for (const f of fins) {
      const level = f.level === 'state' ? 2 : 1
      add(f.wrestler_id, { year: f.year, level, label: level === 2 ? 'State' : `Region ${f.region ?? ''}`.trim(), place: f.place })
    }
  }
  for (const list of out.values()) list.sort((a, b) => a.year - b.year || a.level - b.level)
  return out
}
