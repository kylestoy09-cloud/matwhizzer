// Whiz Rank — the weekly individual rankings (Kyle 2026-11-17). One board per week × weight × section, top 25:
// boys North I / North II / Central / South, girls North / South. Week 1 starts in WRR order; every later week starts
// from the previous week's Whiz Rank (wrestlers not on it follow by WRR). Saving writes the order; Submit locks the
// weight/section; when every weight/section is submitted the week is ready and the publisher releases it Monday
// 8 AM Eastern (individual_ranking_weeks.publish_at). Storage: individual_rankings (stage 'section', stage_entity =
// the section, manual_rank = Whiz Rank) and individual_ranking_completion (Submit).
// Each row also carries the WRR (rank in the board and score), last season's district / region / State finish, and
// the Off-Season board rank at the weight; its match drop-down (wrestlerMatches) shows recent bouts against
// expectation and the record for the week.
import type { SupabaseClient } from '@supabase/supabase-js'
import { getExpectedOutcomeRank, OUTCOME_LABELS, WEIGHT_ORDER_BOYS, WEIGHT_ORDER_GIRLS } from '@/lib/hammerScore'
import { loadOffseasonBoard } from '@/lib/offseasonPublic'
import { schoolsOfWrestlers } from '@/lib/hubSchools'
import { addDays } from '@/lib/challenge'
import { latestTransfers, tableMissing } from '@/lib/transfers'

export type Side = 'M' | 'F'
export const WHIZ_TOP = 25
export const WHIZ_SECTIONS: Record<Side, string[]> = { M: ['North I', 'North II', 'Central', 'South'], F: ['North', 'South'] }
export const WHIZ_WEIGHTS: Record<Side, number[]> = { M: WEIGHT_ORDER_BOYS, F: WEIGHT_ORDER_GIRLS }
const STAGE = 'section'
const seasonLabel = (id: number) => `${id - 1}-${String(id).slice(2)}`

export type WhizWeek = { id: number; season_id: number; week_number: number; week_date: string; publish_at: string | null; ready_at: string | null; published_at: string | null }

export async function whizWeeks(db: SupabaseClient, g: Side, seasonId: number): Promise<WhizWeek[]> {
  const { data, error } = await db.from('individual_ranking_weeks').select('id, season_id, week_number, week_date, publish_at, ready_at, published_at')
    .eq('season_id', seasonId).eq('gender', g).order('week_number')
  if (error) throw new Error(`individual_ranking_weeks: ${error.message}`)
  return (data ?? []) as WhizWeek[]
}

/** Each school's ranking section: its section, or for a Non-Public school its locale_section (the geographic
 *  section set on the school profile — the rule the daily report uses). Girls rank North / South: North I and
 *  North II are North, Central and South are South. A Non-Public school with no locale_section has no section yet. */
export async function schoolSections(db: SupabaseClient, g: Side): Promise<Map<number, string>> {
  const out = new Map<number, string>()
  const { data: schools, error } = await db.from('schools').select('id, section, locale_section').eq('is_nj', true)
  if (error) throw new Error(`schools: ${error.message}`)
  for (const s of schools ?? []) {
    const geo = s.section === 'Non-Public' ? s.locale_section : s.section
    if (!geo || !WHIZ_SECTIONS.M.includes(geo)) continue
    out.set(s.id, g === 'M' ? geo : geo.startsWith('North') ? 'North' : 'South')
  }
  return out
}

export type Finish = { district: number | null; region: number | null; state: number | null }

