import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const pairs: [string, string, string][] = [['Yuridia', 'Figueroa', 'Figueroa Bravo'], ['Madison', 'Garcia', 'Garcia-Xoloc'], ['Ellis', 'Beaumont-Torres', 'Beaumont-Torres']]
const T: [string, string[]][] = [['tournament_entries', ['wrestler_id']], ['dual_meet_matches_girls', ['wrestler_a_id', 'wrestler_b_id', 'winner_id']], ['tournament_bouts_girls', ['wrestler1_id', 'wrestler2_id']], ['tournament_placements', ['wrestler_id']], ['tournament_bracket_slots', ['top_wrestler_id', 'bottom_wrestler_id', 'winner_wrestler_id']], ['wrestler_name_aliases', ['wrestler_id']], ['wrestler_hammer_scores', ['wrestler_id']], ['wrestler_match_score_log', ['wrestler_id']], ['lb_rs_wrestler', ['wrestler_id']], ['lb_ps_wrestler', ['wrestler_id']]]
for (const [f, shortL, fullL] of pairs) {
  const { data: ws } = await db.from('wrestlers').select('id, first_name, last_name, gender').eq('first_name', f).eq('gender', 'F').in('last_name', [shortL, fullL])
  for (const w of ws!) {
    const parts: string[] = []
    for (const [t, cols] of T) { let n = 0; for (const c of cols) { const { count, error } = await db.from(t).select('*', { count: 'exact', head: true }).eq(c, w.id); if (error) { parts.push(`${t}: ${error.message}`); continue } n += count ?? 0 } if (n) parts.push(`${t} ${n}`) }
    console.log(`${w.first_name} ${w.last_name} ${w.id.slice(0, 8)}: ${parts.join(', ')}`)
  }
}
