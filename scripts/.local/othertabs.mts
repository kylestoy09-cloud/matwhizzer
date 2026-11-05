import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const t of ['girls_school_districts', 'girls_school_regions', 'girls_school_conferences', 'girls_coaches', 'girls_school_profiles', 'power_points', 'conference_standings', 'in_season_tournament_team_scores', 'tournament_placements', 'wrestler_school_history', 'roster_grade_import', 'in_season_tournaments_girls', 'precomputed_team_scores']) {
  for (const sid of [6, 315, 268]) {
    const col = t === 'in_season_tournaments_girls' ? 'location_school_id' : 'school_id'
    const { data, error } = await db.from(t).select('*').eq(col, sid).limit(50)
    if (error) { console.log(t, error.message); break }
    if (data!.length) console.log(t, sid, data!.length, JSON.stringify(data!.slice(0, 3)).slice(0, 300))
  }
}
const { data: al } = await db.from('wrestler_name_aliases').select('id, raw_name, school_id, wrestler_id, wrestlers(gender)').in('school_id', [6, 315, 268])
console.log('wrestler aliases', JSON.stringify(Object.entries((al as any[]).reduce((a: any, x: any) => { const k = `${x.school_id}/${x.wrestlers?.gender}`; a[k] = (a[k] ?? 0) + 1; return a }, {}))))
