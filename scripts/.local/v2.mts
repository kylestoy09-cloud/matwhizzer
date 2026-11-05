import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const { data: ts } = await db.from('tournaments').select('id').eq('gender', 'F').eq('season_id', 2026).eq('tournament_type', 'districts')
const { count } = await db.from('matches').select('id', { count: 'exact', head: true }).in('tournament_id', ts!.map(t => t.id)).in('round', ['3rd_Place', '5th_Place'])
console.log('girls district place bouts', count)
const { data: p } = await anon.rpc('district_placements', { p_district: 1, p_gender: 'F', p_season: 2026 })
const w = (p as any[]).filter(x => x.weight === 120); console.log('D1 120 places:', w.map(x => `${x.place} ${x.wrestler_name} (${x.school_name})`).join(' | '))
const { data: b } = await anon.rpc('district_placements', { p_district: 1, p_gender: 'M', p_season: 2026 }); console.log('boys D1 places max', Math.max(...(b as any[]).map(x => x.place)))
for (const fn of ['lb_ps_refresh']) { const r = await db.rpc(fn, { p_gender: 'F', p_season: 2026 }); console.log(fn, r.error?.message ?? JSON.stringify(r.data)) }
