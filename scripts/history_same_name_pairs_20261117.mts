// Kyle 2026-11-17: same-named wrestlers at two schools — which together make one high school career (all finishes
// inside 4 seasons, any shared season at the same or next weight)? For each such pair: every finish, the weights by
// year, and the school evidence — finishes per school, and which region each school's OTHER wrestlers won titles in
// that year (± 1), so a Region title printed under the wrong school stands out. Read only; writes a JSON for the
// merge step (scratch path given as the first argument).
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
type F = { id: number; wrestler_id: string; year: number; level: string; place: number; region: number | null; weight: string; school: string; school_id: number | null }
const fin: F[] = []
for (let f = 0; ; f += 1000) { const { data, error } = await db.from('history_finishes').select('id, wrestler_id, year, level, place, region, weight, school, school_id').eq('gender', 'M').not('wrestler_id', 'is', null).order('id').range(f, f + 999); if (error) throw error; fin.push(...(data as F[])); if (data!.length < 1000) break }
const ids = [...new Set(fin.map(f => f.wrestler_id))]
const W = new Map<string, { first_name: string; last_name: string; origin: string | null }>()
for (let i = 0; i < ids.length; i += 300) { const { data } = await db.from('wrestlers').select('id, first_name, last_name, origin').in('id', ids.slice(i, i + 300)); for (const w of data ?? []) W.set(w.id, w) }
const { data: sch } = await db.from('schools').select('id, display_name'); const sname = new Map((sch ?? []).map(s => [s.id, s.display_name]))
const LAD = [98, 103, 106, 112, 115, 119, 122, 123, 125, 126, 129, 130, 132, 135, 136, 138, 140, 142, 145, 147, 148, 152, 154, 155, 157, 160, 167, 168, 170, 171, 172, 177, 178, 185, 189, 190, 191, 215, 220, 275, 285]
const wt = (w: string) => (/^h/i.test(w) ? 999 : Number(w))
const near = (a: string, b: string) => { const x = wt(a), y = wt(b); if (x === y) return true; if (x === 999 || y === 999) return Math.min(x, y) >= 189; const i = LAD.indexOf(x), j = LAD.indexOf(y); return Math.abs(x - y) <= 12 || (i >= 0 && j >= 0 && Math.abs(i - j) <= 2) }
// regions each school's wrestlers won Region titles in, by year
// (the pair's own finishes left out, so a wrestler is not his own evidence)
const regionRows = new Map<string, F[]>()
for (const f of fin) if (f.level === 'region' && f.school_id != null && f.region != null) { const k = `${f.school_id}|${f.year}`; (regionRows.get(k) ?? regionRows.set(k, []).get(k)!).push(f) }
const regionsNear = (sid: number | null, y: number, exclude: string[]) => { const s = new Set<number>(); if (sid == null) return s; for (const yy of [y - 1, y, y + 1]) for (const r of regionRows.get(`${sid}|${yy}`) ?? []) if (!exclude.includes(r.wrestler_id)) s.add(r.region!); return s }
const byName = new Map<string, Map<string, F[]>>()
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
for (const f of fin) { const w = W.get(f.wrestler_id)!; if (!w || w.first_name === '?') continue; const k = `${norm(w.first_name)}|${norm(w.last_name)}`; const m = byName.get(k) ?? byName.set(k, new Map()).get(k)!; m.set(f.wrestler_id, [...(m.get(f.wrestler_id) ?? []), f]) }
const pairs: any[] = []
let sameNameDiffSchool = 0
for (const [, m] of byName) {
  const ps = [...m.entries()]
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    const [ia, a] = ps[i], [ib, b] = ps[j]
    const sa = new Set(a.map(f => f.school_id)), sb = new Set(b.map(f => f.school_id))
    if ([...sa].some(x => sb.has(x))) continue
    sameNameDiffSchool++
    const all = [...a, ...b], ys = all.map(f => f.year)
    if (Math.max(...ys) - Math.min(...ys) > 3) continue
    // a season both have: the same weight (or close) — otherwise two wrestlers in one season
    const clash = a.some(x => b.some(y => y.year === x.year && (!near(x.weight, y.weight) || (x.level === y.level && x.level === 'state'))))
    const w = W.get(ia)!
    const bySchool = new Map<number | null, number>(); for (const f of all) bySchool.set(f.school_id, (bySchool.get(f.school_id) ?? 0) + 1)
    // evidence per finish: region titles — does that school's region (from its other wrestlers) match?
    const evidence = all.filter(f => f.level === 'region').map(f => {
      const own = regionsNear(f.school_id, f.year, [ia, ib]), others = [...sa, ...sb].filter(s => s !== f.school_id)
      return { finish: f.id, region: f.region, school: sname.get(f.school_id!) ?? f.school, school_regions: [...own], other_school: others.map(o => ({ school: sname.get(o!) ?? '?', regions: [...regionsNear(o, f.year, [ia, ib])] })) }
    })
    pairs.push({ name: `${w.first_name} ${w.last_name}`, a: ia, b: ib, a_origin: W.get(ia)!.origin, b_origin: W.get(ib)!.origin, clash, gap: Math.min(...a.flatMap(x => b.map(y => Math.abs(x.year - y.year)))),
      finishes: all.sort((x, y) => x.year - y.year || (x.level === 'region' ? -1 : 1)).map(f => ({ id: f.id, who: f.wrestler_id === ia ? 'a' : 'b', year: f.year, level: f.level, place: f.place, region: f.region, weight: f.weight, school_id: f.school_id, school: sname.get(f.school_id!) ?? f.school, printed: f.school })),
      bySchool: [...bySchool].map(([s, n]) => ({ school: sname.get(s!) ?? '?', school_id: s, n })), evidence })
  }
}
writeFileSync(process.argv[2], JSON.stringify(pairs, null, 1))
console.log({ same_name_pairs_at_different_schools: sameNameDiffSchool, fit_one_4yr_career: pairs.length, of_those_with_a_clash: pairs.filter(p => p.clash).length })
