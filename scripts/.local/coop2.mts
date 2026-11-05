import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const c = async (q: any, w: string) => { const r = await q; if (r.error) return `${w}: ERR ${r.error.message}`; return r.count }
const tours = (await db.from('tournaments').select('id, season_id, gender')).data!
const ist = (await db.from('in_season_tournaments_girls').select('id, season')).data!
for (const id of [87, 64, 56, 78]) {
  const out: Record<string, any> = {}
  for (const s of [2025, 2026]) {
    const lab = s === 2026 ? '2025-26' : '2024-25'
    const gt = tours.filter(t => t.gender === 'F' && t.season_id === s).map(t => t.id)
    const gi = ist.filter(x => x.season === lab).map(x => x.id)
    out[`${s} entries`] = await c(db.from('tournament_entries').select('id', { count: 'exact', head: true }).eq('school_id', id).in('tournament_id', gt), 'e')
    out[`${s} team totals`] = await c(db.from('precomputed_team_scores').select('id', { count: 'exact', head: true }).eq('school_id', id).in('tournament_id', gt), 'p')
    out[`${s} duals`] = await c(db.from('dual_meets_girls').select('id', { count: 'exact', head: true }).or(`team1_school_id.eq.${id},team2_school_id.eq.${id}`).eq('season_id', s), 'd')
    out[`${s} dual bouts`] = await c(db.from('dual_meet_matches_girls').select('id', { count: 'exact', head: true }).or(`school_a_id.eq.${id},school_b_id.eq.${id}`).eq('season_id', s), 'dm')
    out[`${s} tourn bouts`] = await c(db.from('tournament_bouts_girls').select('id', { count: 'exact', head: true }).or(`wrestler1_school_id.eq.${id},wrestler2_school_id.eq.${id}`).in('in_season_tournament_id', gi), 'tb')
    out[`${s} placements`] = await c(db.from('tournament_placements').select('id', { count: 'exact', head: true }).eq('school_id', id).in('in_season_tournament_id', gi), 'pl')
    out[`${s} PP`] = await c(db.from('power_points').select('*', { count: 'exact', head: true }).eq('school_id', id).eq('gender', 'F').eq('season_id', s), 'pp')
    out[`${s} districts`] = await c(db.from('girls_school_districts').select('*', { count: 'exact', head: true }).eq('school_id', id).eq('season_id', s), 'gd')
    out[`${s} regions`] = await c(db.from('girls_school_regions').select('*', { count: 'exact', head: true }).eq('school_id', id).eq('season_id', s), 'gr')
  }
  out['F wrestlers (school_id)'] = await c(db.from('wrestlers').select('id', { count: 'exact', head: true }).eq('school_id', id).eq('gender', 'F'), 'w')
  out['inactive'] = JSON.stringify((await db.from('inactive_school_seasons').select('*').eq('school_id', id)).data)
  out['season names'] = JSON.stringify((await db.from('school_season_names').select('season_id,gender,display_name').eq('school_id', id)).data)
  out['aliases'] = JSON.stringify((await db.from('school_aliases').select('alias,notes').eq('school_id', id)).data)
  console.log(id, JSON.stringify(out))
}
