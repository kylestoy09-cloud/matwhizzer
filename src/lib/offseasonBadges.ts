// Offseason badges (Kyle 2026-11-18): national finishes a wrestler earns outside the NJSIAA season, read from the
// Offseason Hub (the {boys,girls}_hub_* tables, service role) through the prospect linked to him:
//   Super 32 Challenge — a podium (top 8)       Fargo (USAW 16U & Junior Nationals) — a podium (top 8, All-American)
//   Ironman — a title                            World — a title (world championships, when Kyle adds them)
//   Who's Number One — a win (Kyle 2026-11-19: "who's number one will get a badge"; a match series, so from the
//   Hub's bouts: the winner of the #1-vs-#2 bout). The Super 32 NJ Early Qualifier gives no badge. season = the hub event's season (end-year keyed,
// like the site's). Oldest first.
import type { SupabaseClient } from '@supabase/supabase-js'

export type BadgeKind = 'super32' | 'fargo' | 'ironman' | 'world' | 'wno'
// season: the site's season (end-year key) it belongs to; year: the calendar year it was held
export type OffseasonBadge = { wrestler_id: string; season: number; year: number; kind: BadgeKind; label: string; place: number }

const RULES: { kind: BadgeKind; match: RegExp; label: string; topPlace: number }[] = [
  { kind: 'super32', match: /^super 32 challenge/i, label: 'Super 32', topPlace: 8 },
  { kind: 'fargo', match: /fargo/i, label: 'Fargo', topPlace: 8 },
  { kind: 'ironman', match: /iron ?man/i, label: 'Ironman', topPlace: 1 },
  { kind: 'world', match: /world (championship|team trials? winner|champion)/i, label: 'World', topPlace: 1 },
]
const WNO = /who'?s (number one|#\s?1)/i

/** The site's season (end-year keyed) a badge belongs to. The Hub keys an event by the year it's held (Super 32's
 *  October 2026 event = 2026), but these events run June–December — the start of the next season: October 2012's
 *  Super 32 is 2012–13 (key 2013), not 2011–12 (found in the 2026-11-19 review: Nick Suriano's 2012 title sat a season
 *  before his freshman year). An event held January–May keeps its year. */
const badgeSeason = (heldYear: number, startDate: string | null) => {
  const month = startDate ? Number(startDate.slice(5, 7)) : 10   // no date: these events are fall / summer ones
  return month >= 6 ? heldYear + 1 : heldYear
}

async function pages<T>(q: (from: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let f = 0; ; f += 1000) { const { data, error } = await q(f); if (error) throw new Error(error.message); const d = (data ?? []) as T[]; out.push(...d); if (d.length < 1000) break }
  return out
}

