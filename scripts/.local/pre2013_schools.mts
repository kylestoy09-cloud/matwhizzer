import { createClient } from '@supabase/supabase-js'
import { schoolMatcher, historyFinishSchools } from '../../src/lib/historySchools'
import { sameLastName } from '../../src/lib/trophyRows'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const fin: any[] = []
for (let f = 0; ; f += 1000) { const { data } = await db.from('history_finishes').select('id, year, level, region, weight, place, name, school').eq('gender', 'M').eq('source', 'njwh').order('id').range(f, f + 999); fin.push(...data!); if (data!.length < 1000) break }
const ids = historyFinishSchools(fin, await schoolMatcher(db as never), sameLastName)
const c = new Map<string, { n: number; min: number; max: number }>()
fin.forEach((f, i) => { if (ids[i] != null || f.year > 2012 || !(f.level === 'state' || f.place === 1)) return; const k = f.school ?? '(blank)'; const cur = c.get(k) ?? { n: 0, min: 9999, max: 0 }; cur.n++; cur.min = Math.min(cur.min, f.year); cur.max = Math.max(cur.max, f.year); c.set(k, cur) })
console.log(c.size, 'names')
for (const [k, v] of [...c].sort((a, b) => a[0].localeCompare(b[0]))) console.log(`${k} | ${v.n} | ${v.min}-${v.max}`)
