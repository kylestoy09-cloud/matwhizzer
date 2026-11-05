import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const out: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw new Error(error.message); out.push(...data); if (data.length < 1000) break } return out }
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const tours = await all((f, t) => db.from('tournaments').select('id, season_id, tournament_type').eq('gender', 'M').order('id').range(f, t))
const d25 = new Set(tours.filter((t: any) => t.season_id === 2025 && t.tournament_type === 'districts').map((t: any) => t.id))
const post26 = new Set(tours.filter((t: any) => t.season_id === 2026).map((t: any) => t.id))
const sr25 = new Map<string, number>(); const e26 = new Map<string, Set<number>>()
for (const e of await all((f, t) => db.from('tournament_entries').select('wrestler_id, tournament_id, school_id, grade_label').order('id').range(f, t))) {
  if (d25.has(e.tournament_id) && e.grade_label === 'Sr') sr25.set(e.wrestler_id, e.school_id)
  if (post26.has(e.tournament_id)) (e26.get(e.wrestler_id) ?? e26.set(e.wrestler_id, new Set()).get(e.wrestler_id)!).add(e.school_id)
}
const meets = new Set((await all((f, t) => db.from('dual_meets').select('id').eq('season_id', 2026).eq('gender', 'M').order('id').range(f, t))).map((m: any) => m.id))
const at26 = new Map<string, Set<number>>(); const put = (w: string | null, s: number | null) => { if (w && s && sr25.has(w)) (at26.get(w) ?? at26.set(w, new Set()).get(w)!).add(s) }
for (const b of await all((f, t) => db.from('dual_meet_matches').select('dual_meet_id, wrestler_a_id, wrestler_b_id, school_a_id, school_b_id').order('id').range(f, t))) if (meets.has(b.dual_meet_id)) { put(b.wrestler_a_id, b.school_a_id); put(b.wrestler_b_id, b.school_b_id) }
const ist = new Set((await db.from('in_season_tournaments').select('id').eq('season', '2025-26')).data!.map((x: any) => x.id))
for (const b of await all((f, t) => db.from('tournament_bouts').select('in_season_tournament_id, wrestler1_id, wrestler2_id, wrestler1_school_id, wrestler2_school_id').order('id').range(f, t))) if (ist.has(b.in_season_tournament_id)) { put(b.wrestler1_id, b.wrestler1_school_id); put(b.wrestler2_id, b.wrestler2_school_id) }
for (const [w, ss] of e26) if (sr25.has(w)) for (const s of ss) put(w, s)
const ws = new Map((await all((f, t) => db.from('wrestlers').select('id, first_name, last_name, is_active').eq('gender', 'M').order('id').range(f, t))).map((w: any) => [w.id, w]))
const rows = [...at26].filter(([w]) => ws.get(w)?.is_active)
const same = rows.filter(([w, ss]) => ss.has(sr25.get(w)!)), diff = rows.filter(([w, ss]) => !ss.has(sr25.get(w)!))
console.log(`active boys who were 2024-25 senior district entrants and have 2025-26 records: ${rows.length} (2025-26 at the same school ${same.length}, at a different school ${diff.length})`)
for (const [w, ss] of rows) { const x = ws.get(w); console.log(`   ${x.first_name} ${x.last_name}: 2024-25 Sr @ ${names.get(sr25.get(w))} → 2025-26 @ ${[...ss].map(s => names.get(s)).join('/')}`) }
