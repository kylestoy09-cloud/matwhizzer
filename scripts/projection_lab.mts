// Projection lever lab from the command line: rebuilds a season's graded bouts straight from the WRR match log
// (src/lib/projectionTrack.ts buildBouts) and grades version 1 against each finish lever. The Projection Accuracy page
// does the same from match_projections; this works before the migration and for any season with a log.
//   npx tsx scripts/projection_lab.mts [2025-26]
import { createClient } from '@supabase/supabase-js'
import { buildBouts, type LogEntry } from '../src/lib/projectionTrack'
import { evaluate, replayPicks, compareChanges, type EvalRow } from '../src/lib/projectionEval'
import { V1_PARAMS, type ProjectionParams } from '../src/lib/projection'
const season = process.argv[2] ?? '2025-26'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const pct = (a: number, b: number) => b ? (100 * a / b).toFixed(1) + '%' : '—'
for (const g of ['M', 'F'] as const) {
  const log: LogEntry[] = []
  for (let last = ''; ;) {
    let q = db.from('wrestler_match_score_log').select('id, wrestler_id, opponent_wrestler_id, match_date, match_source, source_id, pre_match_hammer, opponent_pre_match_hammer, outcome_rank').eq('gender', g).eq('season', season).order('id').limit(1000)
    if (last) q = q.gt('id', last)
    const { data, error } = await q; if (error) throw error
    log.push(...(data as unknown as LogEntry[])); if (data!.length < 1000) break; last = data![data!.length - 1].id
  }
  const bouts = buildBouts(season, log.map(r => ({ ...r, pre_match_hammer: Number(r.pre_match_hammer), opponent_pre_match_hammer: Number(r.opponent_pre_match_hammer) })))
  const rows: EvalRow[] = bouts.map((b, i) => ({ id: i, d: b.match_date, a: b.wrestler_a_id, b: b.wrestler_b_id, wa: b.a_pre_wrr, wb: b.b_pre_wrr, c: b.common_opp_score, h: b.h2h_score, finA: b.finA, finB: b.finB, sid: 1, pw: 'even', pr: null, aw: b.actual_winner, ar: b.actual_rank, t: null, te: false }))
  console.log(`\n${g === 'M' ? 'BOYS' : 'GIRLS'} ${season}: ${log.length} log rows → ${rows.length} NJ-vs-NJ bouts graded`)
  const base = replayPicks(rows, V1_PARAMS)
  const show = (name: string, p: ProjectionParams) => {
    const picks = replayPicks(rows, p); const t = evaluate(rows, picks).total; const ch = compareChanges(rows, base, picks)
    console.log(`${name.padEnd(34)} winner ${pct(t.winRight, t.called)}  finish type ${pct(t.kindRight, t.winRight)}  exact ${pct(t.exact, t.winRight)}  tiers off ${(t.tiersOff / t.tiersN).toFixed(2)}${p === V1_PARAMS ? '' : `  | changed ${ch.changed}: closer ${ch.better}, further ${ch.worse}`}`)
  }
  show('Version 1 (today)', V1_PARAMS)
  show('+ finish style (8+ wins)', { ...V1_PARAMS, finishStyle: { on: true, minWins: 8 } })
  show('+ finish style (5+ wins)', { ...V1_PARAMS, finishStyle: { on: true, minWins: 5 } })
  show('+ bonus cap (<20% bonus → major)', { ...V1_PARAMS, bonusCap: { on: true, minWins: 8, floorPct: 20 } })
  show('+ hard to pin (<20% pinned)', { ...V1_PARAMS, hardToPin: { on: true, minLosses: 5, floorPct: 20 } })
  show('+ finish from record (5+ wins)', { ...V1_PARAMS, fromRecord: { on: true, minWins: 5 } })
  show('+ finish from record (3+ wins)', { ...V1_PARAMS, fromRecord: { on: true, minWins: 3 } })
  show('finish from record + hard to pin', { ...V1_PARAMS, fromRecord: { on: true, minWins: 3 }, hardToPin: { on: true, minLosses: 5, floorPct: 20 } })
  show('winner: WRR only (no blend)', { ...V1_PARAMS, weights: { all: [1, 0, 0], meetings: [1, 0], common: [1, 0] } })
  show('winner: WRR-heavy blend (.6/.2/.2)', { ...V1_PARAMS, weights: { all: [0.6, 0.2, 0.2], meetings: [0.7, 0.3], common: [0.7, 0.3] } })
  show('winner: meetings-heavy (.2/.2/.6)', { ...V1_PARAMS, weights: { all: [0.2, 0.2, 0.6], meetings: [0.3, 0.7], common: [0.5, 0.5] } })
  show('all three', { ...V1_PARAMS, finishStyle: { on: true, minWins: 5 }, bonusCap: { on: true, minWins: 8, floorPct: 20 }, hardToPin: { on: true, minLosses: 5, floorPct: 20 } })
  const r = evaluate(rows, base)
  console.log('Version 1 by WRR gap:'); for (const l of r.byGap) console.log(`  ${l.label.padEnd(6)} ${String(l.n).padStart(6)} bouts  winner ${pct(l.winRight, l.called)}  finish type ${pct(l.kindRight, l.winRight)}`)
  console.log('Version 1: projected → what happened'); for (const [k, v] of Object.entries(r.matrix)) console.log(`  ${k.padEnd(7)} ${Object.entries(v).sort((a, b) => b[1] - a[1]).map(([x, n]) => `${x} ${n}`).join(', ')}`)
}
