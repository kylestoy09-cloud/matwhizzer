// Finish-or-decision buckets test (Kyle 2026-11-20): the active version vs the same with buckets on, on 2025-26 —
// winner, finish type, the finish / decision call, and the mix of picks against how bouts really ended. Read only.
//   npx tsx scripts/projection_buckets_test.mts
import { createClient } from '@supabase/supabase-js'
import { evaluate, replayPicks, type EvalRow } from '../src/lib/projectionEval'
import { withDefaults, finishKind } from '../src/lib/projection'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all<T>(q: (f: number) => any): Promise<T[]> { const out: T[] = []; for (let f = 0; ; f += 1000) { const { data, error } = await q(f); if (error) throw error; out.push(...data); if (data.length < 1000) break } return out }
const mix = (ranks: number[]) => { const c = new Map<string, number>(); for (const r of ranks) c.set(finishKind(r), (c.get(finishKind(r)) ?? 0) + 1); return ['pin', 'tech', 'major', 'dec', 'ot'].map(k => `${k} ${(100 * (c.get(k) ?? 0) / ranks.length).toFixed(1)}%`).join(', ') }
for (const g of ['M', 'F']) {
  const { data: st } = await db.from('projection_settings').select('version, params').eq('gender', g).eq('is_active', true).single()
  const base = withDefaults(st!.params as any)
  const raw = await all<any>(f => db.from('match_projections').select('*').eq('gender', g).eq('season', '2025-26').order('id').range(f, f + 999))
  const rows: EvalRow[] = raw.map(r => ({ id: r.id, d: r.match_date, a: r.wrestler_a_id, b: r.wrestler_b_id, wa: Number(r.a_pre_wrr), wb: Number(r.b_pre_wrr), c: r.common_opp_score == null ? null : Number(r.common_opp_score), h: r.h2h_score == null ? null : Number(r.h2h_score), finA: { wins: r.a_wins, pins: r.a_pins, techs: r.a_techs, majors: r.a_majors, losses: r.a_losses, pinned: r.a_pinned, teched: r.a_teched }, finB: { wins: r.b_wins, pins: r.b_pins, techs: r.b_techs, majors: r.b_majors, losses: r.b_losses, pinned: r.b_pinned, teched: r.b_teched }, sid: 0, pw: 'even', pr: null, aw: r.actual_winner, ar: r.actual_rank, t: null, te: false, sa: Number(r.a_strength), sb: Number(r.b_strength) }))
  console.log(`\n${g === 'M' ? 'BOYS' : 'GIRLS'} 2025-26 (${rows.length} bouts) — actual mix: ${mix(rows.map(r => r.ar))}`)
  for (const [name, p] of [[`Version ${st!.version}`, base], ...[0.5, 0.45, 0.4, 0.35, 0.3].map(d => [`+ buckets, decision ≥ ${d}`, { ...base, buckets: { ...base.buckets, on: true, decisionFrom: d } }])] as const) {
    const picks = replayPicks(rows, p as any), t = evaluate(rows, picks).total
    const bucket = (k: string) => (k === 'pin' || k === 'tech' ? 'finish' : 'decision')
    const right = rows.filter((r, i) => picks[i].w === r.aw), bucketRight = right.filter(r => bucket(finishKind(picks[rows.indexOf(r)].r!)) === bucket(finishKind(r.ar))).length
    console.log(`  ${name.padEnd(22)} winner ${(100 * t.winRight / t.called).toFixed(1)}% | right winner + finish-or-decision ${(100 * bucketRight / right.length).toFixed(1)}% | exact type ${(100 * t.kindRight / t.winRight).toFixed(1)}%`)
    console.log(`  ${''.padEnd(22)} picks: ${mix(picks.filter(x => x.r != null).map(x => x.r!))}`)
  }
}