/** Last season's district / region / State place for each wrestler (best place if more than one) */
async function lastSeasonFinishes(db: SupabaseClient, g: Side, seasonId: number, wrestlerIds: string[]): Promise<Map<string, Finish>> {
  const out = new Map<string, Finish>()
  const { data: ts, error } = await db.from('tournaments').select('id, tournament_type').eq('season_id', seasonId - 1).eq('gender', g)
  if (error) throw new Error(`tournaments: ${error.message}`)
  const level = new Map((ts ?? []).map(t => [t.id as number, /state/.test(t.tournament_type) ? 'state' : /region/.test(t.tournament_type) ? 'region' : 'district']))
  if (!level.size) return out
  const want = new Set(wrestlerIds)
  for (let i = 0; i < wrestlerIds.length; i += 200) {
    const { data: entries } = await db.from('tournament_entries').select('id, wrestler_id, tournament_id').in('wrestler_id', wrestlerIds.slice(i, i + 200)).in('tournament_id', [...level.keys()])
    const byEntry = new Map((entries ?? []).map(e => [e.id as number, e]))
    if (!byEntry.size) continue
    const { data: pl } = await db.from('placements').select('entry_id, place').in('entry_id', [...byEntry.keys()])
    for (const p of pl ?? []) {
      const e = byEntry.get(p.entry_id)
      if (!e || !want.has(e.wrestler_id)) continue
      const f = out.get(e.wrestler_id) ?? { district: null, region: null, state: null }
      const k = level.get(e.tournament_id) as keyof Finish
      if (f[k] == null || p.place < f[k]!) f[k] = p.place
      out.set(e.wrestler_id, f)
    }
  }
  return out
}

/** Off-Season rank at the weight: the wrestler's place on the Off-Season board's list for that weight, as set on the
 *  Offseason Hub's "Public board" tab (Kyle's saved order, then by score) — the cached board, nothing recalculated */
async function offseasonRanks(g: Side, weight: number): Promise<Map<string, { rank: number; score: number }>> {
  const out = new Map<string, { rank: number; score: number }>()
  const board = await loadOffseasonBoard(g)
  if (!board) return out
  const score = new Map(board.entries.map(e => [e.wrestler_id, e.score]))
  ;(board.lists[String(weight)] ?? []).forEach((id, i) => out.set(id, { rank: i + 1, score: score.get(id) ?? 0 }))
  return out
}

export type WhizRow = {
  wrestler_id: string; name: string; grade: string | null; school_id: number | null; school: string | null
  whiz: number | null; prev_whiz: number | null; wrr: number; wrr_rank: number
  finish: Finish; offseason: { rank: number; score: number } | null
}
export type WhizNotice = { id: number; message: string; created_at: string }
export type WhizBoard = { week: WhizWeek; weight: number; section: string; rows: WhizRow[]; saved: boolean; submitted: boolean; source: 'saved' | 'previous week' | 'WRR'; unplaced: number; notices: WhizNotice[] }

async function savedOrder(db: SupabaseClient, g: Side, weekId: number, weight: number, section: string): Promise<Map<string, number>> {
  const { data, error } = await db.from('individual_rankings').select('wrestler_id, manual_rank')
    .eq('week_id', weekId).eq('gender', g).eq('weight_class', weight).eq('stage', STAGE).eq('stage_entity', section).not('manual_rank', 'is', null)
  if (error) throw new Error(`individual_rankings: ${error.message}`)
  return new Map((data ?? []).map(r => [r.wrestler_id as string, r.manual_rank as number]))
}

