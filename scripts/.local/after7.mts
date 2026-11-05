import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const f of ['lb_rs_refresh', 'lb_ps_refresh']) { const r = await db.rpc(f, { p_gender: 'F', p_season: 2026 }); console.log(f, r.error?.message ?? 'ok') }
const r = await db.rpc('log_admin_activity', { p_admin_email: 'kyle.stoy09@gmail.com', p_action: 'scoring_run', p_entity_type: 'wrestler_hammer_scores', p_entity_id: null, p_details: { gender: 'F', season: '2025-26', note: 'local run after removing the girls Gabriel Grant profile 2026-11-04' } })
console.log('logged', r.error?.message ?? 'ok')
