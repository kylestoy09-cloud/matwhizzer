import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const { data } = await db.from('matches').select('round').eq('tournament_id', 181); const c: any = {}; data!.forEach(m => c[m.round] = (c[m.round] ?? 0) + 1); console.log('Region 1 rounds', JSON.stringify(c))
const { data: p } = await anon.rpc('girls_region_placements', { p_region: '1', p_season: 2026 })
console.log('Region 1 placements rows', (p as any[]).length, '| 120:', (p as any[]).filter(x => x.weight === 120).map(x => `${x.place} ${x.wrestler_name} (${x.school_name})`).join(' | '))
