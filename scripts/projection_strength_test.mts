// Strength rating as part of the projection blend (2026-11-20): every 2025-26 tracked bout re-projected with the
// strength rating going in (src/lib/strengthRating.ts, from the WRR match log, earlier days only) at several weights,
// graded on winner pick against version 1. Read only.
//   npx tsx scripts/projection_strength_test.mts [2025-26]
import { createClient } from '@supabase/supabase-js'
import { evaluate, replayPicks, type EvalRow } from '../src/lib/projectionEval'
import { V1_PARAMS } from '../src/lib/projection'
import { runStrength, type StrengthLogRow } from '../src/lib/strengthRating'
const season = process.argv[2] ?? '2025-26'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all<T>(q: (f: number) => any): Promise<T[]> { const out: T[] = []; for (let f = 0; ; f += 1000) { const { data, error } = await q(f); if (error) throw error; out.push(...data); if (data.length < 1000) break } return out }
for (const g of ['M', 'F']) {
  const log = (await all<any>(f => db.from('wrestler_match_score_log').select('id, wrestler_id, opponent_wrestler_id, match_date, outcome_rank, pre_match_hammer').eq('gender', g).eq('season', season).gte('match_date', `${season.slice(0, 4)}-08-01`).order('id').range(f, f + 999))).map(r => ({ ...r, pre_match_hammer: Number(r.pre_match_hammer) })) as StrengthLogRow[]
  const st = runStrength(log)
  const raw = await all<any>(f => db.from('match_projections').select('*').eq('gender', g).eq('season', season).order('id').range(f, f + 999))
  const fin = (r: any, p: string) => ({ wins: r[`${p}_wins`], pins: r[`${p}_pins`], techs: r[`${p}_techs`], majors: r[`${p}_majors`], losses: r[`${p}_losses`], pinned: r[`${p}_pinned`], teched: r[`${p}_teched`] })
  const rows: EvalRow[] = raw.map(r => ({ id: r.id, d: r.match_date, a: r.wrestler_a_id, b: r.wrestler_b_id, wa: Number(r.a_pre_wrr), wb: Number(r.b_pre_wrr), c: r.common_opp_score == null ? null : Number(r.common_opp_score), h: r.h2h_score == null ? null : Number(r.h2h_score), finA: fin(r, 'a'), finB: fin(r, 'b'), sid: r.settings_id, pw: r.predicted_winner, pr: r.predicted_rank, aw: r.actual_winner, ar: r.actual_rank, t: null, te: false, sa: st.before(r.wrestler_a_id, r.match_date), sb: st.before(r.wrestler_b_id, r.match_date) }))
  const pct = (a: number, b: number) => (100 * a / b).toFixed(1) + '%'
  const show = (name: string, w: number | null, sub: (r: EvalRow) => boolean = () => true) => {
    const rs = rows.filter(sub)
    const t = evaluate(rs, replayPicks(rs, w == null ? V1_PARAMS : { ...V1_PARAMS, strength: { on: true, weight: w } })).total
    return `${pct(t.winRight, t.called)}`
  }
  console.log(`\n${g === 'M' ? 'BOYS' : 'GIRLS'} ${season}: ${rows.length} bouts — winner picked`)
  console.log('blend                      all      WRR within 0.5   both WRR ≥ 1   from Jan 15')
  const close = (r: EvalRow) => r.wa - r.wb < 0.5, est = (r: EvalRow) => r.wa >= 1 && r.wb >= 1, late = (r: EvalRow) => r.d >= '2026-01-15'
  for (const [name, w] of [['Version 1', null], ['strength 25%', 0.25], ['strength 50%', 0.5], ['strength 75%', 0.75], ['strength 100%', 1]] as const) console.log(`${name.padEnd(22)} ${show(name, w).padStart(8)} ${show(name, w, close).padStart(14)} ${show(name, w, est).padStart(14)} ${show(name, w, late).padStart(13)}`)
}
