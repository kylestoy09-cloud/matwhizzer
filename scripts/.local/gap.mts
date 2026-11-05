// inactive boys whose exact name matches an unmatched 2025-26 Track row at a school they're linked to
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const out: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw new Error(error.message); out.push(...data); if (data.length < 1000) break } return out }
const key = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z]/g, '')
const inact = await all((f, t) => db.from('wrestlers').select('id, first_name, last_name, grade').eq('gender', 'M').eq('is_active', false).order('id').range(f, t))
const schoolsOf = new Map<string, Set<number>>(); const add = (w: string, s: number | null) => { if (s) (schoolsOf.get(w) ?? schoolsOf.set(w, new Set()).get(w)!).add(s) }
for (const a of await all((f, t) => db.from('wrestler_name_aliases').select('wrestler_id, school_id').order('id').range(f, t))) add(a.wrestler_id, a.school_id)
for (const e of await all((f, t) => db.from('tournament_entries').select('wrestler_id, school_id').order('id').range(f, t))) add(e.wrestler_id, e.school_id)
const ro = await all((f, t) => db.from('roster_grade_import').select('school_id, first_name_raw, last_name_raw, grade, status, wrestler_id').eq('gender', 'M').eq('season_id', 2026).is('wrestler_id', null).order('id').range(f, t))
const roBy = new Map<string, any[]>(); for (const r of ro) { const k = `${r.school_id}|${key(r.first_name_raw + r.last_name_raw)}`; (roBy.get(k) ?? roBy.set(k, []).get(k)!).push(r) }
const hits = inact.filter((w: any) => [...(schoolsOf.get(w.id) ?? [])].some(s => roBy.has(`${s}|${key(w.first_name + w.last_name)}`)))
const tally = hits.reduce((m: any, w: any) => { const r = [...schoolsOf.get(w.id)!].flatMap(s => roBy.get(`${s}|${key(w.first_name + w.last_name)}`) ?? [])[0]; const k = `profile ${w.grade ?? '-'} → Track ${r.grade}`; m[k] = (m[k] ?? 0) + 1; return m }, {})
console.log(`inactive boys with an unmatched 2025-26 Track row by name at their school: ${hits.length}`, JSON.stringify(tally))
console.log('unmatched boys 2025-26 Track rows in total:', ro.length)
