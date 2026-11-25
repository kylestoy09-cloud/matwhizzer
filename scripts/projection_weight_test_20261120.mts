// Weight-group levers test (2026-11-20): the active version + finish-or-decision (0.4), with and without weight groups,
// on 2025-26; the weight mix for each half built from the other half. Weights from the source bouts. Read only.
//   npx tsx scripts/projection_weight_test_20261120.mts
import { createClient } from '@supabase/supabase-js'
import { evaluate, replayPicks, weightMixFrom, type EvalRow, type Pick } from '../src/lib/projectionEval'
import { withDefaults, finishKind, type ProjectionParams } from '../src/lib/projection'
import { weightGroup, WEIGHT_GROUPS } from '../src/lib/weightGroups'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all<T>(q: (f: number) => any): Promise<T[]> { const out: T[] = []; for (let f = 0; ; f += 1000) { const { data, error } = await q(f); if (error) throw error; out.push(...data); if (data.length < 1000) break } return out }
for (const g of ['M', 'F'] as const) {
  const { data: st } = await db.from('projection_settings').select('version, params').eq('gender', g).eq('is_active', true).single()
  const base = withDefaults(st!.params as any)
  const raw = await all<any>(f => db.from('match_projections').select('*').eq('gender', g).eq('season', '2025-26').order('id').range(f, f + 999))
  const weight = new Map<string, number | null>()
  const num = (v: unknown) => { const m = /\d+/.exec(String(v ?? '')); return m ? Number(m[0]) : null }
  for (const [src, table] of [['dual_meet', g === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches'], ['tournament_bout', g === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts']]) {
    const ids = raw.filter(r => r.match_source === src).map(r => r.source_id)
    for (let i = 0; i < ids.length; i += 200) { const { data } = await db.from(table).select('id, weight_class').in('id', ids.slice(i, i + 200)); for (const r of data ?? []) weight.set(`${src}|${r.id}`, num(r.weight_class)) }
  }
  const ps = raw.filter(r => r.match_source === 'postseason').map(r => r.source_id)
  for (let i = 0; i < ps.length; i += 200) { const { data } = await db.from('matches').select('id, weight_class:weight_classes(weight)').in('id', ps.slice(i, i + 200)); for (const r of (data ?? []) as any[]) weight.set(`postseason|${r.id}`, r.weight_class?.weight ?? null) }
  const n = (v: any) => (v == null ? null : Number(v))
  const rows: EvalRow[] = raw.map(r => ({ id: r.id, d: r.match_date, a: r.wrestler_a_id, b: r.wrestler_b_id, wa: Number(r.a_pre_wrr), wb: Number(r.b_pre_wrr), c: n(r.common_opp_score), h: n(r.h2h_score), finA: { wins: r.a_wins, pins: r.a_pins, techs: r.a_techs, majors: r.a_majors, losses: r.a_losses, pinned: r.a_pinned, teched: r.a_teched }, finB: { wins: r.b_wins, pins: r.b_pins, techs: r.b_techs, majors: r.b_majors, losses: r.b_losses, pinned: r.b_pinned, teched: r.b_teched }, sid: 0, pw: 'even', pr: null, aw: r.actual_winner, ar: r.actual_rank, t: null, te: false, sa: n(r.a_strength), sb: n(r.b_strength), e: r.edge, wg: weightGroup(g, weight.get(`${r.match_source}|${r.source_id}`) ?? null) }))
  const halves = [0, 1].map(h => rows.filter(r => r.id % 2 === h))
  const held = (p: ProjectionParams): Pick[] => { const m = new Map<number, Pick>(); halves.forEach((h, i) => replayPicks(h, { ...p, weight: { ...p.weight, mix: p.weight.on ? weightMixFrom(halves[1 - i]) : null } }).forEach((x, j) => m.set(h[j].id, x))); return rows.map(r => m.get(r.id)!) }
  const bucketed = { ...base, buckets: { ...base.buckets, on: true, decisionFrom: 0.4 } }
  const bk = (r: number) => (r <= 12 ? 'f' : 'd')
  const report = (name: string, p: ProjectionParams, groupFilter?: string) => {
    const picks = held(p)
    const idx = rows.map((r, i) => i).filter(i => !groupFilter || rows[i].wg === groupFilter)
    const rs = idx.map(i => rows[i]), ps2 = idx.map(i => picks[i])
    const t = evaluate(rs, ps2).total
    const right = idx.filter(i => picks[i].w === rows[i].aw)
    const fd = right.filter(i => bk(picks[i].r!) === bk(rows[i].ar)).length
    const tech = ps2.filter(x => x.r != null && x.r <= 12 && x.r % 2 === 0).length, dec = ps2.filter(x => x.r != null && x.r >= 13).length
    return `${name.padEnd(30)} winner ${(100 * (t.winRight + 0.5 * (t.n - t.called)) / t.n).toFixed(1)}%  finish-or-decision ${(100 * fd / right.length).toFixed(1)}%  exact type ${(100 * t.kindRight / t.winRight).toFixed(1)}%  | picks: tech ${(100 * tech / ps2.length).toFixed(1)}%, decision-type ${(100 * dec / ps2.length).toFixed(1)}%`
  }
  console.log(`\n${g === 'M' ? 'BOYS' : 'GIRLS'} — ${rows.filter(r => !r.wg).length} bouts without a weight group`)
  for (const [name, p] of [['Finish or decision (0.4)', bucketed], ['+ weight groups (k=3)', { ...bucketed, weight: { on: true, recordK: 3, mix: null } }], ['+ weight groups (k=1)', { ...bucketed, weight: { on: true, recordK: 1, mix: null } }], ['+ weight groups (k=0, odds only)', { ...bucketed, weight: { on: true, recordK: 0, mix: null } }]] as const) console.log('  ' + report(name, p as ProjectionParams))
  for (const grp of WEIGHT_GROUPS[g].map(x => x.label)) {
    console.log(`  ${grp.padEnd(8)} before: ${report('', bucketed, grp).slice(31)}`)
    console.log(`  ${''.padEnd(8)} after:  ${report('', { ...bucketed, weight: { on: true, recordK: 3, mix: null } }, grp).slice(31)}`)
  }
}
