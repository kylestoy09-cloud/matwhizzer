import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const tours = (await db.from('tournaments').select('id, season_id, gender')).data!
const T = (s: number) => tours.filter(t => t.season_id === s && t.gender === 'M').map(t => t.id)
for (const [sid, s, label] of [[357, 2025, 'Ridgefield Memorial 2024-25 (inactive, in Cliffside Park co-op)'], [364, 2025, 'Cliffside Park 2024-25 (co-op record)'], [59, 2026, 'Saddle Brook 2025-26 (inactive, in Lodi/Saddle Brook)'], [379, 2026, 'Lodi/Saddle Brook 2025-26']] as const) {
  const { count: e } = await db.from('tournament_entries').select('id', { count: 'exact', head: true }).eq('school_id', sid).in('tournament_id', T(s))
  const { count: d } = await db.from('dual_meets').select('id', { count: 'exact', head: true }).or(`team1_school_id.eq.${sid},team2_school_id.eq.${sid}`).eq('season_id', s)
  console.log(`${label}: entries ${e}, dual meets ${d}`)
}
