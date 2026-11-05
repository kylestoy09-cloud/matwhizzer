import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = ['East Orange', 'Hackensack', 'Hammonton', 'Indian Hills', 'Keansburg', 'Toms River East']
const sch = (await db.from('schools').select('id, display_name').in('display_name', names)).data!
const ist = (await db.from('in_season_tournaments_girls').select('id').eq('season', '2025-26')).data!.map((x: any) => x.id)
for (const s of sch) {
  const ro = (await db.from('roster_grade_import').select('status').eq('school_id', s.id).eq('gender', 'F').eq('season_id', 2026)).data ?? []
  const du = (await db.from('dual_meets_girls').select('id', { count: 'exact', head: true }).eq('season_id', 2026).or(`team1_school_id.eq.${s.id},team2_school_id.eq.${s.id}`)).count
  const tb = (await db.from('tournament_bouts_girls').select('id', { count: 'exact', head: true }).in('in_season_tournament_id', ist).or(`wrestler1_school_id.eq.${s.id},wrestler2_school_id.eq.${s.id}`)).count
  const pp = (await db.from('power_points').select('overall_wins, overall_losses, pp_group').eq('school_id', s.id).eq('gender', 'F').eq('season_id', 2026)).data
  const added = ['Hammonton', 'Indian Hills', 'Keansburg', 'Toms River East'].includes(s.display_name)
  console.log(`${s.id} ${s.display_name}${added ? ' [added today]' : ''}: Track roster rows ${ro.length} | 2025-26 duals ${du} | 2025-26 tournament bouts ${tb} | PP ${JSON.stringify(pp)}`)
}
