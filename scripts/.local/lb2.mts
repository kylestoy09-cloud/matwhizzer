import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const f of ['lb_rs_refresh', 'lb_ps_refresh']) { const r = await db.rpc(f, { p_gender: 'M', p_season: 2026 }); console.log(f, r.error?.message ?? 'ok') }
for (const s of ['2025-26 (archive)', '2026-27']) await db.rpc('log_admin_activity', { p_admin_email: 'kyle.stoy09@gmail.com', p_action: 'scoring_run', p_entity_type: 'wrestler_hammer_scores', p_entity_id: null, p_details: { gender: 'M', season: s, note: 'local run after restoring 10 lost district bouts and the nickname-name merges 2026-11-05' } })
