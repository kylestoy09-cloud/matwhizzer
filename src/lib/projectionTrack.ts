// Projection tracking (Kyle 2026-11-19: "track every single match we enter this season. what were their scores pre
// match, what was our prediction, what was the outcome"). Every NJ-vs-NJ bout in a season's WRR match log becomes one
// match_projections row: both WRRs going in, the inputs the projection used (shared opponents, past meetings, each
// wrestler's finishes so far — all from bouts on earlier days only), the settings version, what we projected and what
// happened. The projection is frozen the first time a bout is recorded; a later rebuild only refreshes what happened
// (a corrected result). Written at the end of every WRR rebuild (recalculate-hammer-scores) and by the 2025-26 backfill.
import type { SupabaseClient } from '@supabase/supabase-js'
import { project, rankToScore, withDefaults, NO_FINISHES, type Finishes, type ProjectionParams } from '@/lib/projection'
import { runStrength } from '@/lib/strengthRating'
import { weightGroup } from '@/lib/weightGroups'

export type LogEntry = {
  wrestler_id: string; opponent_wrestler_id: string | null; match_date: string
  match_source: string; source_id: string
  pre_match_hammer: number; opponent_pre_match_hammer: number; outcome_rank: number
}

export type ActiveSettings = { id: number; version: number; params: ProjectionParams }

/** The settings version projections use now (null before the migration) */
export async function activeProjectionSettings(db: SupabaseClient, g: 'M' | 'F'): Promise<ActiveSettings | null> {
  const { data, error } = await db.from('projection_settings').select('id, version, params').eq('gender', g).eq('is_active', true).maybeSingle()
  if (error || !data) return null
  return { id: data.id as number, version: data.version as number, params: withDefaults(data.params as Partial<ProjectionParams>) }
}

export type TrackedBout = {
  key: string
  season: string; match_date: string; match_source: string; source_id: string
  wrestler_a_id: string; wrestler_b_id: string
  a_pre_wrr: number; b_pre_wrr: number
  common_opp_score: number | null; h2h_score: number | null
  finA: Finishes; finB: Finishes
  actual_winner: 'a' | 'b'; actual_rank: number
}

export const boutKey = (src: string, id: string, a: string, b: string) => `${src}|${id}|${a}|${b}`

/** A season's bouts, oldest first, each with what was known going in. A season's log opens with the season before's
 *  postseason, replayed to seed the ratings — those bouts belong to that season and are left out here. */
