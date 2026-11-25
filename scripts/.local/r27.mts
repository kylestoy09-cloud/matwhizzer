import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const tours = (await db.from('tournaments').select('id, name').eq('gender', 'M').eq('season_id', 2025).eq('tournament_type', 'regions').order('name')).data!
for (const t of tours as any[]) {
  const ms = (await db.from('matches').select('round').eq('tournament_id', t.id).limit(5000)).data!
  const c: Record<string, number> = {}; for (const m of ms) c[m.round] = (c[m.round] ?? 0) + 1
  const pl = (await db.from('placements').select('place').eq('tournament_id', t.id)).data!
  const pc: Record<string, number> = {}; for (const p of pl) pc[p.place] = (pc[p.place] ?? 0) + 1
  console.log(t.name, 'bouts', JSON.stringify(c), '| placements', JSON.stringify(pc))
}