/** The board: everyone rated at the weight in the section, in Whiz Rank order (saved → previous week → WRR) */
export async function whizBoard(db: SupabaseClient, g: Side, weekId: number, weight: number, section: string): Promise<WhizBoard> {
  const { data: wk, error: wErr } = await db.from('individual_ranking_weeks').select('id, season_id, week_number, week_date, publish_at, ready_at, published_at').eq('id', weekId).eq('gender', g).maybeSingle()
  if (wErr) throw new Error(wErr.message)
  if (!wk) throw new Error('Week not found')
  const week = wk as WhizWeek
  const sections = await schoolSections(db, g)

  const rated: { wrestler_id: string; school_id: number | null; hammer_score: number }[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('wrestler_hammer_scores').select('wrestler_id, school_id, hammer_score')
      .eq('season', seasonLabel(week.season_id)).eq('gender', g).eq('weight_class', String(weight)).order('wrestler_id').range(from, from + 999)
    if (error) throw new Error(`wrestler_hammer_scores: ${error.message}`)
    rated.push(...(data ?? []))
    if ((data ?? []).length < 1000) break
  }
  // a logged transfer is their school now (Kyle 2026-11-17: no ratings run needed); a status takes them off
  const moved = await latestTransfers(db, rated.map(r => r.wrestler_id))
  for (const r of rated) { const t = moved.get(r.wrestler_id); if (t && t.season_id <= week.season_id) r.school_id = t.school_id }
  const off = await offBoards(db, rated.map(r => r.wrestler_id), week.season_id)
  const pool = rated.filter(r => !off.has(r.wrestler_id) && r.school_id != null && sections.get(r.school_id) === section).sort((a, b) => b.hammer_score - a.hammer_score)
  // rated at this weight but on no board: no school on the rating row, or a school with no section (Non-Public without its locale section)
  const unplaced = rated.filter(r => !off.has(r.wrestler_id) && (r.school_id == null || !sections.has(r.school_id))).length
  const ids = pool.map(r => r.wrestler_id)

  const [saved, prevWeek, people, schools, finishes, offseason, { data: comp }, notices] = await Promise.all([
    savedOrder(db, g, weekId, weight, section),
    (async () => {
      const { data } = await db.from('individual_ranking_weeks').select('id').eq('season_id', week.season_id).eq('gender', g).eq('week_number', week.week_number - 1).maybeSingle()
      return data ? savedOrder(db, g, data.id, weight, section) : new Map<string, number>()
    })(),
    (async () => {
      const m = new Map<string, { name: string; grade: string | null }>()
      for (let i = 0; i < ids.length; i += 300) {
        const { data } = await db.from('wrestlers').select('id, first_name, last_name, suffix, grade').in('id', ids.slice(i, i + 300))
        for (const w of data ?? []) m.set(w.id, { name: [w.first_name, w.last_name, w.suffix].filter(Boolean).join(' '), grade: w.grade })
      }
      return m
    })(),
    (async () => {
      const sIds = [...new Set(pool.map(r => r.school_id!))]
      const { data } = sIds.length ? await db.from('schools').select('id, display_name').in('id', sIds) : { data: [] }
      return new Map((data ?? []).map(s => [s.id as number, s.display_name as string]))
    })(),
    lastSeasonFinishes(db, g, week.season_id, ids),
    offseasonRanks(g, weight),
    db.from('individual_ranking_completion').select('id').eq('week_id', weekId).eq('gender', g).eq('weight_class', weight).eq('stage', STAGE).eq('stage_entity', section).maybeSingle(),
    boardNotices(db, g, weekId, weight, section),
  ])

  const base = saved.size ? saved : prevWeek
  const source: WhizBoard['source'] = saved.size ? 'saved' : prevWeek.size ? 'previous week' : 'WRR'
  const wrrRank = new Map(pool.map((r, i) => [r.wrestler_id, i + 1]))
  const ordered = [...pool].sort((a, b) => {
    const ra = base.get(a.wrestler_id), rb = base.get(b.wrestler_id)
    if (ra != null && rb != null) return ra - rb
    if (ra != null) return -1
    if (rb != null) return 1
    return b.hammer_score - a.hammer_score
  })
  const rows: WhizRow[] = ordered.map((r, i) => ({
    wrestler_id: r.wrestler_id, name: people.get(r.wrestler_id)?.name ?? '—', grade: people.get(r.wrestler_id)?.grade ?? null,
    school_id: r.school_id, school: r.school_id != null ? schools.get(r.school_id) ?? null : null,
    whiz: i < WHIZ_TOP ? i + 1 : null, prev_whiz: prevWeek.get(r.wrestler_id) ?? null,
    wrr: Number(r.hammer_score), wrr_rank: wrrRank.get(r.wrestler_id)!,
    finish: finishes.get(r.wrestler_id) ?? { district: null, region: null, state: null },
    offseason: offseason.get(r.wrestler_id) ?? null,
  }))
  return { week, weight, section, rows, saved: saved.size > 0, submitted: !!comp, source, unplaced, notices }
}

