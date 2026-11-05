import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: ts } = await db.from('tournaments').select('id').eq('gender', 'F').eq('season_id', 2026).eq('tournament_type', 'districts')
const c = new Map<string, number>()
for (const t of ts!) { const { data } = await db.from('matches').select('win_type, round, bracket_side, validated, bout_number, winner_score, fall_time_seconds').eq('tournament_id', t.id); for (const m of data!) c.set(String(m.win_type), (c.get(String(m.win_type)) ?? 0) + 1) }
console.log(JSON.stringify([...c]))
const { data: one } = await db.from('matches').select('*').eq('tournament_id', ts![0].id).eq('round', 'C3').limit(1); console.log(one)
