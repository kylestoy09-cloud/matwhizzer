import { createClient } from '@supabase/supabase-js'
import { loadSeason } from '../../src/lib/playoffHistory/load'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const norm = (s: string) => s.toLowerCase().replace(/,\s*(fr|so|jr|sr)$/i, '').replace(/[^a-z]/g, '')
const jobs: ['M' | 'F', number][] = [...[2019, 2020, 2021, 2022, 2023].map(y => ['F', y] as ['F', number]), ...Array.from({ length: 12 }, (_, i) => ['M', 2013 + i] as ['M', number])]
for (const [g, y] of jobs) {
  const t = Date.now()
  try {
    const r = await loadSeason(db as never, g, y, 'claude (Kyle 2026-11-14: load all, hidden)')
    const { data: hf } = await db.from('history_finishes').select('weight, place, name').eq('gender', g).eq('year', y).eq('level', 'state').limit(2000)
    const { data: sp } = await db.rpc('state_placements', { p_season: y, p_gender: g })
    const hw = (w: string) => (/^hwt$/i.test(w) ? 285 : Number(w))
    let ok = 0; for (const f of hf ?? []) if ((sp ?? []).some((o: any) => Number(o.weight) === hw(f.weight) && o.place === f.place && norm(o.wrestler_name ?? '') === norm(f.name))) ok++
    console.log(`${g} ${y}: ${r.tournaments} events, ${r.entries} entries, ${r.matches} bouts (skipped ${r.skipped_bouts}), weights added ${JSON.stringify(r.weight_classes_added)}, co-op names ${r.coop_names} | state placers vs history ${ok}/${hf?.length} | ${Math.round((Date.now() - t) / 1000)}s`)
  } catch (e) { console.log(`${g} ${y}: FAILED ${(e as Error).message}`) }
}
