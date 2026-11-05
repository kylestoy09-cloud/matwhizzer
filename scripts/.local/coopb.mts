import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const inact = (await db.from('inactive_school_seasons').select('school_id').eq('gender', 'F').eq('season_id', 2026)).data!.map((r: any) => r.school_id)
const meets = (await db.from('dual_meets_girls').select('id').eq('season_id', 2026)).data!.map((m: any) => m.id)
const ist = (await db.from('in_season_tournaments_girls').select('id').eq('season', '2025-26')).data!.map((x: any) => x.id)
for (const id of inact) {
  const d = (await db.from('dual_meets_girls').select('id', { count: 'exact', head: true }).eq('season_id', 2026).or(`team1_school_id.eq.${id},team2_school_id.eq.${id}`)).count
  let dm = 0; for (let i = 0; i < meets.length; i += 300) dm += (await db.from('dual_meet_matches_girls').select('id', { count: 'exact', head: true }).in('dual_meet_id', meets.slice(i, i + 300)).or(`school_a_id.eq.${id},school_b_id.eq.${id}`)).count ?? 0
  const tb = (await db.from('tournament_bouts_girls').select('id', { count: 'exact', head: true }).in('in_season_tournament_id', ist).or(`wrestler1_school_id.eq.${id},wrestler2_school_id.eq.${id}`)).count
  if (d || dm || tb) console.log(`${id} ${names.get(id)} (inactive girls 2025-26): duals ${d}, dual bout sides ${dm}, tournament bout sides ${tb}`)
}
console.log('checked', inact.length, 'inactive girls schools')
