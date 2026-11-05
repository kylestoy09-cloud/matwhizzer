import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const s = await db.from('wrestler_hammer_scores').select('wrestler_id, hammer_score').in('wrestler_id', ['60c28b30-e1ed-4c47-9dcb-89f7936a2d01', '5fed1f4b-763f-4edd-9db9-635fc8669a21'])
console.log(s.error?.message ?? JSON.stringify(s.data))
for (const f of ['lb_rs_refresh', 'lb_ps_refresh']) { const r = await db.rpc(f, { p_gender: 'F', p_season: 2026 }); console.log(f, r.error?.message ?? 'ok') }
const r = await db.rpc('log_admin_activity', { p_admin_email: 'kyle.stoy09@gmail.com', p_action: 'scoring_run', p_entity_type: 'wrestler_hammer_scores', p_entity_id: null, p_details: { gender: 'F', season: '2025-26', note: 'local run after merging 2 Manasquan girls duplicate profiles 2026-11-04' } })
console.log('logged', r.error?.message ?? 'ok')
