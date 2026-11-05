import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const id of ['5caafa3a-22b7-4c80-b9d6-425af3310f95', 'b80eb800-26f4-4510-9108-d46128ea12a9']) {
  const o = (await db.from('wrestler_match_score_log').select('*', { count: 'exact', head: true }).eq('opponent_wrestler_id', id)).count
  const w = (await db.from('wrestler_match_score_log').select('*', { count: 'exact', head: true }).eq('wrestler_id', id)).count
  console.log(id.slice(0, 8), 'log opponent refs', o, 'own', w)
}
const s = (await db.from('wrestler_hammer_scores').select('wrestler_id, updated_at, hammer_score').eq('gender', 'F').in('wrestler_id', ['7c681a47-b07d-407a-9ff5-3ae9c0fcde9d', '84a51f26-499a-47b9-8cad-3e90552b6179'])).data
console.log(JSON.stringify(s))
const r = await db.rpc('log_admin_activity', { p_admin_email: 'kyle.stoy09@gmail.com', p_action: 'scoring_run', p_entity_type: 'wrestler_hammer_scores', p_entity_id: null, p_details: { gender: 'F', season: '2025-26', note: 'local run after merging 2 girls duplicate profiles (Hightstown, Linden) 2026-11-04' } })
console.log('logged', r.error?.message ?? 'ok')
