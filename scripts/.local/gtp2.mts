import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log('dual_meets_girls cols', Object.keys((await db.from('dual_meets_girls').select('*').limit(1)).data![0]).join(','))
const p = await db.from('dual_meets_girls').select('id, season_id, meet_date, is_playoff', { count: 'exact' }).eq('is_playoff', true)
console.log('girls playoff duals', p.count, p.error?.message ?? '', JSON.stringify(p.data?.slice(0, 3)))
const late = await db.from('dual_meets_girls').select('season_id, meet_date', { count: 'exact' }).gte('meet_date', '2026-02-01').lte('meet_date', '2026-03-15')
console.log('girls duals Feb-mid Mar 2026', late.count, [...new Set((late.data ?? []).map((r: any) => r.meet_date))].sort().join(' '))
const t = await db.from('tournaments').select('name, tournament_type, season_id').eq('gender', 'F')
console.log('girls tournaments', JSON.stringify([...new Set((t.data ?? []).map((r: any) => `${r.season_id} ${r.tournament_type}`))]))
