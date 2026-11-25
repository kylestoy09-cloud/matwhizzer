import { createClient } from '@supabase/supabase-js'
import { schoolMatcher } from '../../src/lib/historySchools'
import { schoolMatcher as oldMatcher } from './historySchools_old'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const [a, b] = [await oldMatcher(db as never), await schoolMatcher(db as never)]
const names = new Map<string, number>()
for (const [t, col] of [['history_finishes', 'school'], ['history_team_titles', 'champion'], ['playoff_history_schools', 'raw_name']]) for (let f = 0; ; f += 1000) {
  const { data } = await db.from(t).select(col).range(f, f + 999)
  for (const r of (data ?? []) as Record<string, string>[]) names.set(r[col], (names.get(r[col]) ?? 0) + 1)
  if ((data ?? []).length < 1000) break
}
const nm = (id: number | null) => id == null ? '—' : `${id} ${b.school.get(id)?.display_name}`
for (const [k, c] of [...names].sort()) {
  if (a.idOf(k) !== b.idOf(k)) console.log('idOf    ', c, JSON.stringify(k), nm(a.idOf(k)), '→', nm(b.idOf(k)))
  if (a.idOfStrict(k) !== b.idOfStrict(k)) console.log('strict  ', c, JSON.stringify(k), nm(a.idOfStrict(k)), '→', nm(b.idOfStrict(k)))
}