/** Save the order (top 25, by wrestler id); a submitted or published board can't change */
export async function saveWhizOrder(db: SupabaseClient, g: Side, weekId: number, weight: number, section: string, order: string[]): Promise<void> {
  const ids = [...new Set(order)].slice(0, WHIZ_TOP)
  const { data: wk } = await db.from('individual_ranking_weeks').select('season_id, published_at').eq('id', weekId).maybeSingle()
  if (!wk) throw new Error('Week not found')
  if (wk.published_at) throw new Error('This week is published')
  const { data: comp } = await db.from('individual_ranking_completion').select('id').eq('week_id', weekId).eq('gender', g).eq('weight_class', weight).eq('stage', STAGE).eq('stage_entity', section).maybeSingle()
  if (comp) throw new Error('Submitted: reopen it to change the order')
  const { data: ratings } = ids.length ? await db.from('wrestler_hammer_scores').select('wrestler_id, school_id, hammer_score').eq('season', seasonLabel(wk.season_id)).eq('gender', g).in('wrestler_id', ids) : { data: [] }
  const rating = new Map((ratings ?? []).map(r => [r.wrestler_id as string, r]))
  const { error: dErr } = await db.from('individual_rankings').delete().eq('week_id', weekId).eq('gender', g).eq('weight_class', weight).eq('stage', STAGE).eq('stage_entity', section)
  if (dErr) throw new Error(dErr.message)
  if (!ids.length) return
  const { error } = await db.from('individual_rankings').insert(ids.map((id, i) => ({
    week_id: weekId, gender: g, weight_class: weight, stage: STAGE, stage_entity: section, wrestler_id: id,
    school_id: rating.get(id)?.school_id ?? null, manual_rank: i + 1, hammer_score_snapshot: rating.get(id)?.hammer_score ?? null,
  })))
  if (error) throw new Error(error.message)
}

/** Submit (lock) or reopen a weight/section; the week is ready once every weight/section is submitted */
export async function setSubmitted(db: SupabaseClient, g: Side, weekId: number, weight: number, section: string, on: boolean, by: string): Promise<{ ready: boolean; done: number; total: number }> {
  const { data: wk } = await db.from('individual_ranking_weeks').select('published_at').eq('id', weekId).maybeSingle()
  if (!wk) throw new Error('Week not found')
  if (wk.published_at) throw new Error('This week is published')
  const key = { week_id: weekId, gender: g, weight_class: weight, stage: STAGE, stage_entity: section }
  if (on) {
    const saved = await savedOrder(db, g, weekId, weight, section)
    if (!saved.size) throw new Error('Save the order before submitting')
    const { error } = await db.from('individual_ranking_completion').upsert({ ...key, completed_by: by }, { onConflict: 'week_id,gender,weight_class,stage,stage_entity', ignoreDuplicates: true })
    if (error) throw new Error(error.message)
    // submitting again = the board's notices have been dealt with
    await db.from('whiz_rank_notices').delete().eq('week_id', weekId).eq('gender', g).eq('weight_class', weight).eq('section', section)
  } else {
    const { error } = await db.from('individual_ranking_completion').delete().match(key)
    if (error) throw new Error(error.message)
  }
  const { data: all } = await db.from('individual_ranking_completion').select('weight_class, stage_entity').eq('week_id', weekId).eq('gender', g).eq('stage', STAGE)
  const total = WHIZ_WEIGHTS[g].length * WHIZ_SECTIONS[g].length
  const done = new Set((all ?? []).filter(c => WHIZ_WEIGHTS[g].includes(c.weight_class) && WHIZ_SECTIONS[g].includes(c.stage_entity)).map(c => `${c.weight_class}|${c.stage_entity}`)).size
  const ready = done === total
  await db.from('individual_ranking_weeks').update(ready ? { ready_at: new Date().toISOString(), ready_by: by } : { ready_at: null, ready_by: null }).eq('id', weekId)
  return { ready, done, total }
}

