import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log(JSON.stringify((await db.from('roster_grade_import').select('first_name_raw, grade, wrestler_id').in('id', ['9e9122f1-1b54-4757-8f5c-3e25b1a35565', '33832bad-9715-452f-b3c2-c5a4a6ea0b1d', 'a4fb4e53-7dfc-4ce2-831b-e50733ee5f3b'])).data))
const s = (await db.from('wrestler_hammer_scores').select('wrestler_id, hammer_score').in('wrestler_id', ['6da4fa41-1ad3-4668-8c80-ef7fbe207ad3', '59b0f8c5-1ad9-4390-ab3e-e720b3130a63', '63f2f295-c752-4317-8f52-4456328bd1db', 'af9d4501-4668-4626-9cc4-427ce1d86a84'])).data
console.log('rated', s?.length)
for (const f of ['lb_rs_refresh', 'lb_ps_refresh']) { const r = await db.rpc(f, { p_gender: 'F', p_season: 2026 }); console.log(f, r.error?.message ?? 'ok') }
const r = await db.rpc('log_admin_activity', { p_admin_email: 'kyle.stoy09@gmail.com', p_action: 'scoring_run', p_entity_type: 'wrestler_hammer_scores', p_entity_id: null, p_details: { gender: 'F', season: '2025-26', note: 'local run after merging 4 girls duplicate profiles (North Hunterdon, North Star Academy, Nutley x2) 2026-11-04' } })
console.log('logged', r.error?.message ?? 'ok')
