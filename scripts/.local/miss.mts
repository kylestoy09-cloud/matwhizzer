import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const norm = (s: string) => s.toLowerCase().replace(/,\s*(fr|so|jr|sr)$/i, '').replace(/[^a-z]/g, '')
const lastN = (s: string) => s.toLowerCase().replace(/,\s*(fr|so|jr|sr)$/i, '').trim().split(/\s+/).slice(-1)[0].replace(/[^a-z]/g, '')
let notLast = 0
for (const [g, y] of [['F', 2021], ['F', 2019], ['F', 2022], ['M', 2015], ['M', 2022], ['M', 2016], ['M', 2017]] as const) {
  const { data: hf } = await db.from('history_finishes').select('weight, place, name').eq('gender', g).eq('year', y).eq('level', 'state').limit(2000)
  const { data: sp } = await db.rpc('state_placements', { p_season: y, p_gender: g })
  const hw = (w: string) => (/^hwt$/i.test(w) ? 285 : Number(w))
  for (const f of hf ?? []) {
    const o = (sp ?? []).find((x: any) => Number(x.weight) === hw(f.weight) && x.place === f.place)
    if (o && norm(o.wrestler_name) === norm(f.name)) continue
    const sameLast = o && lastN(o.wrestler_name) === lastN(f.name)
    if (!sameLast) notLast++
    if (!sameLast || g === 'F') console.log(`${g} ${y} ${f.weight} #${f.place}: history "${f.name}" / page "${o?.wrestler_name ?? '—'}"${sameLast ? '' : '   <-- check'}`)
  }
}
console.log('different last name (worth a look):', notLast)
