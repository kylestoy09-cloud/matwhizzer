import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const out: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw new Error(error.message); out.push(...data); if (data.length < 1000) break } return out }
const inact = new Map((await all((f, t) => db.from('wrestlers').select('id, grade').eq('gender', 'M').eq('is_active', false).order('id').range(f, t))).map((w: any) => [w.id, w.grade]))
const meetIds = new Set((await all((f, t) => db.from('dual_meets').select('id').eq('season_id', 2026).eq('gender', 'M').order('id').range(f, t))).map((m: any) => m.id))
const ist = new Set((await db.from('in_season_tournaments').select('id').eq('season', '2025-26')).data!.map((x: any) => x.id))
const wrestled = new Set<string>()
for (const b of await all((f, t) => db.from('dual_meet_matches').select('dual_meet_id, wrestler_a_id, wrestler_b_id').order('id').range(f, t))) if (meetIds.has(b.dual_meet_id)) { wrestled.add(b.wrestler_a_id); wrestled.add(b.wrestler_b_id) }
for (const b of await all((f, t) => db.from('tournament_bouts').select('in_season_tournament_id, wrestler1_id, wrestler2_id').order('id').range(f, t))) if (ist.has(b.in_season_tournament_id)) { wrestled.add(b.wrestler1_id); wrestled.add(b.wrestler2_id) }
const hit = [...inact].filter(([id]) => wrestled.has(id))
console.log('boys inactive', inact.size, '| of those, wrestled in 2025-26:', hit.length, JSON.stringify(hit.reduce((m: any, [, g]) => (m[g ?? '-'] = (m[g ?? '-'] ?? 0) + 1, m), {})))