export function buildBouts(season: string, log: LogEntry[]): TrackedBout[] {
  const start = `${season.slice(0, 4)}-08-01`
  const rows = log.filter(r => r.match_date >= start)
  // graded: NJ-vs-NJ bouts (both sides in the log, so both WRRs are real, not a stand-in), each once —
  // A = the higher WRR going in (tie: lower id)
  const bothSides = new Set(rows.map(r => `${r.match_source}|${r.source_id}|${r.wrestler_id}`))
  const seen = new Set<string>()
  const graded: { e: LogEntry; aFirst: boolean }[] = []
  for (const r of rows) {
    if (!r.opponent_wrestler_id || !bothSides.has(`${r.match_source}|${r.source_id}|${r.opponent_wrestler_id}`)) continue
    const me = r.wrestler_id, opp = r.opponent_wrestler_id
    const aFirst = r.pre_match_hammer > r.opponent_pre_match_hammer || (r.pre_match_hammer === r.opponent_pre_match_hammer && me < opp)
    const k = boutKey(r.match_source, r.source_id, aFirst ? me : opp, aFirst ? opp : me)
    if (seen.has(k)) continue
    seen.add(k)
    graded.push({ e: r, aFirst })
  }
  const byDay = new Map<string, { graded: typeof graded; sides: LogEntry[] }>()
  const dayOf = (d: string) => byDay.get(d) ?? byDay.set(d, { graded: [], sides: [] }).get(d)!
  for (const x of graded) dayOf(x.e.match_date).graded.push(x)
  for (const r of rows) dayOf(r.match_date).sides.push(r)

  // running state: every bout a wrestler has (out-of-state opponents too), applied a whole day at a time so
  // same-day bouts never see each other
  const fin = new Map<string, Finishes>()
  const hist = new Map<string, Map<string, number[]>>()   // wrestler → opponent → result scores
  const finOf = (id: string) => fin.get(id) ?? { ...NO_FINISHES }
  const avg = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length
  const out: TrackedBout[] = []
  for (const d of [...byDay.keys()].sort()) {
    const { graded: today, sides } = byDay.get(d)!
    today.sort((x, y) => x.e.source_id.localeCompare(y.e.source_id))
    for (const { e, aFirst } of today) {
      const a = aFirst ? e.wrestler_id : e.opponent_wrestler_id!
      const b = aFirst ? e.opponent_wrestler_id! : e.wrestler_id
      const rankA = aFirst ? e.outcome_rank : 33 - e.outcome_rank
      const hA = hist.get(a), hB = hist.get(b)
      const met = hA?.get(b)
      let common: number | null = null
      if (hA && hB) {
        let tot = 0, n = 0
        for (const [opp, sa] of hA) { if (opp === b) continue; const sb = hB.get(opp); if (sb) { tot += avg(sa) - avg(sb); n++ } }
        if (n) common = tot / n
      }
      out.push({
        key: boutKey(e.match_source, e.source_id, a, b), season, match_date: d, match_source: e.match_source, source_id: e.source_id,
        wrestler_a_id: a, wrestler_b_id: b,
        a_pre_wrr: aFirst ? e.pre_match_hammer : e.opponent_pre_match_hammer, b_pre_wrr: aFirst ? e.opponent_pre_match_hammer : e.pre_match_hammer,
        common_opp_score: common, h2h_score: met?.length ? avg(met) : null,
        finA: { ...finOf(a) }, finB: { ...finOf(b) },
        actual_winner: rankA <= 16 ? 'a' : 'b', actual_rank: rankA <= 16 ? rankA : 33 - rankA,
      })
    }
    for (const r of sides) {
      const f = finOf(r.wrestler_id), k = r.outcome_rank
      if (k <= 16) {
        f.wins++
        if (k <= 12) { if (k % 2) f.pins++; else f.techs++ } else if (k === 13) f.majors++
      } else {
        f.losses++
        const wr = 33 - k
        if (wr <= 12) { if (wr % 2) f.pinned++; else f.teched++ }
      }
      fin.set(r.wrestler_id, f)
      if (r.opponent_wrestler_id) {
        const h = hist.get(r.wrestler_id) ?? hist.set(r.wrestler_id, new Map()).get(r.wrestler_id)!
        const arr = h.get(r.opponent_wrestler_id) ?? h.set(r.opponent_wrestler_id, []).get(r.opponent_wrestler_id)!
        arr.push(rankToScore(k))
      }
    }
  }
  return out
}

const finCols = (p: 'a' | 'b', f: Finishes) => ({
  [`${p}_wins`]: f.wins, [`${p}_pins`]: f.pins, [`${p}_techs`]: f.techs, [`${p}_majors`]: f.majors,
  [`${p}_losses`]: f.losses, [`${p}_pinned`]: f.pinned, [`${p}_teched`]: f.teched,
})

