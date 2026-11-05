import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const out: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw new Error(error.message); out.push(...data); if (data.length < 1000) break } return out }
// who fits the rule today: boys with a 2024-25 district entry and no 2025-26 one
const t = (await db.from('tournaments').select('id, season_id, tournament_type').eq('gender', 'M').eq('tournament_type', 'districts')).data!
const s25 = new Set(t.filter((x: any) => x.season_id === 2025).map((x: any) => x.id)), s26 = new Set(t.filter((x: any) => x.season_id === 2026).map((x: any) => x.id))
const a = new Set<string>(), b = new Set<string>()
for (const e of await all((f, tt) => db.from('tournament_entries').select('wrestler_id, tournament_id').order('id').range(f, tt))) { if (s25.has(e.tournament_id)) a.add(e.wrestler_id); if (s26.has(e.tournament_id)) b.add(e.wrestler_id) }
const fit = [...a].filter(x => !b.has(x))
console.log(`boys with a 2024-25 district entry: ${a.size}; of those, no 2025-26 district entry (the rule's target): ${fit.length}`)
