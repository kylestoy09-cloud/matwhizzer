import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data } = await db.from('in_season_tournaments_girls').select('*').in('name',['Jack Welch Girls','Central Regional Tournament','Del Val Kickoff','Hillsborough Holiday Brawl','Lady Viking Jamboree','Cape Atlantic League Girls Tournament'])
console.log(data)
const { data: reg } = await db.from('tournament_registry').select('*').in('in_season_tournament_id', (data??[]).map(d=>d.id))
console.log(reg)
for (const t of data??[]) {
  for (const [tb,col] of [['tournament_placements','in_season_tournament_id'],['in_season_tournament_team_scores','tournament_id'],['tournament_bouts_girls','in_season_tournament_id']]) {
    const { count } = await db.from(tb).select('*',{count:'exact',head:true}).eq(col, t.id); console.log(t.name, tb, count)
  }
}
