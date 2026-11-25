import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const rows: any[] = []
for (let a = 0; ; a += 1000) { const { data } = await db.from('history_finishes').select('id, gender, year, name, school').order('id').range(a, a + 999); rows.push(...data!); if (data!.length < 1000) break }
const odd = rows.filter(r => /^(jr|sr|ii|iii)\b|\b(jr|sr)\.?\s*-|\(|\d/i.test(r.name))
console.log('odd names', odd.length, [...new Set(odd.map(r => r.name))].slice(0, 30))
// name + school groups spanning more than 4 seasons
const norm = (n: string) => n.toLowerCase().replace(/^(jr|sr)\s*-\s*/, '').replace(/,?\s+(jr|sr|ii|iii|iv)\.?$/, '').replace(/[^a-z ]/g, '').trim()
const g = new Map<string, number[]>()
for (const r of rows) { const k = `${r.gender}|${norm(r.name)}|${(r.school ?? '').toLowerCase()}`; g.set(k, [...(g.get(k) ?? []), r.year]) }
const long = [...g].filter(([, ys]) => Math.max(...ys) - Math.min(...ys) > 3)
console.log('name + school spanning more than 4 seasons:', long.length)
for (const [k, ys] of long.slice(0, 25)) console.log('  ', k, [...new Set(ys)].sort().join(' '))
console.log('\nALL odd:'); for (const r of odd) console.log(`  ${r.id}\t${r.year}\t${r.name}\t|\t${r.school ?? ''}`)
