import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const s = await db.from('wrestler_hammer_scores').select('wrestler_id, hammer_score, season').in('wrestler_id', ['7c681a47-b07d-407a-9ff5-3ae9c0fcde9d', '84a51f26-499a-47b9-8cad-3e90552b6179'])
console.log(s.error?.message ?? JSON.stringify(s.data))
for (const f of ['lb_rs_refresh', 'lb_ps_refresh']) { const r = await db.rpc(f, { p_gender: 'F', p_season: 2026 }); console.log(f, r.error?.message ?? 'ok') }
console.log('dups left', (await db.from('wrestlers').select('id').in('id', ['5caafa3a-22b7-4c80-b9d6-425af3310f95', 'b80eb800-26f4-4510-9108-d46128ea12a9'])).data?.length)
