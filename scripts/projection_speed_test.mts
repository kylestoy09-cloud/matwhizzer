// Speed-band test from the command line (Kyle 2026-11-19): grades a season's tracked bouts (match_projections, with
// their times) under version 1 on the clock scale vs the speed scale with the finish levers, plus the two-week and
// bouts-so-far breakdowns. Same code as the Projection Accuracy page's Lever Lab.
//   npx tsx scripts/projection_speed_test.mts [2025-26]
import { createClient } from '@supabase/supabase-js'
import { evaluate, replayPicks, onSpeedScale, cutoffsFrom, type EvalRow, type Line } from '../src/lib/projectionEval'
import { V1_PARAMS, type ProjectionParams } from '../src/lib/projection'
import { BAND_NAMES, mmss } from '../src/lib/speedBands'
const season = process.argv[2] ?? '2025-26'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const pct = (a: number, b: number) => (b ? (100 * a / b).toFixed(1) + '%' : '—')
const line = (l: Line) => `winner ${pct(l.winRight, l.called).padStart(6)}  finish type ${pct(l.kindRight, l.winRight).padStart(6)}  exact ${pct(l.exact, l.winRight).padStart(6)}`
for (const g of ['M', 'F'] as const) {
  const raw: Record<string, any>[] = []
  for (let last = 0; ;) {
    const { data, error } = await db.from('match_projections').select('*').eq('gender', g).eq('season', season).gt('id', last).order('id').limit(1000)
    if (error) throw error
    raw.push(...data!); if (data!.length < 1000) break; last = data![data!.length - 1].id
  }
  const fin = (r: any, p: string) => ({ wins: r[`${p}_wins`], pins: r[`${p}_pins`], techs: r[`${p}_techs`], majors: r[`${p}_majors`], losses: r[`${p}_losses`], pinned: r[`${p}_pinned`], teched: r[`${p}_teched`] })
  const rows: EvalRow[] = raw.map(r => ({ id: r.id, d: r.match_date, a: r.wrestler_a_id, b: r.wrestler_b_id, wa: Number(r.a_pre_wrr), wb: Number(r.b_pre_wrr), c: r.common_opp_score == null ? null : Number(r.common_opp_score), h: r.h2h_score == null ? null : Number(r.h2h_score), finA: fin(r, 'a'), finB: fin(r, 'b'), sid: r.settings_id, pw: r.predicted_winner, pr: r.predicted_rank, aw: r.actual_winner, ar: r.actual_rank, t: r.fall_time_seconds, te: r.time_estimated }))
  const cut = cutoffsFrom(rows), speedRows = onSpeedScale(rows, cut)
  console.log(`\n${g === 'M' ? 'BOYS' : 'GIRLS'} ${season}: ${rows.length} bouts; timed pins ${cut.n.pin}, techs ${cut.n.tech}`)
  BAND_NAMES.forEach((b, i) => console.log(`  ${b.padEnd(12)} pin ${i === 0 ? '<' + mmss(cut.pin[0]) : i === 5 ? mmss(cut.pin[4]) + '+' : mmss(cut.pin[i - 1]) + '–' + mmss(cut.pin[i])}   tech ${i === 0 ? '<' + mmss(cut.tech[0]) : i === 5 ? mmss(cut.tech[4]) + '+' : mmss(cut.tech[i - 1]) + '–' + mmss(cut.tech[i])}`))
  const test = (name: string, p: ProjectionParams) => console.log(`${name.padEnd(44)} ${line(evaluate(p.scale === 'speed' ? speedRows : rows, replayPicks(rows, p)).total)}`)
  test('Version 1 (clock)', V1_PARAMS)
  test('Clock + finish from records (3+)', { ...V1_PARAMS, fromRecord: { on: true, minWins: 3 } })
  test('Speed bands, no finish levers', { ...V1_PARAMS, scale: 'speed' })
  test('Speed + pin↔tech by style (5+)', { ...V1_PARAMS, scale: 'speed', finishStyle: { on: true, minWins: 5 } })
  test('Speed + finish from records (3+)', { ...V1_PARAMS, scale: 'speed', fromRecord: { on: true, minWins: 3 } })
  test('Speed + records (3+) + pin↔tech (5+)', { ...V1_PARAMS, scale: 'speed', fromRecord: { on: true, minWins: 3 }, finishStyle: { on: true, minWins: 5 } })
  const r = evaluate(rows, replayPicks(rows, V1_PARAMS))
  console.log('Version 1 every two weeks:'); for (const l of r.byFortnight) console.log(`  ${l.label.padEnd(18)} ${String(l.n).padStart(6)} bouts  ${line(l)}`)
  console.log('Version 1 by bouts so far (less-experienced wrestler):'); for (const l of r.byExperience) console.log(`  ${l.label.padEnd(12)} ${String(l.n).padStart(6)} bouts  ${line(l)}`)
}
