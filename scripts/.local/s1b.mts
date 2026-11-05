import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const out: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw new Error(error.message); out.push(...data); if (data.length < 1000) break } return out }
const key = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
const inact = await all((f, t) => db.from('wrestlers').select('id, first_name, last_name, grade, grade_confirmed_source').eq('gender', 'M').eq('is_active', false).order('id').range(f, t))
const meetIds = new Set((await all((f, t) => db.from('dual_meets').select('id').eq('season_id', 2026).eq('gender', 'M').order('id').range(f, t))).map((m: any) => m.id))
const ist = new Set((await db.from('in_season_tournaments').select('id').eq('season', '2025-26')).data!.map((x: any) => x.id))
const schoolsOf = new Map<string, Set<number>>()
const add = (w: string | null, s: number | null) => { if (w && s) (schoolsOf.get(w) ?? schoolsOf.set(w, new Set()).get(w)!).add(s) }
for (const b of await all((f, t) => db.from('dual_meet_matches').select('dual_meet_id, wrestler_a_id, wrestler_b_id, school_a_id, school_b_id').order('id').range(f, t))) if (meetIds.has(b.dual_meet_id)) { add(b.wrestler_a_id, b.school_a_id); add(b.wrestler_b_id, b.school_b_id) }
for (const b of await all((f, t) => db.from('tournament_bouts').select('in_season_tournament_id, wrestler1_id, wrestler2_id, wrestler1_school_id, wrestler2_school_id').order('id').range(f, t))) if (ist.has(b.in_season_tournament_id)) { add(b.wrestler1_id, b.wrestler1_school_id); add(b.wrestler2_id, b.wrestler2_school_id) }
const s25 = new Set((await db.from('tournaments').select('id').eq('gender', 'M').eq('season_id', 2025)).data!.map((t: any) => t.id))
const ent = await all((f, t) => db.from('tournament_entries').select('wrestler_id, tournament_id, grade_label').order('id').range(f, t))
const g25 = new Map<string, string>(); for (const e of ent) if (s25.has(e.tournament_id) && e.grade_label) g25.set(e.wrestler_id, e.grade_label)
const ro = await all((f, t) => db.from('roster_grade_import').select('id, school_id, first_name_raw, last_name_raw, grade, status, wrestler_id').eq('gender', 'M').eq('season_id', 2026).order('id').range(f, t))
const roBy = new Map<string, any[]>(); for (const r of ro) { const k = `${r.school_id}|${key(r.first_name_raw + r.last_name_raw)}`; (roBy.get(k) ?? roBy.set(k, []).get(k)!).push(r) }
const rows = inact.filter((w: any) => schoolsOf.has(w.id)).map((w: any) => {
  const track = [...schoolsOf.get(w.id)!].flatMap(s => roBy.get(`${s}|${key(w.first_name + w.last_name)}`) ?? [])
  return { id: w.id, name: `${w.first_name} ${w.last_name}`, grade: w.grade, g2425: g25.get(w.id) ?? null, track: track.map((r: any) => ({ id: r.id, grade: r.grade, status: r.status, linked: r.wrestler_id })) }
})
const tally: Record<string, number> = {}
for (const r of rows) { const k = `2024-25 ${r.g2425 ?? '?'} | profile ${r.grade ?? '-'} | Track ${r.track.length === 1 ? r.track[0].grade : r.track.length ? 'several' : 'none'}`; tally[k] = (tally[k] ?? 0) + 1 }
console.log('inactive boys who wrestled in 2025-26:', rows.length)
for (const [k, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}`)
fs.writeFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/inactive_boys.json', JSON.stringify(rows))