/** Record a season's bouts: new ones get the active settings' projection, frozen; ones on file get their result refreshed */
export async function recordProjections(db: SupabaseClient, g: 'M' | 'F', season: string, log: LogEntry[], how: 'live' | 'backfill' = 'live'):
  Promise<{ recorded: number; updated: number; orphaned?: number; skipped?: string }> {
  const settings = await activeProjectionSettings(db, g)
  if (!settings) return { recorded: 0, updated: 0, skipped: 'no active projection_settings (migration not run)' }
  const bouts = buildBouts(season, log)
  // strength ratings (src/lib/strengthRating.ts): going into each day, and where everyone stands now
  const strength = runStrength(log.filter(r => r.match_date >= `${season.slice(0, 4)}-08-01`))
  // A row is its bout (match_source + source_id), whoever is on it now: a later rebuild can flip which side had the
  // higher WRR going in, and a merge can replace a wrestler's id — either one used to look like a new bout. The
  // projection stays as frozen; the row takes the current ids and what happened, read from its own A / B.
  type OnFile = { id: number; a: string; b: string; actual_winner: string; actual_rank: number }
  const onFile = new Map<string, OnFile>()
  for (let last = 0; ;) {
    const { data, error } = await db.from('match_projections').select('id, match_source, source_id, wrestler_a_id, wrestler_b_id, actual_winner, actual_rank')
      .eq('gender', g).eq('season', season).gt('id', last).order('id').limit(1000)
    if (error) throw new Error(`READ match_projections: ${error.message}`)
    for (const r of data ?? []) onFile.set(`${r.match_source}|${r.source_id}`, { id: r.id, a: r.wrestler_a_id, b: r.wrestler_b_id, actual_winner: r.actual_winner, actual_rank: r.actual_rank })
    if (!data || data.length < 1000) break
    last = data[data.length - 1].id
  }
  // who gets a dead-even projection, as on the site: the home slot in a dual, the lower seed in the postseason, the
  // second-listed wrestler at an in-season tournament (20261120_match_projections_edge.sql) — only new bouts need it
  const newBouts = bouts.filter(b => !onFile.has(`${b.match_source}|${b.source_id}`))
  const edges = await boutEdges(db, g, newBouts)
  const weights = await boutWeights(db, g, newBouts)
  const fresh: Record<string, unknown>[] = []
  const changed: { id: number; wrestler_a_id: string; wrestler_b_id: string; actual_winner: string; actual_rank: number }[] = []
  const seen = new Set<string>()
  const now = new Date().toISOString()
  for (const b of bouts) {
    const k = `${b.match_source}|${b.source_id}`
    seen.add(k)
    const had = onFile.get(k)
    if (had) {
      const pair = [b.wrestler_a_id, b.wrestler_b_id]
      let a = had.a, bb = had.b
      if (!pair.includes(a) || !pair.includes(bb)) {
        // a merged wrestler: keep whichever side still matches, the other side is the bout's other wrestler
        if (pair.includes(a)) bb = pair.find(x => x !== a)!
        else if (pair.includes(bb)) a = pair.find(x => x !== bb)!
        else { a = pair[0]; bb = pair[1] }
      }
      const winnerId = b.actual_winner === 'a' ? b.wrestler_a_id : b.wrestler_b_id
      const won = winnerId === a ? 'a' : 'b'
      if (a !== had.a || bb !== had.b || won !== had.actual_winner || b.actual_rank !== had.actual_rank) {
        changed.push({ id: had.id, wrestler_a_id: a, wrestler_b_id: bb, actual_winner: won, actual_rank: b.actual_rank })
      }
      continue
    }
    const strA = strength.before(b.wrestler_a_id, b.match_date), strB = strength.before(b.wrestler_b_id, b.match_date)
    const edge = edges.get(k) ?? null
    const weight_class = weights.get(k) ?? null
    const pr = project({ wrrA: b.a_pre_wrr, wrrB: b.b_pre_wrr, common: b.common_opp_score, meetings: b.h2h_score, finA: b.finA, finB: b.finB, strA, strB, edge, weightGroup: weightGroup(g, weight_class) }, settings.params)
    fresh.push({
      gender: g, season, match_date: b.match_date, match_source: b.match_source, source_id: b.source_id,
      wrestler_a_id: b.wrestler_a_id, wrestler_b_id: b.wrestler_b_id, a_pre_wrr: b.a_pre_wrr, b_pre_wrr: b.b_pre_wrr,
      common_opp_score: b.common_opp_score, h2h_score: b.h2h_score, ...finCols('a', b.finA), ...finCols('b', b.finB),
      settings_id: settings.id, predicted_winner: pr.winner, predicted_rank: pr.rank, predicted_score: pr.score,
      actual_winner: b.actual_winner, actual_rank: b.actual_rank, recorded_how: how, recorded_at: now,
      a_strength: strA, b_strength: strB, edge, weight_class,
    })
  }
  // bouts on file that this season's log no longer has (deleted as bad data, or no longer NJ vs NJ): counted, kept
  const orphaned = [...onFile.keys()].filter(k => !seen.has(k)).length
  // pin / tech times from the bouts themselves (the speed-band test, 20261119_match_projections_fall_times.sql)
  const times = await boutTimes(db, g, fresh.map(f => ({ src: f.match_source as string, id: f.source_id as string })))
  for (const f of fresh) {
    const t = times.get(`${f.match_source}|${f.source_id}`)
    f.fall_time_seconds = t?.secs ?? null
    f.time_estimated = t?.est ?? false
  }
  for (let i = 0; i < fresh.length; i += 1000) {
    const { error } = await db.from('match_projections').upsert(fresh.slice(i, i + 1000), { onConflict: 'gender,match_source,source_id,wrestler_a_id,wrestler_b_id', ignoreDuplicates: true })
    if (error) throw new Error(`INSERT match_projections at ${i}: ${error.message}`)
  }
  for (const c of changed) {
    const { id, ...upd } = c
    const { error } = await db.from('match_projections').update({ ...upd, actual_updated_at: now }).eq('id', id)
    if (error) throw new Error(`UPDATE match_projections ${id}: ${error.message}`)
  }
  // each wrestler's strength now, for the head-to-head projection
  const strengthRows = [...strength.final].map(([wrestler_id, v]) => ({ wrestler_id, season, gender: g, strength: Math.round(v.strength * 100) / 100, bouts: v.bouts, updated_at: now }))
  for (let i = 0; i < strengthRows.length; i += 1000) {
    const { error } = await db.from('wrestler_strength').upsert(strengthRows.slice(i, i + 1000), { onConflict: 'wrestler_id,season' })
    if (error) throw new Error(`UPSERT wrestler_strength at ${i}: ${error.message}`)
  }
  return { recorded: fresh.length, updated: changed.length, orphaned }
}

