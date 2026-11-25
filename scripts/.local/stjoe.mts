import { createClient } from '@supabase/supabase-js'
import { schoolMatcher } from '../../src/lib/historySchools'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const m = await schoolMatcher(db as never)
const names = new Map<string, number>()
for (let f = 0; ; f += 1000) {
  const { data } = await db.from('history_finishes').select('school, region, level').ilike('school', '%jos%').range(f, f + 999)
  for (const r of data ?? []) { const k = `${r.school} | ${r.level} r${r.region ?? '-'}`; names.set(k, (names.get(k) ?? 0) + 1) }
  if ((data ?? []).length < 1000) break
}
for (const [k, n] of [...names].sort()) console.log(n, k, '→', m.idOf(k.split(' | ')[0]))
