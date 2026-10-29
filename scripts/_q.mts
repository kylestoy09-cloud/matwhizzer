import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: ms } = await db.from('dual_meets_girls').select('id,meet_date,team1_school_id,team2_school_id,team1_school_name_raw,team2_school_name_raw').eq('season_id', 2026).eq('is_playoff', true)
const ids = [...new Set(ms!.flatMap(m => [m.team1_school_id, m.team2_school_id]))]
const { data: pp } = await db.from('power_points').select('school_id,pp_group').eq('gender', 'F').eq('season_id', 2026).in('school_id', ids)
const { data: gs } = await db.from('girls_schools').select('school_id,display_name').in('school_id', ids)
for (const m of ms!) for (const [id, raw] of [[m.team1_school_id, m.team1_school_name_raw], [m.team2_school_id, m.team2_school_name_raw]] as any) {
  const g = pp!.find(p => p.school_id === id)?.pp_group ?? 'NO PP ROW'
  if (g !== 'north' && g !== 'south') console.log('SUSPECT', m.meet_date, JSON.stringify(raw), '→', id, gs!.find(x => x.school_id === id)?.display_name, g)
}
console.log('checked', ms!.length, 'playoff meets')
const { data: al } = await db.from('school_aliases').select('*').ilike('alias', '%kittatinny%'); console.log('aliases', al)
const { data: all315 } = await db.from('dual_meets_girls').select('id', { count: 'exact' }).or('team1_school_id.eq.315,team2_school_id.eq.315'); console.log('girls meets on 315', all315?.length)
const { count: tb } = await db.from('tournament_bouts_girls').select('id', { count: 'exact', head: true }).or('wrestler1_school_id.eq.315,wrestler2_school_id.eq.315'); console.log('girls tournament bouts on 315', tb)
