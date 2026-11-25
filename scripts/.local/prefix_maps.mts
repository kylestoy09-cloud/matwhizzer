import { createClient } from '@supabase/supabase-js'
import { schoolMatcher } from '../../src/lib/historySchools'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const m = await schoolMatcher(db as never)
const names = new Map<string, number>()
for (const t of ['history_finishes', 'history_team_titles']) for (let f = 0; ; f += 1000) {
  const col = t === 'history_finishes' ? 'school' : 'champion'
  const { data } = await db.from(t).select(col).order('id').range(f, f + 999)
  for (const r of (data ?? []) as Record<string, string>[]) names.set(r[col], (names.get(r[col]) ?? 0) + 1)
  if ((data ?? []).length < 1000) break
}
let n = 0, rows = 0, unm = 0, unmRows = 0
for (const [k, c] of [...names].sort()) {
  const loose = m.idOf(k), strict = m.idOfStrict(k)
  if (loose == null) { unm++; unmRows += c; continue }
  if (strict == null) { n++; rows += c; console.log(c, JSON.stringify(k), '→', loose, m.school.get(loose)?.display_name) }
}
console.log('prefix-only names', n, 'rows', rows, '| unmatched names', unm, 'rows', unmRows)
