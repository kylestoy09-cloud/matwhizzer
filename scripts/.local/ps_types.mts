import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data } = await db.from('tournaments').select('season_id, gender, tournament_type').in('season_id', [2026]).in('tournament_type', ['districts', 'regions', 'girls_regions', 'boys_state', 'girls_state'])
const c: Record<string, number> = {}
for (const t of data ?? []) { const k = `${t.season_id} ${t.gender} ${t.tournament_type}`; c[k] = (c[k] ?? 0) + 1 }
console.log(c)
const { data: cal } = await db.from('season_calendar').select('event_type, event_date').eq('season_id', 2027).like('event_type', 'individual_%').order('event_date')
console.log(cal)
