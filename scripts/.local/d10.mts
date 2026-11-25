import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const s of [2025, 2026]) {
  const t = (await db.from('tournaments').select('id').eq('gender', 'M').eq('season_id', s).eq('name', 'Boy_s Districts District 10')).data![0].id
  const ms = (await db.from('matches').select('round').eq('tournament_id', t).limit(3000)).data!
  const c: Record<string, number> = {}; for (const m of ms) c[m.round] = (c[m.round] ?? 0) + 1
  const pl = (await db.from('placements').select('place').eq('tournament_id', t)).data!
  const pc: Record<string, number> = {}; for (const p of pl) pc[p.place] = (pc[p.place] ?? 0) + 1
  console.log(s, 'D10 bouts', JSON.stringify(c), '| placements', JSON.stringify(pc))
}
