import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: ts } = await db.from('tournaments').select('id, name, tournament_type').eq('gender', 'F').eq('season_id', 2026)
const dist = ts!.filter(t => t.tournament_type === 'districts'), reg = ts!.filter(t => t.tournament_type === 'girls_regions')
const entries = async (ids: number[]) => { const out: any[] = []; for (let f = 0; ; f += 1000) { const { data } = await db.from('tournament_entries').select('id, wrestler_id, tournament_id, weight_class_id').in('tournament_id', ids).range(f, f + 999); out.push(...data!); if (data!.length < 1000) break } return out }
const de = await entries(dist.map(t => t.id)), re = await entries(reg.map(t => t.id))
const inRegion = new Set(re.map(e => e.wrestler_id))
// for each district entry: how far did she go (F win/loss, SF loss, C3 win/loss, C1 ...) and did she reach regions?
const ms: any[] = []
for (const t of dist) { const { data } = await db.from('matches').select('round, winner_entry_id, loser_entry_id').eq('tournament_id', t.id); ms.push(...data!) }
const fate = new Map<string, string>()
const set = (e: string, f: string) => { if (!fate.has(e)) fate.set(e, f) }
for (const r of ['F', 'C3', 'SF', 'C1', 'QF', 'R2']) for (const m of ms.filter(x => x.round === r)) { if (m.winner_entry_id) set(m.winner_entry_id, `${r} win`); if (m.loser_entry_id) set(m.loser_entry_id, `${r} loss`) }
const tab = new Map<string, [number, number]>()
for (const e of de) { const f = fate.get(e.id) ?? 'no bouts'; const x = tab.get(f) ?? [0, 0]; x[0]++; if (inRegion.has(e.wrestler_id)) x[1]++; tab.set(f, x) }
for (const [f, [n, r]] of [...tab].sort()) console.log(f.padEnd(10), 'entries', String(n).padStart(4), 'went to regions', r)
