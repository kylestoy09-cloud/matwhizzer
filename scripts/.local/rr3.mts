import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const one = await db.from('wrestler_match_score_log').select('*').limit(1); console.log('cols:', one.error?.message ?? Object.keys(one.data![0]).join(','))
for (const id of ['ce3511b1-94fe-4ae9-81e4-88513db19185']) {
  const r = await db.from('wrestler_match_score_log').select('*').eq('wrestler_id', id).eq('season', '2025-26'); if (r.error) { console.log(r.error.message); continue }
  const k = Object.keys(r.data![0] ?? {}).find(c => /type|source|kind|context/.test(c))
  const by: Record<string, number> = {}; for (const x of r.data!) by[String(x[k!])] = (by[String(x[k!])] ?? 0) + 1
  console.log('Ryan Kim 2025-26 rated bouts', r.data!.length, 'by', k, JSON.stringify(by))
}
