import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const kept = ['4e65e291-6883-44dd-912a-1cd8e11d8409', '39a811d5-2995-47bc-a36c-8a70970fa59e', '5e965f4c-31fd-40dd-8ae3-21208a4ff289', 'c33f3293-7b2b-4b9c-970b-b92cab9c89d0']
console.log('rated', (await db.from('wrestler_hammer_scores').select('wrestler_id').in('wrestler_id', kept)).data?.length, '| Walpola', JSON.stringify((await db.from('wrestlers').select('first_name, last_name, grade').eq('id', kept[1])).data), '| roster', JSON.stringify((await db.from('roster_grade_import').select('first_name_raw, last_name_raw').eq('wrestler_id', kept[1])).data))
for (const f of ['lb_rs_refresh', 'lb_ps_refresh']) { const r = await db.rpc(f, { p_gender: 'F', p_season: 2026 }); console.log(f, r.error?.message ?? 'ok') }
const r = await db.rpc('log_admin_activity', { p_admin_email: 'kyle.stoy09@gmail.com', p_action: 'scoring_run', p_entity_type: 'wrestler_hammer_scores', p_entity_id: null, p_details: { gender: 'F', season: '2025-26', note: "local run after merging 4 girls duplicate profiles (St. Benedict's, Toms River South, Union, West Deptford) 2026-11-04" } })
console.log('logged', r.error?.message ?? 'ok')
