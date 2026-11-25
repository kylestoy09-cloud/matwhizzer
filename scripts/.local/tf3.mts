import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const all = async (q: (f: number, t: number) => any) => { const out: any[] = []; for (let f = 0; ; f += 1000) { const { data, error } = await q(f, f + 999); if (error) throw error; out.push(...data); if (data.length < 1000) return out } }
const tours = await all((f, t) => db.from('tournaments').select('id, name, season_id, gender').in('tournament_type', ['districts','regions','girls_regions','boys_state','girls_state']).range(f, t))
const tn = new Map(tours.map(t => [t.id, t]))
const ids = tours.map(t => t.id); const odd: any[] = []
for (let i = 0; i < ids.length; i += 60) {
  const rows = await all((f, t) => db.from('matches').select('id, tournament_id, win_type, winner_score, loser_score, fall_time_seconds').in('tournament_id', ids.slice(i, i + 60)).in('win_type', ['DEC','MD','TF','TF-1.5']).order('id').range(f, t))
  for (const m of rows) { const d = (m.winner_score ?? 0) - (m.loser_score ?? 0); if (m.winner_score == null) continue; if ((m.win_type === "DEC" || m.win_type === "MD") && d >= 15) odd.push({ ...m, t: tn.get(m.tournament_id) }); if (m.win_type.startsWith('TF') && (!m.fall_time_seconds || m.fall_time_seconds > 360 || d < 15)) odd.push({ ...m, t: tn.get(m.tournament_id) }) }
}
console.log(odd.length); for (const o of odd.slice(0, 40)) console.log(o.t.gender, o.t.season_id, o.t.name, o.win_type, `${o.winner_score}-${o.loser_score}`, o.fall_time_seconds)
