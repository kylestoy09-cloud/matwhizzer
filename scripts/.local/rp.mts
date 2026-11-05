import { createClient } from '@supabase/supabase-js'
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
for (const r of ['1', '2', '3', '4']) { const { data } = await anon.rpc('girls_region_placements', { p_region: r, p_season: 2026 }); const d = data as any[]; console.log(`Region ${r}: ${d.length} placers, max place ${Math.max(...d.map(x => x.place))}`) }
const { data } = await anon.rpc('girls_region_placements', { p_region: '1', p_season: 2026 }); console.log('R1 120:', (data as any[]).filter(x => x.weight === 120).map(x => `${x.place} ${x.wrestler_name}`).join(' | '))
