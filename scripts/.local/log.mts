import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const [g, archive] of [['M', true], ['F', false]] as const) {
  const { count } = await db.from('wrestler_hammer_scores').select('wrestler_id', { count: 'exact', head: true }).eq('season', '2025-26').eq('gender', g)
  const { data: last } = await db.from('wrestler_hammer_scores').select('last_calculated_at').eq('season', '2025-26').eq('gender', g).order('last_calculated_at', { ascending: false }).limit(1)
  console.log(g, count, last)
  const { error } = await db.rpc('log_admin_activity', { p_admin_email: 'script', p_action: 'scoring_run', p_entity_type: 'wrestler_hammer_scores', p_entity_id: null, p_details: { wrestlers_scored: count, season: '2025-26', gender: g, archive, note: 'local run after resolve_unlinked_bouts (activity log step needs a request scope)' } })
  if (error) console.log(error.message)
}
