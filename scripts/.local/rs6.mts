import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const [p, who] of [['d3e8a854', 'Ryan Kim D8'], ['d78cd7e2', 'Terranova D18'], ['7baaa515', 'Sanchez D19'], ['18f1eb6d', 'O. Williams D26'], ['0582439b', 'A. Johnson D28'], ['575bd87d', 'Russo D32']]) {
  const e = (await db.from('tournament_entries').select('id, tournament_id, school_id').gte('id', `${p}-0000-0000-0000-000000000000`).lte('id', `${p}-ffff-ffff-ffff-ffffffffffff`)).data![0]
  const ms = (await db.from('matches').select('round, winner_entry_id').or(`winner_entry_id.eq.${e.id},loser_entry_id.eq.${e.id}`)).data!
  const pl = (await db.from('placements').select('place').eq('entry_id', e.id)).data!.map((x: any) => x.place)
  const ts = (await db.from('precomputed_team_scores').select('total_points').eq('tournament_id', e.tournament_id).eq('school_id', e.school_id)).data
  console.log(`${who}: ${ms.map((m: any) => `${m.round} ${m.winner_entry_id === e.id ? 'W' : 'L'}`).join(', ')} | place ${JSON.stringify(pl)} | school team total ${JSON.stringify(ts?.map((t: any) => t.total_points))}`)
}
