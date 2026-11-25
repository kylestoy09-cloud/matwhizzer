// The public Off-Season board (Kyle 2026-11-13): every one of our NJ wrestlers who wrestled this offseason — linked to
// one of our schools, classes still in school this season but the incoming one (2026-27: classes of 2027-2029) — by
// weight, plus "Most Notable Overall" across weights. Built from the hub leaderboard (src/lib/hubLeaderboard.ts) for
// the latest offseason; shown without club, score, best win or bout record. Each listed wrestler's profile gets a
// table of the same results. Read with the service role (the hub tables aren't public) and cached 5 minutes.
import { unstable_cache } from 'next/cache'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { hubLeaderboard, type HubNotable, type HubFinish, type HubLeaderRow } from '@/lib/hubLeaderboard'
import { hubTables } from '@/lib/hub'
import { WEIGHT_ORDER_BOYS, WEIGHT_ORDER_GIRLS } from '@/lib/hammerScore'

export type OffseasonEntry = {
  prospect_id: number; wrestler_id: string; name: string; school: string; class_year: number; weight: string | null
  best_result: string | null; events: number; titles: number; podiums: number; rating: number | null
  notable: HubNotable[]; finishes: HubFinish[]; score: number   // score orders the lists; it isn't shown
  wrestled: HubLeaderRow['wrestled']   // events wrestled without a placement on file
}
// lists: 'overall' (Most Notable Overall) and each weight → wrestler ids in display order: Kyle's order
// (offseason_board_order) first, then the rest by score
export type OffseasonBoardData = { season: number; classes: number[]; weights: string[]; entries: OffseasonEntry[]; lists: Record<string, string[]>; ordered: Record<string, string[]> }

const OVERALL = 20

export async function buildOffseasonBoard(gender: 'M' | 'F'): Promise<OffseasonBoardData | null> {
  const db = createSupabaseAdmin()
  // the latest offseason with results
  const { data: evs } = await db.from(hubTables(gender).events).select('season').not('uploaded_at', 'is', null).order('season', { ascending: false }).limit(1)
  const season = evs?.[0]?.season as number | undefined
  if (!season) return null
  // classes in school this season, but the incoming one: the school year from July
  const now = new Date(), yearEnd = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
  const classes = [yearEnd, yearEnd + 1, yearEnd + 2]
  const { rows } = await hubLeaderboard(db, gender, 'offseason', { season, onlyNj: true, sex: null })
  const entries: OffseasonEntry[] = rows
    // everyone of ours who wrestled this offseason, placed or not (Kyle 2026-11-13)
    .filter(r => r.wrestler?.school && r.class_year && classes.includes(r.class_year) && r.events > 0)
    .map(r => ({
      prospect_id: r.prospect_id, wrestler_id: r.wrestler!.id, name: r.wrestler!.name, school: r.wrestler!.school!, class_year: r.class_year!, weight: r.weight,
      best_result: r.score_from, events: r.events, titles: r.titles, podiums: r.podiums, rating: r.wrestler!.rating?.score ?? null,
      notable: r.notable, finishes: r.finishes.filter(f => f.season === season), score: r.score, wrestled: r.wrestled.filter(x => x.season === season),
    }))
    .sort((a, b) => b.score - a.score || b.titles - a.titles || b.notable.filter(n => n.kind === 'win').length - a.notable.filter(n => n.kind === 'win').length || a.name.localeCompare(b.name))
  const weightOrder = (gender === 'F' ? WEIGHT_ORDER_GIRLS : WEIGHT_ORDER_BOYS).map(String)
  const weights = weightOrder.filter(w => entries.some(e => e.weight === w))
  // Kyle's order, where set (no table yet = none)
  const saved = new Map<string, string[]>()
  const { data: savedRows } = await db.from('offseason_board_order').select('list, wrestler_id, position').eq('gender', gender).eq('season', season).order('position')
  for (const r of savedRows ?? []) saved.set(r.list, [...(saved.get(r.list) ?? []), r.wrestler_id])
  const onBoard = new Set(entries.map(e => e.wrestler_id))
  // a weight: Kyle's order, then anyone new by score. Most Notable Overall: exactly Kyle's list once he saves one
  // (so taking someone off sticks), else the top 20 by score
  const arrange = (list: string, byScore: string[], cap?: number) => {
    const mine = (saved.get(list) ?? []).filter(id => onBoard.has(id) && (list === 'overall' || byScore.includes(id)))
    if (list === 'overall' && mine.length) return mine
    const rest = byScore.filter(id => !mine.includes(id))
    return [...mine, ...rest].slice(0, cap)
  }
  const lists: Record<string, string[]> = { overall: arrange('overall', entries.map(e => e.wrestler_id), OVERALL) }
  for (const w of weights) lists[w] = arrange(w, entries.filter(e => e.weight === w).map(e => e.wrestler_id))
  const ordered = Object.fromEntries([...saved].map(([k, v]) => [k, v.filter(id => onBoard.has(id))]))
  return { season, classes, weights, entries, lists, ordered }
}

