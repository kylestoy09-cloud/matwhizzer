import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const out: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw new Error(error.message); out.push(...data); if (data.length < 1000) break } return out }
// 1. rename
const j = (await db.from('wrestlers').select('id, first_name, last_name').eq('first_name', 'Jackson').eq('last_name', 'ClarkeGoss')).data!
if (j.length === 1) { const r = await db.from('wrestlers').update({ last_name: 'Clarke Goss' }).eq('id', j[0].id).select('first_name, last_name'); console.log('renamed:', JSON.stringify(r.data), r.error?.message ?? '') ; fs.writeFileSync('docs/migrations/backups/20261105_jackson_clarke_goss_before.json', JSON.stringify(j)) }
// 4. the 292: active, no name link anywhere, only 2024-25 postseason entries — grades?
const linked = new Set((await all((f, t) => db.from('wrestler_name_aliases').select('wrestler_id').order('id').range(f, t))).map((a: any) => a.wrestler_id))
const ws = await all((f, t) => db.from('wrestlers').select('id, gender, grade, grade_confirmed_source, is_oos, first_name').eq('is_active', true).eq('is_oos', false).neq('first_name', 'Unknown').order('id').range(f, t))
const cand = new Map(ws.filter((w: any) => !linked.has(w.id)).map((w: any) => [w.id, w]))
const act = new Map<string, Set<string>>(); const mark = (w: string | null, s: string) => { if (w && cand.has(w)) (act.get(w) ?? act.set(w, new Set()).get(w)!).add(s) }
const istS = new Map<string, string>(); for (const t of ['in_season_tournaments', 'in_season_tournaments_girls']) for (const x of (await db.from(t).select('id, season')).data!) istS.set(x.id, x.season)
for (const t of ['tournament_bouts', 'tournament_bouts_girls']) for (const b of await all((f, tt) => db.from(t).select('in_season_tournament_id, wrestler1_id, wrestler2_id').order('id').range(f, tt))) { mark(b.wrestler1_id, `t${istS.get(b.in_season_tournament_id)}`); mark(b.wrestler2_id, `t${istS.get(b.in_season_tournament_id)}`) }
const dmS = new Map<string, number>(); for (const t of ['dual_meets', 'dual_meets_girls']) for (const m of await all((f, tt) => db.from(t).select('id, season_id').order('id').range(f, tt))) dmS.set(m.id, m.season_id)
for (const t of ['dual_meet_matches', 'dual_meet_matches_girls']) for (const b of await all((f, tt) => db.from(t).select('dual_meet_id, wrestler_a_id, wrestler_b_id').order('id').range(f, tt))) { mark(b.wrestler_a_id, `d${dmS.get(b.dual_meet_id)}`); mark(b.wrestler_b_id, `d${dmS.get(b.dual_meet_id)}`) }
const tS = new Map((await db.from('tournaments').select('id, season_id')).data!.map((t: any) => [t.id, t.season_id]))
const g25 = new Map<string, string>()
for (const e of await all((f, tt) => db.from('tournament_entries').select('tournament_id, wrestler_id, grade_label').order('id').range(f, tt))) { mark(e.wrestler_id, `p${tS.get(e.tournament_id)}`); if (tS.get(e.tournament_id) === 2025 && e.grade_label && cand.has(e.wrestler_id)) g25.set(e.wrestler_id, e.grade_label) }
const only = [...act].filter(([, s]) => [...s].every(x => x === 'p2025')).map(([id]) => cand.get(id))
const tally: Record<string, number> = {}
for (const w of only as any[]) { const k = `${w.gender} grade ${w.grade ?? 'none'} (${w.grade_confirmed_source ?? 'no source'}) | 2024-25 entry ${g25.get(w.id) ?? '-'}`; tally[k] = (tally[k] ?? 0) + 1 }
console.log(`only 2024-25 postseason, active, no link: ${only.length}`)
for (const [k, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}`)
