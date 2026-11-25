import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const S = process.argv[2]
const A = JSON.parse(readFileSync(`${S}/wrr_final.json`, 'utf8')), B = JSON.parse(readFileSync(`${S}/wrr_aging.json`, 'utf8'))
for (const g of ['M', 'F']) {
  const a = new Map(A[g].map((r: any) => [r.wrestler_id, r]))
  const d = B[g].map((r: any) => ({ r, o: a.get(r.wrestler_id) as any })).filter((x: any) => x.r.tournament_score < x.o.tournament_score - 0.005)
  // rank among top 10 per weight before/after
  const live = new Map<string, any>()
  for (let f = 0; ; f += 1000) { const { data } = await db.from('wrestler_hammer_scores').select('wrestler_id, weight_class').eq('season', '2025-26').eq('gender', g).order('wrestler_id').range(f, f + 999); for (const x of data ?? []) live.set(x.wrestler_id, x.weight_class); if ((data ?? []).length < 1000) break }
  const byW = new Map<string, any[]>()
  for (const r of B[g]) { const w = live.get(r.wrestler_id); if (w) byW.set(w, [...(byW.get(w) ?? []), r]) }
  let enter = 0, moved = 0
  for (const list of byW.values()) {
    const o = [...list].sort((x, y) => (a.get(y.wrestler_id) as any).hammer_score - (a.get(x.wrestler_id) as any).hammer_score).slice(0, 10).map(x => x.wrestler_id)
    const n = [...list].sort((x, y) => y.hammer_score - x.hammer_score).slice(0, 10).map(x => x.wrestler_id)
    enter += n.filter(id => !o.includes(id)).length; moved += n.filter((id, i) => o.includes(id) && o.indexOf(id) !== i).length
  }
  const top = d.sort((x: any, y: any) => (x.r.hammer_score - x.o.hammer_score) - (y.r.hammer_score - y.o.hammer_score)).slice(0, 5)
  const { data: ws } = await db.from('wrestlers').select('id, first_name, last_name').in('id', top.map((x: any) => x.r.wrestler_id))
  const nm = new Map((ws ?? []).map(w => [w.id, `${w.first_name} ${w.last_name}`]))
  console.log(`${g}: top 10 per weight — ${enter} new names in, ${moved} reordered`)
  for (const x of top) console.log(`  ${nm.get(x.r.wrestler_id)} (${live.get(x.r.wrestler_id)}): ${x.r.match_count} matches; tournament part ${x.o.tournament_score} → ${x.r.tournament_score}; WRR ${x.o.hammer_score} → ${x.r.hammer_score}`)
}
