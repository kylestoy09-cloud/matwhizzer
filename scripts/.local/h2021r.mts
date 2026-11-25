import { createClient } from '@supabase/supabase-js'
import { readYear, BOYS_NAMED_REGION } from '../../src/lib/playoffHistory/readFiles'
import { buildBrackets } from '../../src/lib/playoffHistory/brackets'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
const { data } = await db.from('history_finishes').select('id, region, region_name, weight, place, name, school').eq('gender', 'M').eq('year', 2021).eq('level', 'region')
const ours = readYear(2021).events.filter(e => e.kind === 'region').map(e => ({ num: e.num!, br: buildBrackets(e) }))
const vote: Record<string, Record<string, number>> = {}
let match = 0, total = 0; const differ: string[] = []
for (const f of data ?? []) {
  for (const o of ours) { const b = o.br.find(b => b.weight === Number(f.weight)); if (b && [...b.places.values()].some(n => norm(n) === norm(f.name))) { (vote[f.region] ??= {})[BOYS_NAMED_REGION[o.num]] = ((vote[f.region] ??= {})[BOYS_NAMED_REGION[o.num]] ?? 0) + 1 } }
}
console.log('NJWH region number → our super region (votes):', JSON.stringify(vote))
const map: Record<number, number> = {}; for (const [k, v] of Object.entries(vote)) { const best = Object.entries(v).sort((a, b) => b[1] - a[1])[0][0]; map[Number(k)] = Number(Object.entries(BOYS_NAMED_REGION).find(([, n]) => n === best)![0]) }
for (const f of data ?? []) { total++; const o = ours.find(o => o.num === map[f.region]); const b = o?.br.find(b => b.weight === Number(f.weight)); const n = b?.places.get(f.place); if (n && norm(n) === norm(f.name)) match++; else differ.push(`R${f.region} ${f.weight} ${f.place}: NJWH ${f.name} / file ${n ?? '—'}`) }
console.log('rows', total, '| place matches with the mapping', match, '| differ', differ.length); for (const d of differ.slice(0, 10)) console.log('  ', d)
console.log('places NJWH lists per region-weight:', [...new Set((data ?? []).map(f => f.place))].sort().join(','))
