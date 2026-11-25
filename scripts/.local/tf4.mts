import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const all = async (q: (f: number, t: number) => any) => { const out: any[] = []; for (let f = 0; ; f += 1000) { const { data, error } = await q(f, f + 999); if (error) throw error; out.push(...data); if (data.length < 1000) return out } }
const tours = await all((f, t) => db.from('tournaments').select('id, name, season_id, gender').in('tournament_type', ['districts','regions','girls_regions','boys_state','girls_state']).range(f, t))
const tn = new Map(tours.map(t => [t.id, t]))
const rows = await all((f, t) => db.from('matches').select('tournament_id, win_type, winner_score, loser_score, fall_time_seconds').in('win_type', ['TF','TF-1.5']).lt('fall_time_seconds', 75).order('id').range(f, t))
const r2 = rows.filter(m => tn.has(m.tournament_id)).sort((a, b) => a.fall_time_seconds - b.fall_time_seconds)
console.log(r2.length); for (const m of r2) { const t = tn.get(m.tournament_id)!; console.log(t.gender, t.season_id, t.name.replace(/Boy_s |Girl_s /,''), m.win_type, `${m.winner_score}-${m.loser_score}`, m.fall_time_seconds) }
const big = await all((f, t) => db.from('matches').select('tournament_id, win_type, fall_time_seconds').in('win_type', ['TF','TF-1.5','FALL']).gt('fall_time_seconds', 420).order('id').range(f, t))
console.log('over 7:00 (TF/FALL):', big.filter(m => tn.has(m.tournament_id)).map(m => { const t = tn.get(m.tournament_id)!; return `${t.gender} ${t.season_id} ${t.name.replace(/Boy_s |Girl_s /,'')} ${m.win_type} ${m.fall_time_seconds}` }))
