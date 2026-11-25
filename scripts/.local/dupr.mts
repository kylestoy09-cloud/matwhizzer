import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const t = (await db.from('tournaments').select('id').eq('gender', 'M').eq('season_id', 2025).eq('name', 'Boy_s Districts District 10')).data![0].id
const ms = (await db.from('matches').select('id, round, weight_class_id, winner_entry_id, loser_entry_id').eq('tournament_id', t).eq('round', '3rd_Place').order('id')).data!
const seen = new Set<string>(); const dup: string[] = []
for (const m of ms) { const k = `${m.weight_class_id}|${m.winner_entry_id}|${m.loser_entry_id}`; if (seen.has(k)) dup.push(m.id); else seen.add(k) }
let n = 0; for (const id of dup) { const r = await db.from('wrestler_match_score_log').select('id', { count: 'exact', head: true }).eq('source_id', id); if (r.error) { console.log(r.error.message); break } n += r.count ?? 0 }
console.log('duplicate D10 3rd-place copies:', dup.length, '| rating-log rows pointing at them:', n)
