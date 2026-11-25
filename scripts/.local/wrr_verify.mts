import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const dry = JSON.parse(readFileSync(process.argv[2], 'utf8'))
for (const g of ['M', 'F']) {
  const live = new Map<string, number>()
  for (let f = 0; ; f += 1000) { const { data } = await db.from('wrestler_hammer_scores').select('wrestler_id, hammer_score').eq('season', '2025-26').eq('gender', g).order('wrestler_id').range(f, f + 999); for (const r of data ?? []) live.set(r.wrestler_id, Number(r.hammer_score)); if ((data ?? []).length < 1000) break }
  const off = dry[g].filter((r: any) => Math.abs((live.get(r.wrestler_id) ?? -999) - r.hammer_score) > 0.011).length
  const { count } = await db.from('wrestler_rating_carry').select('*', { count: 'exact', head: true }).eq('season', '2025-26').eq('gender', g)
  console.log(g, 'saved ratings', live.size, '| differ from dry run:', off, '| carry rows:', count)
}
