import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const c = async (t: string, f: (q: any) => any) => (await f(db.from(t).select('*', { count: 'exact', head: true }))).count
for (const t of ['tournament_placements', 'in_season_tournament_team_scores']) {
  console.log(t, 'total', await c(t, q => q), 'no school_id', await c(t, q => q.is('school_id', null)), t === 'tournament_placements' ? `no wrestler_id ${await c(t, q => q.is('wrestler_id', null))}` : '')
}
const { data: s } = await db.from('tournament_placements').select('wrestler_name_raw, school_name_raw, place, in_season_tournament_id').is('wrestler_id', null).limit(15); console.log(s)
const { data: ts } = await db.from('in_season_tournament_team_scores').select('school_name, tournament_id').is('school_id', null).limit(15); console.log(ts)
const { data: fk } = await db.from('tournament_bouts').select('id, w1:wrestlers!wrestler1_id(first_name,last_name)').limit(1); console.log('embed', JSON.stringify(fk))
