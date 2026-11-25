import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: jm } = await db.from('dual_meets_girls').select('id, meet_date, team1_school_id, team2_school_id, team1_score, team2_score, counts_toward_record').eq('meet_kind','jamboree')
const byDate: Record<string, {n:number, schools:Set<number>}> = {}
for (const m of jm??[]) { const d=byDate[m.meet_date] ??= {n:0,schools:new Set()}; d.n++; d.schools.add(m.team1_school_id); d.schools.add(m.team2_school_id) }
const { data: sch } = await db.from('schools').select('id, display_name')
const nm = new Map((sch??[]).map(s=>[s.id,s.display_name]))
for (const [d,v] of Object.entries(byDate).sort()) console.log(d, v.n, 'meets', [...v.schools].map(i=>nm.get(i)).join(' | '))
for (const name of ['Lady Viking Jamboree','Jack Welch Girls','Central Regional Tournament','Cape Atlantic League Girls Tournament','Del Val Kickoff','Hillsborough Holiday Brawl']) {
  const { data: t } = await db.from('in_season_tournaments_girls').select('id').eq('name', name).single()
  const { count } = await db.from('tournament_bouts_girls').select('*',{count:'exact',head:true}).eq('in_season_tournament_id', t!.id)
  const { count: ts } = await db.from('in_season_tournament_team_scores').select('*',{count:'exact',head:true}).eq('tournament_id', t!.id)
  console.log(name, 'bouts', count, 'standings', ts)
}
// what's on 1/16, 1/17 for Jack Welch schools
const { data: jw } = await db.from('dual_meets_girls').select('id, meet_date, meet_kind, team1_school_id, team2_school_id').in('meet_date',['2026-01-16','2026-01-17'])
for (const m of jw??[]) console.log('JW-date', m.meet_date, m.meet_kind, nm.get(m.team1_school_id), 'v', nm.get(m.team2_school_id))