export type WhizMatch = {
  date: string; opponent_id: string | null; opponent: string; opponent_school: string | null
  opponent_whiz: { rank: number; weight: number; section: string } | null; opponent_wrr: number
  expected: string; actual: string; vs: 'above' | 'below' | 'met'
}

/** A wrestler's row drop-down: their record for the 7 days before the ranking (Kyle 2026-11-17), up to 3 notable
 *  wins and 3 notable losses from their last 20 rated bouts, and the recent bouts against expectation — the expected
 *  result from the WRR gap before the bout (getExpectedOutcomeRank), the actual result, and whether it beat or fell
 *  short of that. Notable win = beat the strongest opponents (highest WRR before the bout); notable loss = lost when
 *  expected to do better, the furthest below expectation first. Opponent Whiz Rank = this week's (else last week's). */
export async function wrestlerMatches(db: SupabaseClient, g: Side, weekId: number, wrestlerId: string, limit = 10): Promise<{ record: { wins: number; losses: number; from: string; to: string }; notableWins: WhizMatch[]; notableLosses: WhizMatch[]; matches: WhizMatch[] }> {
  const { data: wk } = await db.from('individual_ranking_weeks').select('season_id, week_number, week_date').eq('id', weekId).maybeSingle()
  if (!wk) throw new Error('Week not found')
  const from = addDays(wk.week_date, -6), to = wk.week_date
  const { data: log, error } = await db.from('wrestler_match_score_log')
    .select('match_date, opponent_wrestler_id, pre_match_hammer, opponent_pre_match_hammer, outcome_rank, is_winner')
    .eq('wrestler_id', wrestlerId).lte('match_date', to).order('match_date', { ascending: false }).limit(200)
  if (error) throw new Error(`wrestler_match_score_log: ${error.message}`)
  const rows = log ?? []
  const week = rows.filter(r => r.match_date >= from && r.match_date <= to)
  const last20 = rows.slice(0, 20)
  const expectedRank = (me: number, opp: number) => { const d = me - opp; return d >= 0 ? getExpectedOutcomeRank(d) : 33 - getExpectedOutcomeRank(-d) }
  const miss = (r: (typeof rows)[number]) => r.outcome_rank - expectedRank(Number(r.pre_match_hammer), Number(r.opponent_pre_match_hammer))
  const winsBest = last20.filter(r => r.is_winner).sort((a, b) => Number(b.opponent_pre_match_hammer) - Number(a.opponent_pre_match_hammer)).slice(0, 3)
  const lossesWorst = last20.filter(r => !r.is_winner && miss(r) > 0).sort((a, b) => miss(b) - miss(a)).slice(0, 3)
  const recent = rows.slice(0, limit)

  const oppIds = [...new Set([...recent, ...winsBest, ...lossesWorst].map(r => r.opponent_wrestler_id).filter(Boolean) as string[])]
  const [{ data: opps }, oppSchools, { data: ranks }] = await Promise.all([
    oppIds.length ? db.from('wrestlers').select('id, first_name, last_name, suffix').in('id', oppIds) : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string; suffix: string | null }[] }),
    schoolsOfWrestlers(db, oppIds),
    (async () => {
      const { data: prev } = await db.from('individual_ranking_weeks').select('id').eq('season_id', wk.season_id).eq('gender', g).eq('week_number', wk.week_number - 1).maybeSingle()
      return db.from('individual_rankings').select('week_id, wrestler_id, weight_class, stage_entity, manual_rank')
        .in('week_id', [weekId, prev?.id ?? -1]).eq('gender', g).eq('stage', STAGE).in('wrestler_id', oppIds.length ? oppIds : ['00000000-0000-0000-0000-000000000000'])
    })(),
  ])
  const oppName = new Map((opps ?? []).map(o => [o.id, [o.first_name, o.last_name, o.suffix].filter(Boolean).join(' ')]))
  const oppRank = new Map<string, { rank: number; weight: number; section: string }>()
  for (const r of [...(ranks ?? [])].sort((a, b) => (a.week_id === weekId ? -1 : 1) - (b.week_id === weekId ? -1 : 1))) {
    if (!oppRank.has(r.wrestler_id) && r.manual_rank != null) oppRank.set(r.wrestler_id, { rank: r.manual_rank, weight: r.weight_class, section: r.stage_entity })
  }

  const toMatch = (r: (typeof rows)[number]): WhizMatch => {
    const exp = expectedRank(Number(r.pre_match_hammer), Number(r.opponent_pre_match_hammer))
    return {
      date: r.match_date, opponent_id: r.opponent_wrestler_id, opponent: r.opponent_wrestler_id ? oppName.get(r.opponent_wrestler_id) ?? '—' : 'Unknown',
      opponent_school: r.opponent_wrestler_id ? oppSchools.get(r.opponent_wrestler_id) ?? null : null,
      opponent_whiz: r.opponent_wrestler_id ? oppRank.get(r.opponent_wrestler_id) ?? null : null,
      opponent_wrr: Number(r.opponent_pre_match_hammer),
      expected: OUTCOME_LABELS[exp], actual: OUTCOME_LABELS[r.outcome_rank],
      vs: r.outcome_rank < exp ? 'above' : r.outcome_rank > exp ? 'below' : 'met',
    }
  }
  return {
    record: { wins: week.filter(r => r.is_winner).length, losses: week.filter(r => !r.is_winner).length, from, to },
    notableWins: winsBest.map(toMatch), notableLosses: lossesWorst.map(toMatch), matches: recent.map(toMatch),
  }
}

