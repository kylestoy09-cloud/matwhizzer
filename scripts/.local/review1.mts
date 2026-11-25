import { createClient } from '@supabase/supabase-js'
import { buildOffseasonBoard } from '../../src/lib/offseasonPublic'
import { schoolMatcher } from '../../src/lib/historySchools'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
// 1. one wrestler on two prospects → duplicate board rows
for (const g of ['M', 'F'] as const) {
  const b = (await buildOffseasonBoard(g))!
  const ids = b.entries.map(e => e.wrestler_id)
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i)
  console.log(g, 'board entries', ids.length, '| duplicate wrestlers', dup.length, dup.slice(0, 5).map(id => b.entries.find(e => e.wrestler_id === id)!.name), '| cache size', Math.round(JSON.stringify(b).length / 1024), 'KB')
  // linked opponents shown by prospect name instead of profile name?
  const linked = b.entries.flatMap(e => e.notable).length
  console.log('   notables', linked)
}
// 2. trophy index size (unstable_cache items over 2 MB aren't cached)
const m = await schoolMatcher(db as any)
let fin = 0, bytes = 0
for (let f = 0; ; f += 1000) { const { data } = await db.from('history_finishes').select('year, level, region, region_name, weight, place, tie, name, school, source').eq('gender', 'M').order('id').range(f, f + 999); for (const x of data ?? []) if (m.idOf(x.school) != null && (x.level === 'state' || x.place === 1)) { fin++; bytes += JSON.stringify({ year: x.year, name: x.name, weight: x.weight, level: x.level, place: x.place, tie: x.tie, region: x.region_name }).length } if ((data ?? []).length < 1000) break }
console.log('trophy boys individual rows', fin, '≈', Math.round(bytes / 1024), 'KB')
// 3. roster rows with a wrestler: statuses
const st: Record<string, number> = {}
for (let f = 0; ; f += 1000) { const { data } = await db.from('roster_grade_import').select('status, season_id').not('wrestler_id', 'is', null).order('id').range(f, f + 999); for (const r of data ?? []) st[`${r.season_id} ${r.status}`] = (st[`${r.season_id} ${r.status}`] ?? 0) + 1; if ((data ?? []).length < 1000) break }
console.log('roster rows with a wrestler, by season/status', st)
// 4. how many multi-school wrestlers hit the bout lookup
const ids: string[] = []
for (const t of ['boys_prospects', 'girls_prospects', 'mixed_prospects']) { const { data } = await db.from(t).select('wrestler_id').not('wrestler_id', 'is', null).limit(5000); ids.push(...(data ?? []).map(r => r.wrestler_id)) }
const u = [...new Set(ids)]; const sch = new Map<string, Set<number>>()
for (let i = 0; i < u.length; i += 300) { const { data } = await db.from('wrestler_name_aliases').select('wrestler_id, school_id').in('wrestler_id', u.slice(i, i + 300)); for (const r of data ?? []) if (r.school_id) (sch.get(r.wrestler_id) ?? sch.set(r.wrestler_id, new Set()).get(r.wrestler_id)!).add(r.school_id) }
console.log('hub wrestlers linked at 2+ schools', [...sch.values()].filter(s => s.size > 1).length)