/** Badges for these wrestlers: wrestler_id → badges, oldest first */
export async function offseasonBadges(db: SupabaseClient, g: 'M' | 'F', wrestlerIds: string[]): Promise<Map<string, OffseasonBadge[]>> {
  const out = new Map<string, OffseasonBadge[]>()
  if (!wrestlerIds.length) return out
  const p = g === 'F' ? 'girls' : 'boys'
  const { data: tourns, error } = await db.from(`${p}_hub_tournaments`).select('id, name').eq('hub', 'offseason')
  if (error) throw new Error(error.message)
  const rule = new Map<number, (typeof RULES)[number]>()
  for (const t of tourns ?? []) { const r = RULES.find(x => x.match.test(t.name as string)); if (r) rule.set(t.id as number, r) }
  await wnoBadges(db, p, (tourns ?? []).filter(t => WNO.test(t.name as string)).map(t => t.id as number), wrestlerIds, out)
  if (!rule.size) { for (const list of out.values()) list.sort((a, b) => a.season - b.season); return out }
  const events = await pages<{ id: number; tournament_id: number; season: number; start_date: string | null }>(f => db.from(`${p}_hub_events`).select('id, tournament_id, season, start_date').in('tournament_id', [...rule.keys()]).order('id').range(f, f + 999))
  const evById = new Map(events.map(e => [e.id, e]))
  for (let i = 0; i < wrestlerIds.length; i += 200) {
    const prospects = await pages<{ id: number; wrestler_id: string }>(f => db.from(`${p}_prospects`).select('id, wrestler_id').in('wrestler_id', wrestlerIds.slice(i, i + 200)).order('id').range(f, f + 999))
    const who = new Map(prospects.map(x => [x.id, x.wrestler_id]))
    const pids = [...who.keys()]
    for (let j = 0; j < pids.length; j += 200) {
      const rows = await pages<{ event_id: number; style: string; division: string | null; place: number; prospect_id: number }>(f => db.from(`${p}_hub_placements`).select('event_id, style, division, place, prospect_id').in('prospect_id', pids.slice(j, j + 200)).in('event_id', [...evById.keys()]).order('id').range(f, f + 999))
      for (const r of rows) {
        const ev = evById.get(r.event_id)!, ru = rule.get(ev.tournament_id)!
        if (r.place > ru.topPlace) continue
        const w = who.get(r.prospect_id)!
        // Fargo: its age division and style ("Fargo 16U FS"); Super 32 has one division per side
        const extra = ru.kind === 'fargo' ? ` ${r.division ?? ''}${r.style === 'freestyle' ? ' FS' : r.style ? ` ${r.style.slice(0, 2).toUpperCase()}` : ''}`.trimEnd() : ''
        const year = ev.start_date ? Number(ev.start_date.slice(0, 4)) : ev.season
        const list = out.get(w) ?? out.set(w, []).get(w)!
        list.push({ wrestler_id: w, season: badgeSeason(year, ev.start_date), year, kind: ru.kind, label: `${ru.label}${extra}`, place: r.place })
      }
    }
  }
  for (const list of out.values()) list.sort((a, b) => a.season - b.season || a.kind.localeCompare(b.kind) || a.place - b.place)
  return out
}

/** Who's Number One: a badge for each bout won (place 1) */
async function wnoBadges(db: SupabaseClient, p: string, tournIds: number[], wrestlerIds: string[], out: Map<string, OffseasonBadge[]>) {
  if (!tournIds.length) return
  const events = await pages<{ id: number; season: number; start_date: string | null }>(f => db.from(`${p}_hub_events`).select('id, season, start_date').in('tournament_id', tournIds).order('id').range(f, f + 999))
  if (!events.length) return
  const evById = new Map(events.map(e => [e.id, e]))
  for (let i = 0; i < wrestlerIds.length; i += 200) {
    const prospects = await pages<{ id: number; wrestler_id: string }>(f => db.from(`${p}_prospects`).select('id, wrestler_id').in('wrestler_id', wrestlerIds.slice(i, i + 200)).order('id').range(f, f + 999))
    const who = new Map(prospects.map(x => [x.id, x.wrestler_id]))
    if (!who.size) continue
    const wins = await pages<{ event_id: number; winner_prospect_id: number }>(f => db.from(`${p}_hub_bouts`).select('event_id, winner_prospect_id').in('winner_prospect_id', [...who.keys()]).in('event_id', [...evById.keys()]).order('id').range(f, f + 999))
    for (const b of wins) {
      const ev = evById.get(b.event_id)!, w = who.get(b.winner_prospect_id)!
      const list = out.get(w) ?? out.set(w, []).get(w)!
      const year = ev.start_date ? Number(ev.start_date.slice(0, 4)) : ev.season
      list.push({ wrestler_id: w, season: badgeSeason(year, ev.start_date), year, kind: 'wno', label: "Who's #1", place: 1 })
    }
  }
}

/** The badge as a chip: Super 32 black, Fargo USA red, Ironman steel, World blue, Who's #1 gold; medal for 1st–3rd */
export const BADGE_LOOK: Record<BadgeKind, string> = {
  super32: 'bg-black border-black text-white',
  fargo: 'bg-[#B31942] border-[#B31942] text-white',
  ironman: 'bg-slate-600 border-slate-600 text-white',
  world: 'bg-[#0A3161] border-[#0A3161] text-white',
  wno: 'bg-amber-400 border-amber-500 text-slate-900',
}
