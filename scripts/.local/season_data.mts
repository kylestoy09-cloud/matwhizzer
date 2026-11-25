import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const c = async (t: string, f: (q: any) => any) => (await f(db.from(t).select('*', { count: 'exact', head: true }))).count
for (const s of [2025, 2026]) console.log(s, 'boys duals', await c('dual_meets', q => q.eq('season_id', s).eq('gender', 'M')), 'girls duals', await c('dual_meets_girls', q => q.eq('season_id', s)),
  'boys in-season tourns', await c('in_season_tournaments', q => q.eq('season', `${s - 1}-${String(s).slice(2)}`)), 'girls', await c('in_season_tournaments_girls', q => q.eq('season', `${s - 1}-${String(s).slice(2)}`)))
