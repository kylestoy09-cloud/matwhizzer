import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const sql = fs.readFileSync('docs/migrations/20261111_jamborees.sql', 'utf8')
const names = new Map<string, string>()
for (const m of sql.matchAll(/\('([0-9a-f-]{36})', '2025-26', '((?:[^']|'')*)', '([0-9-]+)'/g)) names.set(m[1], `${m[3]}\t${m[2]}`)
const { data: sch } = await db.from('schools').select('id, display_name'); const nm = new Map((sch ?? []).map(s => [s.id, s.display_name]))
for (const m of sql.matchAll(/SET jamboree_id = '([0-9a-f-]{36})' WHERE id IN \(([^)]*)\)/g)) {
  const ids = [...m[2].matchAll(/'([0-9a-f-]{36})'/g)].map(x => x[1])
  const { data } = await db.from('dual_meets_girls').select('team1_school_id,team2_school_id,team1_score,team2_score').in('id', ids)
  const t = new Map<number, { pts: number; w: number; l: number; tie: number }>()
  for (const r of data ?? []) for (const [me, ms, os] of [[r.team1_school_id, r.team1_score, r.team2_score], [r.team2_school_id, r.team2_score, r.team1_score]]) {
    const x = t.get(me) ?? { pts: 0, w: 0, l: 0, tie: 0 }; x.pts += Number(ms); if (ms > os) x.w++; else if (ms < os) x.l++; else x.tie++; t.set(me, x)
  }
  const top = [...t.entries()].sort((a, b) => b[1].pts - a[1].pts).slice(0, 2)
  console.log(`${names.get(m[1])}\tteams ${t.size}\ttop ${nm.get(top[0][0])} ${top[0][1].pts} (${top[0][1].w}-${top[0][1].l}${top[0][1].tie ? '-' + top[0][1].tie : ''})\t2nd ${nm.get(top[1][0])} ${top[1][1].pts}`)
}
