// Streaks count every bout of the season (Kyle 2026-11-11): duals (jamboree pairings included), in-season
// tournaments and the postseason, in the order they were wrestled. Bouts carry no times, so the order is:
//   date — dual meet_date; in-season tournament start_date (as the ratings do); postseason level dates from
//          season_calendar (individual_district / region / state)
//   then the event in the order it was entered (dual meet / tournament created_at); postseason after them,
//          district → region → state
//   then the bout within the event — dual card order (order_index); bracket round (championship rounds,
//          then consolation rounds, then placement bouts); a round we can't read keeps its entry order, last
// Out-of-state wrestlers (is_oos) have no streaks, as they have no ratings or rankings; their bouts still
// count for the NJ wrestlers they faced.
// Wins nobody wrestled for (forfeits, medical forfeits, injury defaults, defaults, DQs) keep a win streak
// going but neither extend nor end a pin, tech or bonus streak. Any loss ends every streak. Double forfeits,
// byes and unknown results are not bouts.
// The whole season loads once (loadStreakEvents); a full-season backfill passes it to every day.
import type { SupabaseClient } from '@supabase/supabase-js'
import { resultCategory, isContested, type ResultCategory } from './results'

export type StreakKey = 'pin' | 'tech' | 'bonus' | 'win'
export type StreakEvent = { date: string; order: string; won: boolean; cat: ResultCategory }
export type StreakSeason = {
  events: Map<string, StreakEvent[]>                     // wrestler → bouts, oldest first
  names:  Map<string, { name: string; school: string; school_id: number | null }>   // most recent school
}

// 'extend' adds to the streak, 'skip' leaves it as it is, 'break' ends it
export function streakStep(e: { won: boolean; cat: ResultCategory }, type: StreakKey): 'extend' | 'skip' | 'break' {
  if (!e.won) return 'break'
  if (type === 'win') return 'extend'
  if (!isContested(e.cat)) return 'skip'
  if (type === 'pin') return e.cat === 'Falls' ? 'extend' : 'break'
  if (type === 'tech') return e.cat === 'Tech falls' ? 'extend' : 'break'
  return e.cat === 'Falls' || e.cat === 'Tech falls' || e.cat === 'Major decisions' ? 'extend' : 'break'
}

