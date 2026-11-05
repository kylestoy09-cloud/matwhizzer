import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const [f, l] of [['Gabriel', 'Grant'], ['Youmie', 'Azarre']]) {
  const w = (await db.from('wrestlers').select('id, first_name, last_name, gender, grade, is_active').eq('first_name', f).eq('last_name', l)).data
  console.log(f, l, JSON.stringify(w))
}
const ftours = (await db.from('tournaments').select('id, season_id').eq('gender', 'F')).data!
for (const id of [43, 111, 191, 13, 297, 253]) {
  const e = (await db.from('tournament_entries').select('tournament_id').eq('school_id', id).in('tournament_id', ftours.map((t: any) => t.id))).data ?? []
  const seasons = [...new Set(e.map((x: any) => ftours.find((t: any) => t.id === x.tournament_id)?.season_id))]
  const d25 = (await db.from('dual_meets_girls').select('id', { count: 'exact', head: true }).eq('season_id', 2025).or(`team1_school_id.eq.${id},team2_school_id.eq.${id}`)).count
  const al = (await db.from('wrestler_name_aliases').select('wrestler_id, wrestlers!inner(gender)').eq('school_id', id).eq('wrestlers.gender', 'F')).data?.length
  const ia = (await db.from('inactive_school_seasons').select('season_id').eq('school_id', id).eq('gender', 'F')).data
  console.log(id, 'postseason entries by season', JSON.stringify(seasons), '| 2024-25 duals', d25, '| girls aliases', al, '| inactive', JSON.stringify(ia))
}