const TIME_TABLES: Record<string, { M: string; F: string; est: boolean }> = {
  dual_meet:       { M: 'dual_meet_matches', F: 'dual_meet_matches_girls', est: true },
  tournament_bout: { M: 'tournament_bouts',  F: 'tournament_bouts_girls',  est: true },
  postseason:      { M: 'matches',           F: 'matches',                 est: false },
}

/** Each bout's pin / tech time, keyed "<match_source>|<source_id>" */
async function boutTimes(db: SupabaseClient, g: 'M' | 'F', bouts: { src: string; id: string }[]) {
  const out = new Map<string, { secs: number | null; est: boolean }>()
  for (const [src, t] of Object.entries(TIME_TABLES)) {
    const ids = [...new Set(bouts.filter(b => b.src === src).map(b => b.id))]
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await db.from(t[g]).select(t.est ? 'id, fall_time_seconds, result_time_estimated' : 'id, fall_time_seconds').in('id', ids.slice(i, i + 200))
      if (error) throw new Error(`READ ${t[g]} times: ${error.message}`)
      for (const r of (data ?? []) as unknown as { id: string | number; fall_time_seconds: number | null; result_time_estimated?: boolean | null }[]) {
        out.set(`${src}|${r.id}`, { secs: r.fall_time_seconds, est: !!r.result_time_estimated })
      }
    }
  }
  return out
}

