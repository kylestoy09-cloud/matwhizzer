// The season's tournament slate (Kyle 2026-11-16): the schedule pasted into the Tournament Registry is matched to
// the tournaments already in our system — this season's (already set up) first, then last season's — and the rest
// are created. A matched event becomes this season's edition of last season's tournament (same name, its settings
// copied, prior_id pointing back), so it reads as Active in the Tournament Hub; an unmatched one is New. Last
// season's tournaments with no edition this season are "Not set up". Per side: in_season_tournaments(_girls).
// Girls jamborees are their own tables (not tournaments): they go on the registry only.
import type { SupabaseClient } from '@supabase/supabase-js'
import { scoreNames } from '@/lib/matchTournaments'
import { cleanEventName } from '@/lib/eventName'

export type Side = 'M' | 'F'
export const tournamentTable = (g: Side) => (g === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments')

export type SlateEvent = { name: string; date_start: string | null; date_end: string | null; state: string; event_type: 'tournament' | 'jamboree' }
export type Candidate = { id: string; name: string; start_date: string | null }
/** A pick for one pasted event: this season's tournament, last season's (continue it), or a new one */
export type SlateLink = { kind: 'current' | 'prior'; id: string } | { kind: 'new' }
export type SlateMatch = { link: SlateLink; name: string | null; start_date: string | null; score: number }

/** "2026-27" → "2025-26" */
export function previousSeasonLabel(season: string): string {
  const y = parseInt(season.slice(0, 4), 10)
  return `${y - 1}-${String(y).slice(2)}`
}

// words too common to tie two tournaments together on their own
const COMMON = new Set(['holiday', 'memorial', 'county', 'conference', 'regional', 'central', 'township', 'school', 'christmas',
  'winter', 'catholic', 'union', 'north', 'south', 'east', 'west', 'invitational', 'tournament', 'classic', 'wrestling', 'annual'])
// event-kind words: "Iron Man Tournament" = "Ironman"
const GENERIC = new Set(['the', 'tournament', 'invitational', 'invite', 'classic', 'open', 'championship', 'championships'])
const words = (s: string) => cleanEventName(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)
const DAY = 86400000
const days = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / DAY

/** How alike a pasted event and one of our tournaments are: the names (year and edition dropped; "Ironman" =
 *  "Iron Man"; one distinctive shared word like "Marinelli" makes them a candidate), then the dates — `shift` days
 *  added to ours (364 for last season: same weekday) — near the same weekend counts for, a month apart against. */
export function slateScore(e: SlateEvent, c: Candidate, shift: number): number {
  const a = words(e.name), b = words(c.name)
  let s = scoreNames(a.join(' '), b.join(' '))
  const bare = (w: string[]) => w.filter(x => !GENERIC.has(x)).join('')
  if (bare(a) && bare(a) === bare(b)) s = Math.max(s, 98)
  const bs = new Set(b)
  if (a.some(w => w.length >= 5 && !COMMON.has(w) && bs.has(w))) s = Math.max(s, 60)
  if (e.date_start && c.start_date) {
    const d = days(e.date_start, new Date(Date.parse(c.start_date) + shift * DAY).toISOString().slice(0, 10))
    s += d <= 3 ? 10 : d <= 8 ? 5 : d > 30 ? -30 : 0
  }
  return s
}

const SURE = 70       // picked for you
const SUGGEST = 40    // offered, not picked

/** Best pick per event, each of our tournaments used at most once (highest score first). Below SURE the pick is
 *  only a suggestion: the event stays New until someone chooses it. */
export function matchSlate(events: SlateEvent[], current: Candidate[], prior: Candidate[]): { pick: SlateMatch | null; suggestion: SlateMatch | null }[] {
  const out = events.map(() => ({ pick: null as SlateMatch | null, suggestion: null as SlateMatch | null }))
  const assign = (pool: Candidate[], kind: 'current' | 'prior', shift: number, open: (i: number) => boolean) => {
    const pairs: { i: number; c: Candidate; s: number }[] = []
    events.forEach((e, i) => { if (e.event_type === 'tournament' && open(i)) for (const c of pool) { const s = slateScore(e, c, shift); if (s >= SUGGEST) pairs.push({ i, c, s }) } })
    pairs.sort((x, y) => y.s - x.s)
    const usedC = new Set<string>(), usedE = new Set<number>()
    for (const p of pairs) {
      if (usedC.has(p.c.id) || usedE.has(p.i)) continue
      usedC.add(p.c.id); usedE.add(p.i)
      const m: SlateMatch = { link: { kind, id: p.c.id }, name: p.c.name, start_date: p.c.start_date, score: p.s }
      if (p.s >= SURE) out[p.i].pick = m
      else if (!out[p.i].suggestion) out[p.i].suggestion = m
    }
  }
  assign(current, 'current', 0, () => true)
  assign(prior, 'prior', 364, i => !out[i].pick)
  return out
}

/** Every tournament of a season on one side, oldest first */
export async function seasonTournaments(db: SupabaseClient, g: Side, season: string): Promise<(Candidate & Record<string, unknown>)[]> {
  const { data, error } = await db.from(tournamentTable(g)).select('*').eq('season', season).order('start_date')
  if (error) throw new Error(`${tournamentTable(g)}: ${error.message}`)
  return (data ?? []) as (Candidate & Record<string, unknown>)[]
}

// settings a new edition takes from last season's
const COPY = ['name', 'location', 'source_format', 'tournament_type', 'venue_name', 'venue_address', 'location_school_id',
  'banner_bg', 'banner_fg', 'is_oos', 'podium_depth', 'point_value'] as const

export type SlateResult = { created: number; linked: number; registryOnly: number; skipped: number; errors: string[] }

/** Save the slate: each event onto the registry, linked to its tournament this season (created when needed) */
export async function applySlate(db: SupabaseClient, g: Side, season: string, rows: { event: SlateEvent; link: SlateLink }[]): Promise<SlateResult> {
  const T = tournamentTable(g)
  const res: SlateResult = { created: 0, linked: 0, registryOnly: 0, skipped: 0, errors: [] }
  const current = await seasonTournaments(db, g, season)
  const byName = new Map(current.map(t => [t.name.trim().toLowerCase(), t]))
  const { data: reg, error: rErr } = await db.from('tournament_registry').select('id, name, date_start, in_season_tournament_id').eq('season', season).eq('gender', g)
  if (rErr) throw new Error(`tournament_registry: ${rErr.message}`)
  const regKey = (name: string, d: string | null) => `${name.trim().toLowerCase()}|${d}`
  const regByKey = new Map((reg ?? []).map(r => [regKey(r.name, r.date_start), r]))
  const regByTid = new Set((reg ?? []).map(r => r.in_season_tournament_id).filter(Boolean))

  for (const { event: e, link } of rows) {
    try {
      let tid: string | null = null, name = cleanEventName(e.name), point: number | null = null
      if (e.event_type === 'tournament') {
        if (link.kind === 'current') {
          const t = current.find(x => x.id === link.id)
          if (!t) throw new Error('that tournament is not in this season')
          tid = t.id; name = t.name; point = (t.point_value as number | null) ?? null
          res.linked++
        } else {
          let prior: Record<string, unknown> | null = null
          if (link.kind === 'prior') {
            const { data, error } = await db.from(T).select('*').eq('id', link.id).maybeSingle()
            if (error) throw new Error(error.message)
            if (!data) throw new Error("last season's tournament not found")
            prior = data
            name = data.name as string
          }
          const have = byName.get(name.trim().toLowerCase())
          if (have) {
            // already set up this season under that name: link it (and to last season's, if it wasn't)
            tid = have.id; point = (have.point_value as number | null) ?? null
            if (prior && !have.prior_id) await db.from(T).update({ prior_id: prior.id }).eq('id', have.id)
            res.linked++
          } else {
            const row: Record<string, unknown> = prior ? Object.fromEntries(COPY.map(k => [k, prior![k] ?? null])) : { name, tournament_type: e.state !== 'NJ' ? 'outside' : 'inside', source_format: null }
            Object.assign(row, { season, start_date: e.date_start, end_date: e.date_end, is_oos: e.state !== 'NJ', prior_id: prior?.id ?? null })
            const { data, error } = await db.from(T).insert(row).select('*').single()
            if (error) throw new Error(error.message)
            tid = data.id as string; point = (data.point_value as number | null) ?? null
            byName.set(name.trim().toLowerCase(), data as Candidate & Record<string, unknown>)
            current.push(data as Candidate & Record<string, unknown>)
            res.created++
          }
        }
      } else res.registryOnly++

      // the registry row: one per event; an existing one gets the link
      const existing = regByKey.get(regKey(name, e.date_start)) ?? regByKey.get(regKey(e.name, e.date_start))
      if (existing) {
        if (tid && !existing.in_season_tournament_id) await db.from('tournament_registry').update({ in_season_tournament_id: tid, name }).eq('id', existing.id)
        else res.skipped++
        continue
      }
      if (tid && regByTid.has(tid)) { res.skipped++; continue }
      const { data: ins, error: iErr } = await db.from('tournament_registry').insert({
        season, gender: g, name, date_start: e.date_start, date_end: e.date_end, state: e.state, event_type: e.event_type,
        point_value: point, imported: false, in_season_tournament_id: tid,
      }).select('id, name, date_start, in_season_tournament_id').single()
      if (iErr) throw new Error(iErr.message)
      regByKey.set(regKey(name, e.date_start), ins)
      if (tid) regByTid.add(tid)
    } catch (err) {
      res.errors.push(`${e.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return res
}

/** Last season's tournaments for the new season: rolled over (an edition this season points back, or carries the
 *  same name), marked not returning, or still open. The preseason Tournament Rollover % is (rolled + not returning)
 *  / all of last season's. */
export function rolloverStatus(prior: (Candidate & Record<string, unknown>)[], current: (Candidate & Record<string, unknown>)[]) {
  const continued = new Set(current.flatMap(t => [t.prior_id as string | null | undefined, `name:${t.name.trim().toLowerCase()}`]).filter(Boolean))
  const rolled = prior.filter(p => continued.has(p.id) || continued.has(`name:${p.name.trim().toLowerCase()}`))
  const rolledIds = new Set(rolled.map(p => p.id))
  const notReturning = prior.filter(p => !rolledIds.has(p.id) && p.not_returning_at)
  const open = prior.filter(p => !rolledIds.has(p.id) && !p.not_returning_at)
  const pct = prior.length ? Math.round(((rolled.length + notReturning.length) / prior.length) * 100) : 0
  return { rolled, notReturning, open, pct }
}