// keyed by deployment too: the data cache outlives deploys, and a board cached before a code change kept showing
// (Kyle 2026-11-13: Tristan Rosemeyer still at Williamstown after the school fix)
export const loadOffseasonBoard = (gender: 'M' | 'F') =>
  unstable_cache(() => buildOffseasonBoard(gender), ['offseason-board', gender, process.env.VERCEL_DEPLOYMENT_ID ?? 'local'], { revalidate: 300, tags: ['offseason-board'] })()

/** One wrestler's offseason entry, when they're on the board. fresh = build it now (admin previews). */
export async function offseasonFor(wrestlerId: string, gender: 'M' | 'F', fresh = false): Promise<{ season: number; entry: OffseasonEntry } | null> {
  const board = fresh ? await buildOffseasonBoard(gender) : await loadOffseasonBoard(gender)
  const entry = board?.entries.find(e => e.wrestler_id === wrestlerId)
  return board && entry ? { season: board.season, entry } : null
}

// An event they wrestled with no placement on file — an offseason dual (NHSCA / Disney Duals) above all: their record
// there and every match (Kyle 2026-11-21: "if someone wrestled an off season dual - we should put their matches and
// record up otherwise it looks silly"). Opponents by their profile name when they're one of ours, else the hub's
// prospect name with state — as the notable results show them. A bye is listed, not counted in the record.
export type OffseasonMatch = { round: string | null; won: boolean; opponent: string; opponent_wrestler_id: string | null; result: string; counted: boolean }
export async function offseasonMatches(gender: 'M' | 'F', prospectId: number, eventIds: number[]): Promise<Map<number, OffseasonMatch[]>> {
  const out = new Map<number, OffseasonMatch[]>()
  if (!eventIds.length) return out
  const db = createSupabaseAdmin(), T = hubTables(gender)
  const { data: bouts, error } = await db.from(T.bouts).select('id, event_id, round, bout_date, winner_prospect_id, loser_prospect_id, win_type, score')
    .in('event_id', eventIds).or(`winner_prospect_id.eq.${prospectId},loser_prospect_id.eq.${prospectId}`).order('bout_date').order('id')
  if (error) throw new Error(error.message)
  const opp = [...new Set((bouts ?? []).map(b => (b.winner_prospect_id === prospectId ? b.loser_prospect_id : b.winner_prospect_id)).filter(Boolean))] as number[]
  const name = new Map<number, string>(), wid = new Map<number, string>()
  if (opp.length) {
    const { data } = await db.from(T.prospects).select('id, first_name, last_name, state, wrestler_id').in('id', opp)
    for (const o of data ?? []) { name.set(o.id, `${o.first_name} ${o.last_name}${o.state ? ` (${o.state})` : ''}`); if (o.wrestler_id) wid.set(o.id, o.wrestler_id) }
    const ws = [...new Set(wid.values())]
    if (ws.length) {
      const { data: prof } = await db.from('wrestlers').select('id, first_name, last_name').in('id', ws)
      const pn = new Map((prof ?? []).map(w => [w.id, `${w.first_name} ${w.last_name}`]))
      for (const [pid, w] of wid) if (pn.has(w)) name.set(pid, pn.get(w)!)
    }
  }
  for (const b of bouts ?? []) {
    const won = b.winner_prospect_id === prospectId, o = won ? b.loser_prospect_id : b.winner_prospect_id
    const list = out.get(b.event_id) ?? out.set(b.event_id, []).get(b.event_id)!
    list.push({ round: b.round, won, opponent: o ? name.get(o) ?? 'Unknown' : 'Unknown', opponent_wrestler_id: o ? wid.get(o) ?? null : null,
      result: [b.win_type, b.score].filter(Boolean).join(' '), counted: !/^bye/i.test(b.win_type ?? '') && !!o })
  }
  return out
}
