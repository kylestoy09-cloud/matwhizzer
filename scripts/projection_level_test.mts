// "Finish by rating level" lever test (Kyle 2026-11-20): grades a season's tracked bouts (match_projections) under
// version 1, finish from the records, and the level lever at several settings, alone and with the records lever.
// Settings picked by looking at 2025-26, so 2025-26 flatters them — check against the next season before trusting.
//   npx tsx scripts/projection_level_test.mts [2025-26]
import { createClient } from '@supabase/supabase-js'
import { evaluate, replayPicks, type EvalRow } from '../src/lib/projectionEval'
import { V1_PARAMS, type ProjectionParams } from '../src/lib/projection'
const season = process.argv[2] ?? '2025-26'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const pct = (a: number, b: number) => (b ? (100 * a / b).toFixed(1) + '%' : '—')
for (const g of ['M', 'F'] as const) {
  const raw: Record<string, any>[] = []
  for (let last = 0; ;) { const { data, error } = await db.from('match_projections').select('*').eq('gender', g).eq('season', season).gt('id', last).order('id').limit(1000); if (error) throw error; raw.push(...data!); if (data!.length < 1000) break; last = data![data!.length - 1].id }
  const fin = (r: any, p: string) => ({ wins: r[`${p}_wins`], pins: r[`${p}_pins`], techs: r[`${p}_techs`], majors: r[`${p}_majors`], losses: r[`${p}_losses`], pinned: r[`${p}_pinned`], teched: r[`${p}_teched`] })
  const rows: EvalRow[] = raw.map(r => ({ id: r.id, d: r.match_date, a: r.wrestler_a_id, b: r.wrestler_b_id, wa: Number(r.a_pre_wrr), wb: Number(r.b_pre_wrr), c: r.common_opp_score == null ? null : Number(r.common_opp_score), h: r.h2h_score == null ? null : Number(r.h2h_score), finA: fin(r, 'a'), finB: fin(r, 'b'), sid: r.settings_id, pw: r.predicted_winner, pr: r.predicted_rank, aw: r.actual_winner, ar: r.actual_rank, t: r.fall_time_seconds, te: r.time_estimated }))
  const close = rows.filter(r => Math.abs(r.wa - r.wb) <= 5)
  console.log(`\n${g === 'M' ? 'BOYS' : 'GIRLS'} ${season}: ${rows.length} bouts (${close.length} within 5)`)
  console.log('setup'.padEnd(50) + 'ALL BOUTS: finish type   exact   | WITHIN 5: finish type   exact')
  const show = (name: string, p: ProjectionParams) => {
    const t = evaluate(rows, replayPicks(rows, p)).total, c = evaluate(close, replayPicks(close, p)).total
    console.log(`${name.padEnd(50)}${pct(t.kindRight, t.winRight).padStart(16)} ${pct(t.exact, t.winRight).padStart(7)}   | ${pct(c.kindRight, c.winRight).padStart(16)} ${pct(c.exact, c.winRight).padStart(7)}`)
  }
  const rec = { on: true, minWins: 3 }
  const lvl = (maxGap: number, splitAt: number, decRank = 15, pinRank = 3) => ({ on: true, maxGap, splitAt, pinRank, decRank })
  show('Version 1', V1_PARAMS)
  show('BASELINE: always "1st Period Pin"', { ...V1_PARAMS, byLevel: lvl(999, 999) })
  show('Finish from records (3+)', { ...V1_PARAMS, fromRecord: rec })
  show('Level: within 5, split 20', { ...V1_PARAMS, byLevel: lvl(5, 20) })
  show('Level: within 5, split 20, major above', { ...V1_PARAMS, byLevel: lvl(5, 20, 13) })
  show('Level: within 10, split 20', { ...V1_PARAMS, byLevel: lvl(10, 20) })
  show('Level: within 32, split 20', { ...V1_PARAMS, byLevel: lvl(32, 20) })
  show('Level: within 5, split 10', { ...V1_PARAMS, byLevel: lvl(5, 10) })
  show('Level: within 5, split 30', { ...V1_PARAMS, byLevel: lvl(5, 30) })
  show('Records (3+) + level (within 5, split 20)', { ...V1_PARAMS, fromRecord: rec, byLevel: lvl(5, 20) })
  show('Records (3+) + level (within 10, split 20)', { ...V1_PARAMS, fromRecord: rec, byLevel: lvl(10, 20) })
  show('Records (3+) + level (within 32, split 20)', { ...V1_PARAMS, fromRecord: rec, byLevel: lvl(32, 20) })
  show('Records (5+) + level (within 10, split 20)', { ...V1_PARAMS, fromRecord: { on: true, minWins: 5 }, byLevel: lvl(10, 20) })
}