/** Wrestlers off every board this season: status deceased, or out for this season (wrestlers.status) */
async function offBoards(db: SupabaseClient, ids: string[], seasonId: number): Promise<Set<string>> {
  const out = new Set<string>()
  for (let i = 0; i < ids.length; i += 300) {
    const { data, error } = await db.from('wrestlers').select('id, status, status_season_id').in('id', ids.slice(i, i + 300)).not('status', 'is', null)
    if (error) { if (/status/.test(error.message)) return out; throw new Error(`wrestlers: ${error.message}`) }   // before the status migration
    for (const w of data ?? []) if (w.status === 'deceased' || (w.status === 'out_for_season' && w.status_season_id === seasonId)) out.add(w.id)
  }
  return out
}

async function boardNotices(db: SupabaseClient, g: Side, weekId: number, weight: number, section: string): Promise<WhizNotice[]> {
  const { data, error } = await db.from('whiz_rank_notices').select('id, message, created_at').eq('week_id', weekId).eq('gender', g).eq('weight_class', weight).eq('section', section).order('created_at')
  if (error) { if (tableMissing(error)) return []; throw new Error(`whiz_rank_notices: ${error.message}`) }
  return (data ?? []) as WhizNotice[]
}

/** Take a wrestler off the saved boards of every unpublished week this season (Kyle 2026-11-17): a transfer to a
 *  school in another section (newSection), or a status (newSection null). The rest of that board moves up one, a
 *  submitted board reopens (and the week stops being ready), and a notice goes on the board — and, for a transfer,
 *  on the new section's board at the same weight. Published weeks are left as they went out. */
