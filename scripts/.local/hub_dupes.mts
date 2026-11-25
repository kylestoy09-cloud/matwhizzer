import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const g of ['boys', 'girls', 'mixed']) {
  const ps: any[] = []
  for (let f = 0; ; f += 1000) { const { data } = await db.from(`${g}_prospects`).select('id, first_name, last_name, state, wrestler_id').order('id').range(f, f + 999); ps.push(...(data ?? [])); if ((data ?? []).length < 1000) break }
  const byW = new Map<string, number>(); for (const p of ps) if (p.wrestler_id) byW.set(p.wrestler_id, (byW.get(p.wrestler_id) ?? 0) + 1)
  const byName = new Map<string, number>(); for (const p of ps) { const k = `${p.first_name} ${p.last_name}|${p.state}`.toLowerCase(); byName.set(k, (byName.get(k) ?? 0) + 1) }
  const { count } = await db.from(`${g}_hub_placements`).select('*', { count: 'exact', head: true })
  console.log(`${g}: prospects ${ps.length} (linked to HS ${byW.size}) | wrestlers with 2+ prospects ${[...byW.values()].filter(v => v > 1).length} | same name+state twice ${[...byName].filter(([, v]) => v > 1).map(([k]) => k).slice(0, 8).join(', ') || 'none'} | placements ${count}`)
}
