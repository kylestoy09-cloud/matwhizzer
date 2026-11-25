import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data } = await db.from('tournaments').select('season_id, tournament_type, gender')
const c = new Map<string, number>(); for (const t of data ?? []) c.set(`${t.season_id} ${t.gender} ${t.tournament_type}`, (c.get(`${t.season_id} ${t.gender} ${t.tournament_type}`) ?? 0) + 1)
console.log([...c].sort().join('\n'))
