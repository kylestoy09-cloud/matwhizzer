import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const tables = [
  'school_districts', 'school_regions', 'school_aliases', 'power_points',
  'dual_meets', 'wrestlers', 'school_conferences', 'precomputed_team_scores',
  'playoff_seeds', 'tournaments', 'school_groups', 'team_scores',
  'conference_memberships', 'bout_results', 'district_seeds', 'region_seeds'
]

for (const table of tables) {
  try {
    const { count, error } = await (db.from(table as any) as any)
      .select('*', { count: 'exact', head: true })
      .in('school_id', [55, 59])
    if (!error && count && count > 0) console.log(`${table}: ${count} rows`)
  } catch {
    // skip
  }
}