// Bracket round → order within an event (each wrestler meets a round at most once)
export function roundRank(round: string | null | undefined): number {
  const r = (round ?? '').trim()
  let m: RegExpMatchArray | null
  if ((m = r.match(/^(?:Round (\d+)|(\d+)(?:st|nd|rd|th) Round)$/i))) return Number(m[1] ?? m[2])                // pools: 1–20
  const champ: Record<string, number> = { R64: 101, R32: 102, R16: 103, R1: 101, R2: 102, R3: 103, R4: 104, R5: 105, QF: 110, SF: 120, F: 190 }
  if (r in champ) return champ[r]
  if ((m = r.match(/^C(\d+)$/))) return 200 + Number(m[1])
  if (/^Cons\. 1st$/i.test(r)) return 201
  if (/^(CQF|Cons\. Quarters)$/i.test(r)) return 250
  if (/^(CSF|Cons\. Semis)$/i.test(r)) return 260
  if (/^(CF|PL|Cons\._3rd|Cross_Bracket|2nd_Place_Match|\d+(?:st|nd|rd|th)_Place)$/i.test(r)) return 300
  return 999   // UNK / unreadable: entry order, after the readable rounds
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function all(q: () => any, what: string): Promise<any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any[] = []
  for (let i = 0; ; i += 1000) {
    const { data, error } = await q().order('id').range(i, i + 999)
    if (error) throw new Error(`streaks ${what}: ${error.message}`)
    out.push(...(data ?? []))
    if ((data ?? []).length < 1000) return out
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function inChunks<T>(ids: T[], q: (chunk: T[]) => any, what: string): Promise<any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any[] = []
  for (let i = 0; i < ids.length; i += 150) out.push(...await all(() => q(ids.slice(i, i + 150)), what))
  return out
}
const pad = (n: number, w = 6) => String(n).padStart(w, '0')

export async function loadStreakEvents(db: Db, gender: 'M' | 'F', seasonId: number, seasonLabel: string): Promise<StreakSeason> {
  const girls = gender === 'F'
  const events = new Map<string, StreakEvent[]>()
  const latest = new Map<string, { at: string; name: string; school_id: number | null }>()
  const oos = new Set((await all(() => db.from('wrestlers').select('id').eq('gender', gender).eq('is_oos', true), 'out-of-state wrestlers')).map(w => w.id as string))
  const add = (wid: string | null, ev: StreakEvent, name: string | null, schoolId: number | null) => {
    if (!wid || oos.has(wid)) return
    if (!events.has(wid)) events.set(wid, [])
    events.get(wid)!.push(ev)
    // name and school from the most recent bout that has them
    const key = `${ev.date}|${ev.order}`
    const prev = latest.get(wid)
    if (!prev) latest.set(wid, { at: key, name: name ?? '', school_id: schoolId })
    else if (key >= prev.at) latest.set(wid, { at: key, name: name || prev.name, school_id: schoolId ?? prev.school_id })
    else if (!prev.name && name) prev.name = name
  }

  // Duals (girls: jamboree pairings are dual rows too)
  const meets = await all(() => {
    const q = db.from(girls ? 'dual_meets_girls' : 'dual_meets').select('id, meet_date, created_at').eq('season_id', seasonId)
    return girls ? q : q.eq('gender', 'M')
  }, 'meets')
  const meetById = new Map(meets.filter(m => m.meet_date).map(m => [m.id as string, m]))
  const dualBouts = await inChunks([...meetById.keys()], ids => db.from(girls ? 'dual_meet_matches_girls' : 'dual_meet_matches')
    .select('id, dual_meet_id, order_index, wrestler_a_id, wrestler_b_id, winner_id, result_type, is_double_forfeit, wrestler_a_name_raw, wrestler_b_name_raw, school_a_id, school_b_id')
    .in('dual_meet_id', ids), 'dual bouts')
  for (const b of dualBouts) {
    const cat = resultCategory(b.result_type, b.is_double_forfeit)
    if (!cat) continue
    const m = meetById.get(b.dual_meet_id)!
    const order = `${m.created_at}|${m.id}|${pad(b.order_index ?? 0)}|${b.id}`
    add(b.wrestler_a_id, { date: m.meet_date, order, won: !!b.winner_id && b.winner_id === b.wrestler_a_id, cat }, b.wrestler_a_name_raw, b.school_a_id)
    add(b.wrestler_b_id, { date: m.meet_date, order, won: !!b.winner_id && b.winner_id === b.wrestler_b_id, cat }, b.wrestler_b_name_raw, b.school_b_id)
  }

  // In-season tournaments
  const tours = await all(() => db.from(girls ? 'in_season_tournaments_girls' : 'in_season_tournaments').select('id, start_date, created_at').eq('season', seasonLabel), 'tournaments')
  const tourById = new Map(tours.filter(t => t.start_date).map(t => [t.id as string, t]))
  const tourBouts = await inChunks([...tourById.keys()], ids => db.from(girls ? 'tournament_bouts_girls' : 'tournament_bouts')
    .select('id, in_season_tournament_id, round, created_at, wrestler1_id, wrestler2_id, winner, result_type, wrestler1_name_raw, wrestler2_name_raw, wrestler1_school_id, wrestler2_school_id')
    .in('in_season_tournament_id', ids), 'tournament bouts')
  for (const b of tourBouts) {
    const cat = resultCategory(b.result_type)
    if (!cat || (b.winner !== 1 && b.winner !== 2)) continue
    const t = tourById.get(b.in_season_tournament_id)!
    const order = `${t.created_at}|${t.id}|${pad(roundRank(b.round), 3)}|${b.created_at}|${b.id}`
    add(b.wrestler1_id, { date: t.start_date, order, won: b.winner === 1, cat }, b.wrestler1_name_raw, b.wrestler1_school_id)
    add(b.wrestler2_id, { date: t.start_date, order, won: b.winner === 2, cat }, b.wrestler2_name_raw, b.wrestler2_school_id)
  }

  // Postseason: districts, regions, state, each on its season_calendar date
  const g = girls ? 'girls' : 'boys'
  const cal = await all(() => db.from('season_calendar').select('id, event_type, event_date').eq('season_id', seasonId)
    .in('event_type', [`individual_district_${g}`, `individual_region_${g}`, `individual_state_${g}`]), 'season calendar')
  const levelDate: Record<string, string> = {}
  for (const c of cal) levelDate[(c.event_type as string).split('_')[1]] = c.event_date
  const pts = await all(() => db.from('tournaments').select('id, tournament_type').eq('season_id', seasonId).eq('gender', gender), 'postseason tournaments')
  const levelOf = (t: string) => t === 'districts' ? 'district' : /regions/.test(t) ? 'region' : /_state$/.test(t) ? 'state' : null
  const psById = new Map<number, { level: string; date: string }>()
  for (const t of pts) { const lv = levelOf(t.tournament_type); if (lv && levelDate[lv]) psById.set(t.id, { level: lv, date: levelDate[lv] }) }
  if (psById.size) {
    const ids = [...psById.keys()]
    const entries = new Map((await inChunks(ids, c => db.from('tournament_entries').select('id, wrestler_id, school_id').in('tournament_id', c), 'entries')).map(e => [e.id as string, e]))
    const ms = await inChunks(ids, c => db.from('matches').select('id, tournament_id, round, win_type, winner_entry_id, loser_entry_id').in('tournament_id', c).eq('validated', true), 'postseason matches')
    const psNames = new Map<string, string>()
    const needNames = [...new Set([...entries.values()].map(e => e.wrestler_id as string).filter(id => id && !latest.get(id)?.name))]
    for (const w of await inChunks(needNames, c => db.from('wrestlers').select('id, first_name, last_name').in('id', c), 'wrestler names')) psNames.set(w.id, `${w.first_name} ${w.last_name}`.trim())
    const levelRank: Record<string, number> = { district: 1, region: 2, state: 3 }
    for (const m of ms) {
      const cat = resultCategory(m.win_type)
      if (!cat) continue
      const t = psById.get(m.tournament_id)!
      const order = `~|${levelRank[t.level]}|${pad(m.tournament_id)}|${pad(roundRank(m.round), 3)}|${m.id}`
      const w = entries.get(m.winner_entry_id), l = entries.get(m.loser_entry_id)
      if (w) add(w.wrestler_id, { date: t.date, order, won: true, cat }, psNames.get(w.wrestler_id) ?? null, w.school_id)
      if (l) add(l.wrestler_id, { date: t.date, order, won: false, cat }, psNames.get(l.wrestler_id) ?? null, l.school_id)
    }
  }

  for (const list of events.values()) list.sort((a, b) => a.date.localeCompare(b.date) || a.order.localeCompare(b.order))

  const schoolIds = [...new Set([...latest.values()].map(x => x.school_id).filter((x): x is number => x != null))]
  const schoolName = new Map((await inChunks(schoolIds, c => db.from('schools').select('id, display_name').in('id', c), 'schools')).map(s => [s.id as number, s.display_name as string]))
  const names = new Map([...latest].map(([wid, x]) => [wid, { name: x.name || 'Unknown', school: x.school_id != null ? (schoolName.get(x.school_id) ?? '') : '', school_id: x.school_id }]))
  return { events, names }
}

// Each wrestler's streaks after `date`, the streak that `date` snapped (pin / tech / bonus, 2+), and who
// has wrestled so far. `changed` holds only the wrestlers who wrestled on `date` (the only streaks that can
// move that day), so the saved streak state is written for them alone. Start dates come from the bouts.
export function streaksOn(season: StreakSeason, date: string) {
  const KEYS: StreakKey[] = ['pin', 'tech', 'bonus', 'win']
  const updated = new Map<string, { len: number; startedOn: string | null }>()
  const changed = new Map<string, { len: number; startedOn: string | null }>()
  const snapped = new Map<string, { was: number; result_type: string }>()
  const active = new Set<string>()
  for (const [wid, evs] of season.events) {
    const hist = evs.filter(e => e.date < date)
    const today = evs.filter(e => e.date === date)
    if (!hist.length && !today.length) continue
    active.add(wid)
    for (const type of KEYS) {
      let prevLen = 0, histStart: string | null = null
      for (let i = hist.length - 1; i >= 0; i--) {
        const s = streakStep(hist[i], type)
        if (s === 'extend') { prevLen++; histStart = hist[i].date }
        else if (s === 'break') break
      }
      let len = prevLen, start = histStart, broke = false, brokeBy = ''
      for (const e of today) {
        const s = streakStep(e, type)
        if (s === 'extend') { if (len === 0) start = date; len++ }
        else if (s === 'break') { if (prevLen > 0 && !broke) { broke = true; brokeBy = e.cat } len = 0; start = null }
      }
      updated.set(`${wid}:${type}`, { len, startedOn: start })
      if (today.length) changed.set(`${wid}:${type}`, { len, startedOn: start })
      if (type !== 'win' && broke && prevLen >= 2) snapped.set(`${wid}:${type}`, { was: prevLen, result_type: brokeBy })
    }
  }
  return { updated, changed, snapped, active }
}
