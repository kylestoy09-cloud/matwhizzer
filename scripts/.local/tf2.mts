import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data } = await db.from('matches').select('win_type, winner_score, loser_score, fall_time_seconds').eq('tournament_id', 570)
const c: Record<string, number> = {}; for (const m of data!) c[m.win_type] = (c[m.win_type] ?? 0) + 1; console.log(data!.length, c)
console.log(data!.filter(m => m.win_type === 'MD' && m.winner_score - m.loser_score >= 15))
const { data: tt } = await db.from('tournaments').select('id, season_id').eq('tournament_type','districts').eq('gender','M')
const ids = tt!.map(t => t.id); const zero: number[] = []
for (const t of tt!) { const { count } = await db.from('matches').select('id', { count: 'exact', head: true }).eq('tournament_id', t.id).in('win_type', ['TF','TF-1.5']); if (!count) zero.push(t.id) }
console.log('districts with no TF at all:', zero.length, zero)
