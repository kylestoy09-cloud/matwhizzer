import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const L = 'd1421eca-fdc4-45c5-bccd-8d33e4d87c29', C = 'a970435d-63f3-4ea5-99cc-8a6b73a7eff7'
console.log('Lily rated rows:', (await db.from('wrestler_hammer_scores').select('*', { count: 'exact', head: true }).eq('wrestler_id', L)).count, '| lb rows:', (await db.from('lb_rs_wrestler').select('*', { count: 'exact', head: true }).eq('wrestler_id', L)).count)
console.log('Cristy rating:', JSON.stringify((await db.from('wrestler_hammer_scores').select('hammer_score').eq('wrestler_id', C)).data))
for (const f of ['lb_rs_refresh', 'lb_ps_refresh']) { const r = await db.rpc(f, { p_gender: 'F', p_season: 2026 }); console.log(f, r.error?.message ?? 'ok') }
console.log('Lily lb rows after refresh:', (await db.from('lb_rs_wrestler').select('*', { count: 'exact', head: true }).eq('wrestler_id', L)).count, (await db.from('lb_ps_wrestler').select('*', { count: 'exact', head: true }).eq('wrestler_id', L)).count)
const r = await db.rpc('log_admin_activity', { p_admin_email: 'kyle.stoy09@gmail.com', p_action: 'scoring_run', p_entity_type: 'wrestler_hammer_scores', p_entity_id: null, p_details: { gender: 'F', season: '2025-26', note: 'local run after Lily Oh → Riverside, VA (OOS) and Liz → Cristy Mejia merge 2026-11-04' } })
console.log('logged', r.error?.message ?? 'ok')
