import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const { data: b } = await db.rpc('girls_region_bracket', { p_region: '1', p_weight: 120, p_season: 2026 })
console.log((b as any[]).map(r => `${r.round}/${r.bracket_side}`).join(' '))
for (const r of ['1','2','3','4']) { const { data, error } = await db.rpc('girls_region_placements', { p_region: r, p_season: 2026 }); console.log(r, error?.message, (data as any[])?.length) }
const { data: t } = await db.from('tournaments').select('id,name,season_id,gender').ilike('name', 'Girl_s Regions%').eq('season_id', 2026); console.log(t)
