// Girls duals where one wrestler faces two or more different opponents at one weight (pinned list item 1, first
// found 2026-11-02): likely several meets of one day combined into one record. Read-only.
// Writes docs/reviews/girls_duals_multi_opponent.csv (one row per bout of each affected meet).
//   npx tsx --tsconfig tsconfig.json scripts/girls_duals_multi_opponent.mts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const o: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw error; o.push(...data); if (data.length < 1000) break } return o }
const meets = new Map((await all((f, t) => db.from('dual_meets_girls').select('*').order('id').range(f, t))).map((m: any) => [m.id, m]))
const bouts = await all((f, t) => db.from('dual_meet_matches_girls').select('id, dual_meet_id, weight_class, order_index, wrestler_a_id, wrestler_b_id, school_a_id, school_b_id, winner_id, result_type, team1_points, team2_points').order('id').range(f, t))
const ws = new Map((await all((f, t) => db.from('wrestlers').select('id, first_name, last_name').eq('gender', 'F').order('id').range(f, t))).map((w: any) => [w.id, `${w.first_name} ${w.last_name}`]))
const sn = new Map((await all((f, t) => db.from('schools').select('id, display_name').order('id').range(f, t))).map((s: any) => [s.id, s.display_name]))
const byMeet = new Map<string, any[]>(); for (const b of bouts) { const a = byMeet.get(b.dual_meet_id) ?? []; a.push(b); byMeet.set(b.dual_meet_id, a) }
const flagged: any[] = []
for (const [mid, bs] of byMeet) {
  const opp = new Map<string, Set<string>>()   // wrestler@weight → opponents
  for (const b of bs) for (const [me, them] of [[b.wrestler_a_id, b.wrestler_b_id], [b.wrestler_b_id, b.wrestler_a_id]]) {
    if (!me || !them) continue; const k = `${me}@${b.weight_class}`; const s = opp.get(k) ?? new Set(); s.add(them); opp.set(k, s)
  }
  const multi = [...opp].filter(([, s]) => s.size > 1)
  if (multi.length) flagged.push({ m: meets.get(mid), bs, weights: new Set(multi.map(([k]) => k.split('@')[1])) })
}
flagged.sort((a, b) => String(a.m?.meet_date).localeCompare(String(b.m?.meet_date)))
const keys = Object.keys(flagged[0]?.m ?? {})
console.log('dual_meets_girls columns:', keys.join(', '))
const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
const out = ['meet_date,meet,meet_id,weight,flagged_weight,wrestler_a,school_a,wrestler_b,school_b,winner,result,points_a,points_b']
for (const f of flagged) {
  const ta = sn.get(f.m?.team1_id ?? f.m?.school_a_id), tb = sn.get(f.m?.team2_id ?? f.m?.school_b_id)
  for (const b of [...f.bs].sort((x, y) => (x.order_index ?? 0) - (y.order_index ?? 0)))
    out.push([f.m?.meet_date, `${ta} vs ${tb}`, f.m?.id, b.weight_class, f.weights.has(String(b.weight_class)) ? 'yes' : '', ws.get(b.wrestler_a_id) ?? '', sn.get(b.school_a_id), ws.get(b.wrestler_b_id) ?? '', sn.get(b.school_b_id), b.winner_id ? (b.winner_id === b.wrestler_a_id ? 'A' : 'B') : '', b.result_type, b.team1_points, b.team2_points].map(q).join(','))
}
fs.writeFileSync('docs/reviews/girls_duals_multi_opponent.csv', out.join('\n') + '\n')
console.log(`meets flagged ${flagged.length}`)
for (const f of flagged) console.log(`${f.m?.meet_date} ${sn.get(f.m?.team1_id ?? f.m?.school_a_id)} vs ${sn.get(f.m?.team2_id ?? f.m?.school_b_id)}: ${f.bs.length} bouts, weights ${[...f.weights].join('/')}; schools on bouts: ${[...new Set(f.bs.flatMap((b: any) => [sn.get(b.school_a_id), sn.get(b.school_b_id)]))].join(', ')}`)
