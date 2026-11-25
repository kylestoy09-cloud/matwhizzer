import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const t of ['dual_meets', 'dual_meet_matches', 'tournament_bouts', 'in_season_tournaments', 'matches', 'tournaments', 'tournament_entries', 'dual_meets_girls', 'tournament_bouts_girls', 'in_season_tournaments_girls']) {
  const { data, error } = await db.from(t).select('*').limit(1)
  console.log(t, error?.message ?? JSON.stringify(data?.[0]).slice(0, 900))
}
