import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const rows: any[] = []
for (let f = 0; ; f += 1000) { const { data } = await db.from('wrestler_hammer_scores').select('wrestler_id, gender, weight_class, hammer_score, school_id').eq('season', '2026-27').is('school_id', null).range(f, f + 999); rows.push(...(data ?? [])); if ((data ?? []).length < 1000) break }
const ids = rows.map(r => r.wrestler_id)
const info = new Map<string, any>(), prev = new Map<string, any>(), alias = new Map<string, number[]>()
for (let i = 0; i < ids.length; i += 200) {
  const s = ids.slice(i, i + 200)
  const { data: w } = await db.from('wrestlers').select('id, first_name, last_name, grade, graduation_year, is_active, is_oos, is_stub').in('id', s); for (const x of w ?? []) info.set(x.id, x)
  const { data: p } = await db.from('wrestler_hammer_scores').select('wrestler_id, school_id, hammer_score').eq('season', '2025-26').in('wrestler_id', s); for (const x of p ?? []) prev.set(x.wrestler_id, x)
  const { data: a } = await db.from('wrestler_name_aliases').select('wrestler_id, school_id').in('wrestler_id', s); for (const x of a ?? []) alias.set(x.wrestler_id, [...(alias.get(x.wrestler_id) ?? []), x.school_id])
}
const c: Record<string, number> = {}
for (const r of rows) { const w = info.get(r.wrestler_id); const p = prev.get(r.wrestler_id); const k = `${r.gender} active=${w?.is_active} oos=${w?.is_oos} grade=${w?.grade} | prev rating: ${p ? (p.school_id == null ? 'yes, no school' : 'yes, with school') : 'none'} | aliases: ${(alias.get(r.wrestler_id) ?? []).length ? 'yes' : 'none'}`; c[k] = (c[k] ?? 0) + 1 }
for (const [k, n] of Object.entries(c).sort((a, b) => b[1] - a[1])) console.log(n, k)
console.log('score range', Math.min(...rows.map(r => r.hammer_score)), Math.max(...rows.map(r => r.hammer_score)))
for (const r of rows.sort((a, b) => b.hammer_score - a.hammer_score).slice(0, 8)) { const w = info.get(r.wrestler_id); console.log(r.gender, r.weight_class, r.hammer_score, w?.first_name, w?.last_name, w?.grade, 'aliases', alias.get(r.wrestler_id), 'prev', prev.get(r.wrestler_id)?.school_id) }
