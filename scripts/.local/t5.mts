import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const wt of ['FALL', 'TF', 'TF-1.5']) {
  const a = await db.from('matches').select('id', { count: 'exact', head: true }).eq('win_type', wt)
  const n = await db.from('matches').select('id', { count: 'exact', head: true }).eq('win_type', wt).is('fall_time_seconds', null)
  const z = await db.from('matches').select('id', { count: 'exact', head: true }).eq('win_type', wt).eq('fall_time_seconds', 0)
  const f = await db.from('matches').select('id', { count: 'exact', head: true }).eq('win_type', wt).gt('fall_time_seconds', 0).lte('fall_time_seconds', 15)
  console.log(wt, 'all', a.count, 'null', n.count, 'zero', z.count, '1-15s', f.count)
}
const n2 = await db.from('matches').select('tournament:tournaments(season_id, tournament_type, gender)').in('win_type', ['FALL','TF','TF-1.5']).or('fall_time_seconds.is.null,fall_time_seconds.eq.0').limit(2000)
const c: Record<string, number> = {}; for (const r of n2.data as any[]) { const k = `${r.tournament?.gender} ${r.tournament?.season_id} ${r.tournament?.tournament_type}`; c[k] = (c[k] ?? 0) + 1 }; console.log(c)
