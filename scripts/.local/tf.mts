import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const all = async (q: (f: number, t: number) => any) => { const out: any[] = []; for (let f = 0; ; f += 1000) { const { data, error } = await q(f, f + 999); if (error) throw error; out.push(...data); if (data.length < 1000) return out } }
const tours = await all((f, t) => db.from('tournaments').select('id, name, season_id, gender, tournament_type').range(f, t))
const tf = await all((f, t) => db.from('matches').select('tournament_id, win_type, fall_time_seconds, validated').in('win_type', ['TF', 'TF-1.5']).order('id').range(f, t))
const by = new Map<number, { n: number; timed: number; valid: number }>()
for (const m of tf) { const c = by.get(m.tournament_id) ?? { n: 0, timed: 0, valid: 0 }; c.n++; if (m.fall_time_seconds > 0) c.timed++; if (m.validated) c.valid++; by.set(m.tournament_id, c) }
const rows = tours.filter(t => /district|region|state/i.test(t.tournament_type)).map(t => ({ ...t, ...(by.get(t.id) ?? { n: 0, timed: 0, valid: 0 }) }))
const d18 = rows.filter(r => r.season_id === 2022 && /District 18$/.test(r.name)); console.log(d18)
const bad = rows.filter(r => r.n > 0 && r.timed < r.n)
console.log('postseason tournaments', rows.length, 'with TFs', rows.filter(r => r.n).length, 'with some TF missing time', bad.length, 'none timed', bad.filter(r => r.timed === 0).length)
const s: Record<string, string> = {}; for (const r of bad) { const k = `${r.gender} ${r.season_id}`; s[k] = (s[k] ?? '') + ` ${r.name.replace(/Boy_s |Girl_s |Districts |Regions /g, '')}(${r.timed}/${r.n})` }
for (const k of Object.keys(s).sort()) console.log(k, s[k].slice(0, 400))
