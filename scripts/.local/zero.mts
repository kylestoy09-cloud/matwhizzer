import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const out: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw new Error(error.message); out.push(...data); if (data.length < 1000) break } return out }
const tours = await all((f, t) => db.from('tournaments').select('id, name, season_id, gender, tournament_type').order('id').range(f, t))
const T = new Map(tours.map((t: any) => [t.id, t]))
const used = new Set<string>()
for (const m of await all((f, t) => db.from('matches').select('winner_entry_id, loser_entry_id').order('id').range(f, t))) { if (m.winner_entry_id) used.add(m.winner_entry_id); if (m.loser_entry_id) used.add(m.loser_entry_id) }
const ents = await all((f, t) => db.from('tournament_entries').select('id, tournament_id, wrestler_id, seed').order('id').range(f, t))
const tally: Record<string, [number, number]> = {}
const zero: any[] = []
for (const e of ents) { const t = T.get(e.tournament_id); if (!t) continue; const k = `${t.gender} ${t.season_id} ${t.tournament_type}`; tally[k] = tally[k] ?? [0, 0]; tally[k][0]++; if (!used.has(e.id)) { tally[k][1]++; if (t.season_id === 2026 && t.gender === 'M') zero.push({ ...e, t: t.name }) } }
for (const [k, [n, z]] of Object.entries(tally).sort()) console.log(`${k}: ${n} entries, ${z} with zero bouts`)
console.log('boys 2025-26 zero-bout entries (first 15):')
const ws = new Map((await all((f, t) => db.from('wrestlers').select('id, first_name, last_name').eq('gender', 'M').order('id').range(f, t))).map((w: any) => [w.id, w]))
for (const z of zero.slice(0, 15)) console.log(`   ${z.t}: ${ws.get(z.wrestler_id)?.first_name} ${ws.get(z.wrestler_id)?.last_name} seed ${z.seed ?? '-'}`)