export async function pullFromBoards(db: SupabaseClient, g: Side, seasonId: number, wrestlerId: string, why: string, newSection: string | null): Promise<number> {
  const { data: weeks } = await db.from('individual_ranking_weeks').select('id').eq('season_id', seasonId).eq('gender', g).is('published_at', null)
  const weekIds = (weeks ?? []).map(w => w.id as number)
  if (!weekIds.length) return 0
  const { data: rows, error } = await db.from('individual_rankings').select('id, week_id, weight_class, stage_entity, manual_rank')
    .eq('wrestler_id', wrestlerId).eq('gender', g).eq('stage', STAGE).in('week_id', weekIds)
  if (error) throw new Error(`individual_rankings: ${error.message}`)
  let pulled = 0
  for (const r of rows ?? []) {
    if (newSection && r.stage_entity === newSection) continue   // same section: only the school name changes
    const board = { week_id: r.week_id, gender: g, weight_class: r.weight_class, stage: STAGE, stage_entity: r.stage_entity }
    await db.from('individual_rankings').delete().eq('id', r.id)
    // everyone below moves up one
    const { data: below } = await db.from('individual_rankings').select('id, manual_rank').match(board).gt('manual_rank', r.manual_rank ?? 0).order('manual_rank')
    for (const b of below ?? []) await db.from('individual_rankings').update({ manual_rank: (b.manual_rank as number) - 1 }).eq('id', b.id)
    const { data: comp } = await db.from('individual_ranking_completion').delete().match(board).select('id')
    if ((comp ?? []).length) await db.from('individual_ranking_weeks').update({ ready_at: null, ready_by: null }).eq('id', r.week_id)
    const notices = [{ week_id: r.week_id, gender: g, weight_class: r.weight_class, section: r.stage_entity, wrestler_id: wrestlerId, message: `Removed from #${r.manual_rank}: ${why}${(comp ?? []).length ? ' — board reopened' : ''}` }]
    if (newSection) notices.push({ week_id: r.week_id, gender: g, weight_class: r.weight_class, section: newSection, wrestler_id: wrestlerId, message: `Transferred in (was #${r.manual_rank} in ${r.stage_entity}): ${why} — place him` })
    const { error: nErr } = await db.from('whiz_rank_notices').insert(notices)
    if (nErr && !tableMissing(nErr)) throw new Error(`whiz_rank_notices: ${nErr.message}`)
    pulled++
  }
  return pulled
}

/** A wrestler's Whiz Rank for the profile (Kyle 2026-11-19): his highest group ranking in the latest published week
 *  of the season — State over section over region over district — as "1st in State" / "10th in South". 'unranked'
 *  when a week is out and he isn't on it; null when no week has been published yet (the profile shows a dash). */
export async function profileWhizRank(db: SupabaseClient, g: Side, seasonId: number, wrestlerId: string): Promise<{ text: string } | 'unranked' | null> {
  const { data: wk, error } = await db.from('individual_ranking_weeks').select('id').eq('season_id', seasonId).eq('gender', g)
    .not('published_at', 'is', null).order('week_number', { ascending: false }).limit(1).maybeSingle()
  if (error || !wk) return null
  const { data: rows } = await db.from('individual_rankings').select('stage, stage_entity, manual_rank')
    .eq('week_id', wk.id).eq('gender', g).eq('wrestler_id', wrestlerId).not('manual_rank', 'is', null)
  const ORDER = ['state', 'section', 'region', 'district']
  const best = [...(rows ?? [])].sort((a, b) => ORDER.indexOf(a.stage) - ORDER.indexOf(b.stage) || a.manual_rank - b.manual_rank)[0]
  if (!best) return 'unranked'
  const n = best.manual_rank as number, ord = `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? 'th'}`
  const where = best.stage === 'state' ? 'State' : best.stage === 'region' ? `Region ${best.stage_entity}` : best.stage === 'district' ? `District ${best.stage_entity}` : best.stage_entity
  return { text: `${ord} in ${where}` }
}
