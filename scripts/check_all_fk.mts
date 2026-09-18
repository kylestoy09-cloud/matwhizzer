import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const tables = [
  'school_districts', 'school_aliases', 'power_points', 'dual_meets',
  'wrestlers', 'conferences', 'school_conferences', 'precomputed_team_scores',
  'playoff_seeds', 'tournaments'
]

for (const table of tables) {
  const col = table === 'dual_meets' ? undefined : 'school_id'
  if (table === 'dual_meets') {
    const { count: c1 } = await db.from('dual_meets').select('*', { count: 'exact', head: true }).or('team1_school_id.eq.55,team2_school_id.eq.55,team1_school_id.eq.59,team2_school_id.eq.59')
    if (c1) console.log(`dual_meets: ${c1} rows`)
    continue
  }
  const { count } = await (db.from(table as any) as any).select('*', { count: 'exact', head: true }).in('school_id', [55, 59])
  if (count) console.log(`${table}: ${count} rows`)
}
