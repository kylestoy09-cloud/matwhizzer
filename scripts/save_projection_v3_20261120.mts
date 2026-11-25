// Version 3 for each side (2026-11-20): Kyle's Version 2 exactly, plus the win curve that makes the outcome odds and
// the pick agree (a Version 2 pick could name one wrestler while the odds' top line named the other — 9.9% of boys /
// 9.6% of girls bouts). Built from 2025-26 the way the Lever Lab's Save now builds it. Version 2 stays on file.
//   npx tsx scripts/save_projection_v3_20261120.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import { withDefaults } from '../src/lib/projection'
import { buildWinCurve, evaluate, replayPicks, onSpeedScale, type EvalRow } from '../src/lib/projectionEval'
const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all<T>(q: (f: number) => any): Promise<T[]> { const out: T[] = []; for (let f = 0; ; f += 1000) { const { data, error } = await q(f); if (error) throw new Error(error.message); out.push(...data); if (data.length < 1000) break } return out }
for (const g of ['M', 'F'] as const) {
  const { data: v2 } = await db.from('projection_settings').select('id, version, params').eq('gender', g).eq('is_active', true).single()
  if (!v2 || v2.version !== 2) throw new Error(`${g}: active version is ${v2?.version}, expected 2`)
  const raw = await all<any>(f => db.from('match_projections').select('*').eq('gender', g).eq('season', '2025-26').order('id').range(f, f + 999))
  const fin = (r: any, p: string) => ({ wins: r[`${p}_wins`], pins: r[`${p}_pins`], techs: r[`${p}_techs`], majors: r[`${p}_majors`], losses: r[`${p}_losses`], pinned: r[`${p}_pinned`], teched: r[`${p}_teched`] })
  const rows: EvalRow[] = raw.map(r => ({ id: r.id, d: r.match_date, a: r.wrestler_a_id, b: r.wrestler_b_id, wa: Number(r.a_pre_wrr), wb: Number(r.b_pre_wrr), c: r.common_opp_score == null ? null : Number(r.common_opp_score), h: r.h2h_score == null ? null : Number(r.h2h_score), finA: fin(r, 'a'), finB: fin(r, 'b'), sid: r.settings_id, pw: r.predicted_winner, pr: r.predicted_rank, aw: r.actual_winner, ar: r.actual_rank, t: r.fall_time_seconds, te: r.time_estimated, sa: r.a_strength == null ? null : Number(r.a_strength), sb: r.b_strength == null ? null : Number(r.b_strength) }))
  const params = withDefaults(v2.params as any)
  params.odds = { ...params.odds, winCurve: buildWinCurve(rows, params) }
  const graded = params.scale === 'speed' && params.bands ? onSpeedScale(rows, params.bands) : rows
  const t = evaluate(graded, replayPicks(rows, params)).total
  console.log(`${g}: Version 3 = Version 2 + win curve; on 2025-26 (in-sample): winner ${(100 * t.winRight / t.called).toFixed(1)}%, finish type ${(100 * t.kindRight / t.winRight).toFixed(1)}%`)
  if (!APPLY) continue
  const { error: e1 } = await db.from('projection_settings').update({ is_active: false }).eq('id', v2.id)
  if (e1) throw new Error(e1.message)
  const { error: e2 } = await db.from('projection_settings').insert({ gender: g, version: 3, name: 'Version 3', params, is_active: true, created_by: 'claude (Kyle’s Version 2 + win curve)',
    note: 'Kyle’s Version 2 exactly, plus the win curve: the odds’ split between the wrestlers follows the full projection (blend + strength), and the pick is the odds’ top line — they never disagree.' })
  if (e2) { await db.from('projection_settings').update({ is_active: true }).eq('id', v2.id); throw new Error(e2.message) }
}
console.log(APPLY ? 'saved' : 'dry run')
