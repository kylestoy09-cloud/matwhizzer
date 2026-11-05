import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data } = await db.from('wrestler_hammer_scores').select('last_calculated_at').eq('season', '2025-26').eq('gender', 'F').order('last_calculated_at', { ascending: false }).limit(1)
const { count } = await db.from('wrestler_hammer_scores').select('wrestler_id', { count: 'exact', head: true }).eq('season', '2025-26').eq('gender', 'F')
console.log('girls 2025-26 ratings', count, 'last written', data?.[0]?.last_calculated_at)
await db.rpc('log_admin_activity', { p_admin_email: 'script', p_action: 'scoring_run', p_entity_type: 'wrestler_hammer_scores', p_entity_id: null, p_details: { wrestlers_scored: count, season: '2025-26', gender: 'F', note: 'local run after removing 117 duplicate girls district bouts' } })
for (const fn of ['lb_rs_refresh', 'lb_ps_refresh']) { const { data: d, error } = await db.rpc(fn, { p_gender: 'F', p_season: 2026 }); console.log(fn, error?.message ?? JSON.stringify(d)) }
