import { createClient } from '@supabase/supabase-js'
import { normName } from '../../src/lib/playoffHistory/people'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const g of ['M', 'F'] as const) {
  const rows: { season_id: number; kind: string; num: number | null; weight: number; place: number | null; name: string }[] = []
  for (let f = 0; ; f += 1000) {
    const { data } = await db.from('playoff_history_entrants').select('season_id, kind, num, weight, place, name').eq('gender', g).in('kind', ['district', 'region']).order('id').range(f, f + 999)
    rows.push(...(data ?? [])); if ((data ?? []).length < 1000) break
  }
  const region = new Map<number, Set<string>>(), regionW = new Map<number, Set<string>>()
  for (const r of rows) if (r.kind === 'region') {
    const n = normName(r.name)
    ;(region.get(r.season_id) ?? region.set(r.season_id, new Set()).get(r.season_id)!).add(n)
    ;(regionW.get(r.season_id) ?? regionW.set(r.season_id, new Set()).get(r.season_id)!).add(`${n}|${r.weight}`)
  }
  const by = new Map<string, { n: number; missing: string[]; offWt: string[] }>()
  for (const r of rows) if (r.kind === 'district' && r.place === 1) {
    const k = `${r.season_id} D${r.num}`; const x = by.get(k) ?? by.set(k, { n: 0, missing: [], offWt: [] }).get(k)!
    x.n++
    const n = normName(r.name)
    if (!region.get(r.season_id)?.has(n)) x.missing.push(`${r.weight} ${r.name}`)
    else if (!regionW.get(r.season_id)?.has(`${n}|${r.weight}`)) x.offWt.push(`${r.weight} ${r.name}`)
  }
  for (const [k, x] of [...by].sort()) if (x.missing.length + x.offWt.length >= 3) console.log(g, k, `champs ${x.n}`, `not at regions ${x.missing.length}`, `other weight ${x.offWt.length}`, '|', [...x.missing, ...x.offWt].slice(0, 4).join('; '))
  console.log(g, 'district files checked', by.size, 'regions seasons', region.size)
}
