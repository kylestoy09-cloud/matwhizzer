import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const c: Record<string, number> = {}
for (let f = 0; ; f += 1000) {
  const { data } = await db.from('matches').select('win_type').order('id').range(f, f + 999)
  for (const r of data ?? []) c[String(r.win_type)] = (c[String(r.win_type)] ?? 0) + 1
  if ((data ?? []).length < 1000) break
}
console.log(c)
