import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const [oldF, newF] = process.argv.slice(2).map(f => JSON.parse(readFileSync(f, 'utf8')))
for (const g of ['M', 'F']) {
  const O = new Map(oldF[g].map((r: any) => [r.wrestler_id, r])), N = new Map(newF[g].map((r: any) => [r.wrestler_id, r]))
  // stored (live) rows: weight, school, and the live rating to check the baseline
  const live = new Map<string, any>()
  for (let f = 0; ; f += 1000) { const { data } = await db.from('wrestler_hammer_scores').select('wrestler_id, hammer_score, weight_class, school_id').eq('season', '2025-26').eq('gender', g).order('wrestler_id').range(f, f + 999); for (const r of data ?? []) live.set(r.wrestler_id, r); if ((data ?? []).length < 1000) break }
  const baseOff = [...O.values()].filter((r: any) => Math.abs(r.hammer_score - (live.get(r.wrestler_id)?.hammer_score ?? -999)) > 0.01).length
  const rows = [...N.values()].map((n: any) => { const o: any = O.get(n.wrestler_id); return { id: n.wrestler_id, o, n, d: n.hammer_score - o.hammer_score, dps: n.postseason_adjusted - o.postseason_adjusted } })
  const changed = rows.filter(r => Math.abs(r.d) > 0.005)
  const bucket = (lo: number, hi: number) => changed.filter(r => r.d >= lo && r.d < hi).length
  console.log(`\n=== ${g}: ${rows.length} rated; baseline vs live differs for ${baseOff}; changed ${changed.length}`)
  console.log(`  up: ${changed.filter(r => r.d > 0).length}  down: ${changed.filter(r => r.d < 0).length}`)
  console.log(`  change buckets: <-20 ${bucket(-999, -20)} | -20..-10 ${bucket(-20, -10)} | -10..-2 ${bucket(-10, -2)} | -2..0 ${bucket(-2, 0)} | 0..2 ${bucket(0.001, 2)} | 2..10 ${bucket(2, 10)} | 10..20 ${bucket(10, 20)} | 20+ ${bucket(20, 999)}`)
  // postseason-part transitions
  const tr = new Map<string, number>()
  for (const r of rows) if (Math.abs(r.dps) > 0.005) { const k = `${r.o.postseason_adjusted}→${r.n.postseason_adjusted}`; tr.set(k, (tr.get(k) ?? 0) + 1) }
  console.log('  postseason part, most common changes:', [...tr].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${k} (${v})`).join(', '))
  // rank within weight, top 10
  const byW = new Map<string, any[]>()
  for (const r of rows) { const w = live.get(r.id)?.weight_class; if (!w) continue; byW.set(w, [...(byW.get(w) ?? []), r]) }
  let enter = 0, moves = 0
  for (const list of byW.values()) {
    const ro = [...list].sort((a, b) => b.o.hammer_score - a.o.hammer_score).slice(0, 10).map(r => r.id)
    const rn = [...list].sort((a, b) => b.n.hammer_score - a.n.hammer_score).slice(0, 10).map(r => r.id)
    enter += rn.filter(id => !ro.includes(id)).length
    moves += rn.filter((id, i) => ro.includes(id) && ro.indexOf(id) !== i).length
  }
  console.log(`  top 10 per weight (${byW.size} weights): ${enter} new names in, ${moves} reordered`)
  const ids = [...changed].sort((a, b) => b.d - a.d)
  const pick = [...ids.slice(0, 10), ...ids.slice(-10)]
  const { data: ws } = await db.from('wrestlers').select('id, first_name, last_name, grade').in('id', pick.map(r => r.id))
  const sIds = [...new Set(pick.map(r => live.get(r.id)?.school_id).filter(Boolean))]
  const { data: ss } = await db.from('schools').select('id, display_name').in('id', sIds)
  const nm = new Map((ws ?? []).map(w => [w.id, `${w.first_name} ${w.last_name}`])), sn = new Map((ss ?? []).map(s => [s.id, s.display_name]))
  const line = (r: any) => `    ${nm.get(r.id)} (${sn.get(live.get(r.id)?.school_id) ?? '?'}, ${live.get(r.id)?.weight_class}) WRR ${r.o.hammer_score} → ${r.n.hammer_score} (${r.d > 0 ? '+' : ''}${r.d.toFixed(1)}); postseason part ${r.o.postseason_adjusted} → ${r.n.postseason_adjusted}`
  console.log('  biggest risers:'); ids.slice(0, 10).forEach(r => console.log(line(r)))
  console.log('  biggest fallers:'); ids.slice(-10).reverse().forEach(r => console.log(line(r)))
  const odd = rows.filter(r => r.n.hammer_score > 100 || r.n.hammer_score < 0 || Number.isNaN(r.n.hammer_score))
  console.log(`  out of range (below 0, above 100, missing): ${odd.length}`)
}
