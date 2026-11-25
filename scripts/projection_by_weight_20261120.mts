// Projections by weight class (Kyle 2026-11-20: "does weight have any impact … clusters in weights that get averaged
// out"). Each 2025-26 tracked bout's weight comes from its source bout (dual / tournament / postseason), snapped to the
// side's classes; per weight: how bouts ended, and how the active version (replayed with the edge) did. Read only.
//   npx tsx scripts/projection_by_weight_20261120.mts
import { createClient } from '@supabase/supabase-js'
import { evaluate, replayPicks, type EvalRow } from '../src/lib/projectionEval'
import { withDefaults, finishKind } from '../src/lib/projection'
import { WEIGHT_ORDER_BOYS, WEIGHT_ORDER_GIRLS } from '../src/lib/hammerScore'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all<T>(q: (f: number) => any): Promise<T[]> { const out: T[] = []; for (let f = 0; ; f += 1000) { const { data, error } = await q(f); if (error) throw error; out.push(...data); if (data.length < 1000) break } return out }
const { data: wc } = await db.from('weight_classes').select('*').limit(1)
console.log('weight_classes columns:', wc ? Object.keys(wc[0] ?? {}).join(', ') : 'none')
for (const g of ['M', 'F'] as const) {
  const classes = g === 'M' ? WEIGHT_ORDER_BOYS : WEIGHT_ORDER_GIRLS
  const snap = (w: number | null) => (w == null || isNaN(w) ? null : classes.reduce((b, c) => (Math.abs(c - w) < Math.abs(b - w) ? c : b)))
  const { data: st } = await db.from('projection_settings').select('version, params').eq('gender', g).eq('is_active', true).single()
  const p = withDefaults(st!.params as any)
  const raw = await all<any>(f => db.from('match_projections').select('*').eq('gender', g).eq('season', '2025-26').order('id').range(f, f + 999))
  // weights from the source bouts
  const weight = new Map<string, number | null>()
  const fetchW = async (src: string, table: string, col: string, map?: Map<string, number>) => {
    const ids = raw.filter(r => r.match_source === src).map(r => r.source_id)
    for (let i = 0; i < ids.length; i += 200) { const { data } = await db.from(table).select(`id, ${col}`).in('id', ids.slice(i, i + 200)); for (const r of (data ?? []) as any[]) { const v = map ? map.get(r[col]) ?? null : parseInt(String(r[col]), 10); weight.set(`${src}|${r.id}`, snap(v as number)) } }
  }
  await fetchW('dual_meet', g === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches', 'weight_class')
  await fetchW('tournament_bout', g === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts', 'weight_class')
  const { data: wcs } = await db.from('weight_classes').select('id, weight')
  await fetchW('postseason', 'matches', 'weight_class_id', new Map((wcs ?? []).map((x: any) => [x.id, Number(x.weight)])))
  const n = (v: any) => (v == null ? null : Number(v))
  const rows: (EvalRow & { w: number | null })[] = raw.map(r => ({ id: r.id, d: r.match_date, a: r.wrestler_a_id, b: r.wrestler_b_id, wa: Number(r.a_pre_wrr), wb: Number(r.b_pre_wrr), c: n(r.common_opp_score), h: n(r.h2h_score), finA: { wins: r.a_wins, pins: r.a_pins, techs: r.a_techs, majors: r.a_majors, losses: r.a_losses, pinned: r.a_pinned, teched: r.a_teched }, finB: { wins: r.b_wins, pins: r.b_pins, techs: r.b_techs, majors: r.b_majors, losses: r.b_losses, pinned: r.b_pinned, teched: r.b_teched }, sid: r.settings_id, pw: r.predicted_winner, pr: n(r.predicted_rank), aw: r.actual_winner, ar: r.actual_rank, t: null, te: false, sa: n(r.a_strength), sb: n(r.b_strength), e: r.edge, w: weight.get(`${r.match_source}|${r.source_id}`) ?? null }))
  const params = { ...p, buckets: { ...p.buckets, on: true, decisionFrom: 0.4 } }
  console.log(`\n${g === 'M' ? 'BOYS' : 'GIRLS'} 2025-26 — ${rows.filter(r => r.w == null).length} bouts without a weight left out`)
  console.log('  weight  bouts   pin  tech major  dec   OT  | winner  finish-or-decision  higher WRR won')
  const all_ = rows.filter(r => r.w != null)
  // boys in Kyle's groups (2026-11-20); girls mirroring them (lightest alone, pairs, heavyweight alone)
  const groups: [string, number[]][] = g === 'M'
    ? [['106', [106]], ['113-120', [113, 120]], ['126-132', [126, 132]], ['138-144', [138, 144]], ['150-157', [150, 157]], ['165-175', [165, 175]], ['190-215', [190, 215]], ['285', [285]]]
    : [['100', [100]], ['107-114', [107, 114]], ['120-126', [120, 126]], ['132-138', [132, 138]], ['145-152', [145, 152]], ['165-185', [165, 185]], ['235', [235]]]
  for (const [c, ws] of [...groups, ['ALL', classes] as [string, number[]]]) {
    const rs = all_.filter(r => ws.includes(r.w!))
    if (!rs.length) continue
    const k = (x: string) => (100 * rs.filter(r => finishKind(r.ar) === x).length / rs.length).toFixed(0).padStart(4) + '%'
    const picks = replayPicks(rs, params), t = evaluate(rs, picks).total
    const bucket = (r: number) => (r <= 12 ? 'f' : 'd')
    const right = rs.filter((r, i) => picks[i].w === r.aw), bk = right.filter(r => bucket(picks[rs.indexOf(r)].r!) === bucket(r.ar)).length
    console.log(`${c.padStart(8)} ${String(rs.length).padStart(6)} ${k('pin')}${k('tech')}${k('major')}${k('dec')}${k('ot')} | ${(100 * t.winRight / t.n).toFixed(1).padStart(5)}%  ${(100 * bk / right.length).toFixed(1).padStart(8)}%           ${(100 * rs.filter(r => r.aw === 'a').length / rs.length).toFixed(1)}%`)
  }
}
