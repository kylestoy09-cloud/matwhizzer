import { createClient } from '@supabase/supabase-js'
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
for (const t of ['tournament_bouts', 'tournament_bouts_girls']) {
  const r = await a.from(t).select('id, w1:wrestlers!wrestler1_id(first_name, last_name), w2:wrestlers!wrestler2_id(first_name, last_name), s:schools!wrestler1_school_id(id, logo_url, header_background)').limit(1)
  console.log(t, r.error?.message ?? 'ok')
}
const p = await a.from('tournament_placements').select('wrestler:wrestlers!wrestler_id(first_name, last_name), school:schools!school_id(id, logo_url)').limit(1); console.log('placements', p.error?.message ?? 'ok')
const s = await a.from('in_season_tournament_team_scores').select('school:schools!school_id(id, logo_url, header_background)').limit(1); console.log('team scores', s.error?.message ?? 'ok')
