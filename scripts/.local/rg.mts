import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: ts } = await db.from('tournaments').select('id, name').eq('gender', 'F').eq('season_id', 2026).eq('tournament_type', 'girls_regions').order('name')
for (const t of ts!) { const { data } = await db.from('matches').select('round').eq('tournament_id', t.id); const c: any = {}; data!.forEach(m => c[m.round] = (c[m.round] ?? 0) + 1); console.log(t.name, JSON.stringify(c)) }
