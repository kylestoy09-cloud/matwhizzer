import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const [y, k, n] of [[2013, 'region', 6], [2013, 'district', 24], [2013, 'district', 23], [2013, 'district', 22]] as const) {
  const { data } = await db.from('playoff_history_entrants').select('weight, place, name, team').eq('gender', 'M').eq('season_id', y).eq('kind', k).eq('num', n).in('weight', [113, 138, 152]).lte('place', 4).order('weight').order('place')
  console.log(y, k, n, (data ?? []).map(r => `${r.weight}:${r.place} ${r.name} (${r.team})`).join(' | '))
}
