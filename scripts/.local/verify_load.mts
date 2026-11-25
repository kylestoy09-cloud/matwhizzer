import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const y = Number(process.argv[2])
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
const { data: hf } = await db.from('history_finishes').select('level, region_name, weight, place, name').eq('gender', 'F').eq('year', y).limit(2000)
let ok = 0, n = 0; const bad: string[] = []
const { data: sp, error } = await db.rpc('state_placements', { p_season: y, p_gender: 'F' })
if (error) console.log('state_placements:', error.message)
for (const f of (hf ?? []).filter(f => f.level === 'state')) { n++; const o = (sp ?? []).find((r: any) => Number(r.weight) === Number(f.weight) && r.place === f.place); if (o && norm((o.wrestler_name ?? o.name ?? '').replace(/,\s*(Fr|So|Jr|Sr)$/, '')) === norm(f.name)) ok++; else if (bad.length < 4) bad.push(`${f.weight} ${f.place} ${f.name} / ${JSON.stringify(o)?.slice(0, 120)}`) }
console.log(`state placements via state_placements(): ${ok}/${n} match`, bad)
for (const r of ['1', '2', '3', '4']) {
  const { data: b, error: e } = await db.rpc('girls_region_bracket', { p_region: r, p_weight: 120, p_season: y })
  console.log(`girls_region_bracket r${r} 120:`, e ? e.message : `${b?.length} bouts, final: ${(b ?? []).filter((m: any) => m.round === 'F').map((m: any) => `${m.winner_name} (${m.winner_school}) over ${m.loser_name}`).join('')}`)
}