/** Each new bout's edge side ('a' / 'b' in the bout's own A / B), keyed "<match_source>|<source_id>" */
async function boutEdges(db: SupabaseClient, g: 'M' | 'F', bouts: TrackedBout[]): Promise<Map<string, 'a' | 'b'>> {
  const out = new Map<string, 'a' | 'b'>()
  const side = (b: TrackedBout, favored: string | null | undefined): 'a' | 'b' => (favored && favored === b.wrestler_a_id ? 'a' : 'b')
  const of = (src: string) => bouts.filter(b => b.match_source === src)
  const slot = async (src: string, table: string, col: string) => {
    const list = of(src)
    for (let i = 0; i < list.length; i += 200) {
      const chunk = list.slice(i, i + 200)
      const { data, error } = await db.from(table).select(`id, ${col}`).in('id', chunk.map(b => b.source_id))
      if (error) throw new Error(`READ ${table} edge: ${error.message}`)
      const m = new Map(((data ?? []) as unknown as Record<string, unknown>[]).map(r => [String(r.id), r[col] as string | null]))
      for (const b of chunk) out.set(`${src}|${b.source_id}`, side(b, m.get(b.source_id)))
    }
  }
  await slot('dual_meet', g === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches', 'wrestler_b_id')
  await slot('tournament_bout', g === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts', 'wrestler2_id')
  // postseason: the lower seed (bigger number; unseeded counts lowest)
  const ps = of('postseason')
  for (let i = 0; i < ps.length; i += 200) {
    const chunk = ps.slice(i, i + 200)
    const { data: ms, error } = await db.from('matches').select('id, winner_entry_id, loser_entry_id').in('id', chunk.map(b => b.source_id))
    if (error) throw new Error(`READ matches edge: ${error.message}`)
    const entryIds = (ms ?? []).flatMap(m => [m.winner_entry_id, m.loser_entry_id]).filter(Boolean) as string[]
    const { data: es } = entryIds.length ? await db.from('tournament_entries').select('id, wrestler_id, seed').in('id', entryIds) : { data: [] }
    const e = new Map((es ?? []).map(x => [x.id as string, x as { wrestler_id: string | null; seed: number | null }]))
    const mm = new Map((ms ?? []).map(m => [String(m.id), m]))
    for (const b of chunk) {
      const m = mm.get(b.source_id); if (!m) continue
      const w = e.get(m.winner_entry_id as string), l = e.get(m.loser_entry_id as string)
      const seedOf = (id: string) => (w?.wrestler_id === id ? w?.seed : l?.seed) ?? 999
      out.set(`postseason|${b.source_id}`, seedOf(b.wrestler_a_id) > seedOf(b.wrestler_b_id) ? 'a' : 'b')
    }
  }
  return out
}

/** Each new bout's weight class, keyed "<match_source>|<source_id>" (20261120_match_projections_weight.sql) */
async function boutWeights(db: SupabaseClient, g: 'M' | 'F', bouts: TrackedBout[]): Promise<Map<string, number | null>> {
  const out = new Map<string, number | null>()
  const num = (v: unknown) => { const m = /\d+/.exec(String(v ?? '')); return m ? Number(m[0]) : null }
  const from = async (src: string, table: string) => {
    const ids = bouts.filter(b => b.match_source === src).map(b => b.source_id)
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await db.from(table).select('id, weight_class').in('id', ids.slice(i, i + 200))
      if (error) throw new Error(`READ ${table} weight: ${error.message}`)
      for (const r of data ?? []) out.set(`${src}|${r.id}`, num(r.weight_class))
    }
  }
  await from('dual_meet', g === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches')
  await from('tournament_bout', g === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts')
  const ps = bouts.filter(b => b.match_source === 'postseason').map(b => b.source_id)
  for (let i = 0; i < ps.length; i += 200) {
    const { data, error } = await db.from('matches').select('id, weight_class:weight_classes(weight)').in('id', ps.slice(i, i + 200))
    if (error) throw new Error(`READ matches weight: ${error.message}`)
    for (const r of (data ?? []) as unknown as { id: string; weight_class: { weight: number } | null }[]) out.set(`postseason|${r.id}`, r.weight_class?.weight ?? null)
  }
  return out
}
