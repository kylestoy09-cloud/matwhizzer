import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const tours = new Map(((await db.from('tournaments').select('id, season_id, gender, tournament_type').limit(5000)).data ?? []).map(t => [t.id, t]))
const c = new Map<string, number>()
for (let f = 0; ; f += 1000) {
  const { data } = await db.from('placements').select('tournament_id').range(f, f + 999)
  for (const r of data ?? []) { const t = tours.get(r.tournament_id); const k = t ? `${t.gender} ${t.season_id} ${t.tournament_type}` : '?'; c.set(k, (c.get(k) ?? 0) + 1) }
  if ((data ?? []).length < 1000) break
}
for (const [k, v] of [...c].sort()) console.log(k, v)
