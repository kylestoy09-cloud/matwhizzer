// any group of "same" decisions that would pull in two different existing profiles
import { createClient } from '@supabase/supabase-js'
import { normName } from '../../src/lib/playoffHistory/people'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const g of ['M', 'F']) {
  const { data } = await db.from('playoff_history_joins').select('a_season, a_name, a_school, b_season, b_name, b_school, b_wrestler_id').eq('gender', g).eq('decision', 'same').limit(5000)
  const parent = new Map<string, string>(); const find = (x: string): string => { const p = parent.get(x) ?? x; if (p === x) return x; const r = find(p); parent.set(x, r); return r }
  const key = (s: number, n: string, sc: number | null) => `${s}|${normName(n)}|${sc}`
  for (const j of data ?? []) { const a = key(j.a_season, j.a_name, j.a_school), b = j.b_wrestler_id ? `P|${j.b_wrestler_id}` : key(j.b_season, j.b_name, j.b_school); parent.set(find(b), find(a)) }
  const profilesBy = new Map<string, Set<string>>()
  for (const j of data ?? []) if (j.b_wrestler_id) { const r = find(key(j.a_season, j.a_name, j.a_school)); (profilesBy.get(r) ?? profilesBy.set(r, new Set()).get(r)!).add(j.b_wrestler_id) }
  const multi = [...profilesBy].filter(([, s]) => s.size > 1)
  console.log(g, '| same decisions', data?.length, '| groups reaching two existing profiles', multi.length, multi.slice(0, 5).map(([r, s]) => `${r} → ${[...s].join(', ')}`))
}
