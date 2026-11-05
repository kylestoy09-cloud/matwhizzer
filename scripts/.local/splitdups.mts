import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const out: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw new Error(error.message); out.push(...data); if (data.length < 1000) break } return out }
const ws = await all((f, t) => db.from('wrestlers').select('id, first_name, last_name, gender, is_oos').order('id').range(f, t))
const key = (w: any) => `${w.gender}|${`${w.first_name ?? ''}${w.last_name ?? ''}`.toLowerCase().replace(/[^a-z]/g, '')}`
const by = new Map<string, any[]>()
for (const w of ws) { if (w.first_name === 'Unknown') continue; const k = key(w); (by.get(k) ?? by.set(k, []).get(k)!).push(w) }
const groups = [...by.values()].filter(g => g.length > 1)
const splitDiff = groups.filter(g => new Set(g.map(w => `${w.first_name}|${w.last_name}`.toLowerCase())).size > 1)
for (const g of ['F', 'M']) {
  const gg = splitDiff.filter(x => x[0].gender === g)
  console.log(`${g}: ${gg.length} groups with the same full name split differently (${gg.reduce((n, x) => n + x.length, 0)} profiles)`)
  console.log('   e.g.', gg.slice(0, 10).map(x => x.map((w: any) => `"${w.first_name}|${w.last_name}"`).join(' = ')).join('; '))
}
