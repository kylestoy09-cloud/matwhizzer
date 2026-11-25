import { createClient } from '@supabase/supabase-js'
import { normName, splitName, sameFirst } from '../../src/lib/playoffHistory/people'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const G = process.argv.includes('--girls') ? 'F' : 'M'
const all = async (t: string, sel: string, f: (q: any) => any, key = 'id') => { const out: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await f(db.from(t).select(sel)).order(key).range(i, i + 999); if (error) throw error; out.push(...data); if (data.length < 1000) return out } }
const names = new Map((await all('playoff_history_schools', 'raw_name, school_id, decision', q => q.eq('gender', G), 'raw_name')).map(r => [r.raw_name, r]))
const ents = await all('playoff_history_entrants', 'id, season_id, kind, weight, name, team', q => q.eq('gender', G))
// person-seasons
type PS = { season: number; norm: string; school: number; names: Set<string>; weights: number[] }
const ps = new Map<string, PS>()
let noSchool = 0
for (const e of ents) {
  const s = names.get(e.team); if (!s?.school_id) { noSchool++; continue }
  const k = `${e.season_id}|${normName(e.name)}|${s.school_id}`
  const p = ps.get(k) ?? ps.set(k, { season: e.season_id, norm: normName(e.name), school: s.school_id, names: new Set(), weights: [] }).get(k)!
  p.names.add(e.name); p.weights.push(e.weight)
}
// auto chains: same norm + school, consecutive seasons
const byKey = new Map<string, PS[]>()
for (const p of ps.values()) (byKey.get(`${p.norm}|${p.school}`) ?? byKey.set(`${p.norm}|${p.school}`, []).get(`${p.norm}|${p.school}`)!).push(p)
let people = 0, joined = 0, long = 0
const chains: PS[][] = []
for (const list of byKey.values()) {
  list.sort((a, b) => a.season - b.season)
  let cur: PS[] = []
  for (const p of list) { if (cur.length && p.season - cur[cur.length - 1].season !== 1) { chains.push(cur); cur = [] } cur.push(p) }
  chains.push(cur)
}
for (const c of chains) { people++; joined += c.length - 1; if (c.length > 4) long++ }
// review candidates
const last = (n: string) => n.split(' ').slice(-1)[0], first = (n: string) => n.split(' ')[0]
const endOf = new Map<string, PS[][]>(); for (const c of chains) { const k = `${c[c.length - 1].season}`; (endOf.get(k) ?? endOf.set(k, []).get(k)!).push(c) }
let transfer = 0, variant = 0
const ex: string[] = []
for (const c of chains) {
  const start = c[0]
  for (const prev of endOf.get(String(start.season - 1)) ?? []) {
    const p = prev[prev.length - 1]
    if (p.norm === start.norm && p.school !== start.school) { transfer++; if (ex.length < 6) ex.push(`transfer? ${[...p.names][0]} (${p.season}) → (${start.season}) other school`) }
    else if (p.school === start.school && last(p.norm) === last(start.norm) && p.norm !== start.norm && sameFirst(first(p.norm), first(start.norm))) { variant++; if (ex.length < 12) ex.push(`variant? ${[...p.names][0]} (${p.season}) / ${[...start.names][0]} (${start.season})`) }
  }
}
console.log(G, '| entries', ents.length, 'no school (empty slots)', noSchool, '| person-seasons', ps.size, '| people after auto-joins', people, `(${joined} joins)`, '| runs > 4 seasons', long)
console.log('review: transfers', transfer, '| name variants', variant)
for (const e of ex) console.log('  ', e)
console.log('split samples:', ['Jack bauer', 'Stanley Clark, Jr.', 'Richard John (RJ) Hunnewell', 'Juan De La Cruz', 'Richard DeLorenzo II', 'LOGAN MAZZEO'].map(n => JSON.stringify(splitName(n))).join(' '))
// existing profiles: the last seasons' person-seasons vs our wrestlers (name + a link at the same school)
const wrestlers = await all('wrestlers', 'id, first_name, last_name, graduation_year, gender', q => q.eq('gender', G))
const aliases = await all('wrestler_name_aliases', 'id, wrestler_id, school_id', q => q.not('school_id', 'is', null))
const wById = new Map(wrestlers.map(w => [w.id, w]))
const schoolsOf = new Map<string, Set<number>>(); for (const a of aliases) if (wById.has(a.wrestler_id)) (schoolsOf.get(a.wrestler_id) ?? schoolsOf.set(a.wrestler_id, new Set()).get(a.wrestler_id)!).add(a.school_id)
// a profile's schools: its name links, plus where it wrestled (postseason entries, duals)
for (const e of await all('tournament_entries', 'id, wrestler_id, school_id', q => q.not('school_id', 'is', null).not('wrestler_id', 'is', null))) if (wById.has(e.wrestler_id)) (schoolsOf.get(e.wrestler_id) ?? schoolsOf.set(e.wrestler_id, new Set()).get(e.wrestler_id)!).add(e.school_id)
for (const t of G === 'F' ? ['dual_meet_matches_girls'] : ['dual_meet_matches']) for (const m of await all(t, 'id, wrestler_a_id, wrestler_b_id, school_a_id, school_b_id', q => q)) for (const [w, sc] of [[m.wrestler_a_id, m.school_a_id], [m.wrestler_b_id, m.school_b_id]]) if (w && sc && wById.has(w)) (schoolsOf.get(w) ?? schoolsOf.set(w, new Set()).get(w)!).add(sc)
const byNorm = new Map<string, any[]>(); for (const w of wrestlers) { const k = normName(`${w.first_name} ${w.last_name}`); (byNorm.get(k) ?? byNorm.set(k, []).get(k)!).push(w) }
const maxSeason = Math.max(...[...ps.values()].map(p => p.season))
let auto = 0, sameNameOtherSchool = 0, ambiguous = 0, gradOff = 0
const exs: string[] = []
for (const c of chains) {
  const lastP = c[c.length - 1]
  if (lastP.season < maxSeason - 3) continue   // too old to still be wrestling in 2024-25
  const cands = byNorm.get(lastP.norm) ?? []
  const here = cands.filter(w => schoolsOf.get(w.id)?.has(lastP.school))
  // class check: a wrestler seen in season S graduates in S..S+3
  const fits = (w: any) => w.graduation_year == null || (w.graduation_year >= lastP.season && w.graduation_year - c[0].season <= 3)
  if (here.length === 1 && fits(here[0])) auto++
  else if (here.length === 1) { gradOff++; if (exs.length < 4) exs.push(`class doesn't fit: ${[...lastP.names][0]} ${c.map(p => p.season).join(',')} vs grad ${here[0].graduation_year}`) }
  else if (here.length > 1) ambiguous++
  else if (cands.length) { sameNameOtherSchool++ }
}
console.log('existing profiles: auto-link (same name + linked at the same school + class fits)', auto, '| same school but class off', gradOff, '| two profiles fit', ambiguous, '| same name, other school only (review)', sameNameOtherSchool)
for (const e of exs) console.log('  ', e)
// sample the "same name, other school" group with class fit + where the profile is
const { data: sch } = await db.from('schools').select('id, display_name'); const sn = new Map((sch ?? []).map((s: any) => [s.id, s.display_name]))
let fitOther = 0, noFit = 0; const smp: string[] = []
for (const c of chains) {
  const lastP = c[c.length - 1]; if (lastP.season < maxSeason - 3) continue
  const cands = (byNorm.get(lastP.norm) ?? []).filter(w => !schoolsOf.get(w.id)?.has(lastP.school)); if (!cands.length || (byNorm.get(lastP.norm) ?? []).some(w => schoolsOf.get(w.id)?.has(lastP.school))) continue
  const fit = cands.filter(w => w.graduation_year != null && w.graduation_year > lastP.season && w.graduation_year - c[0].season <= 4)
  if (fit.length) { fitOther++; if (smp.length < 10) smp.push(`${[...lastP.names][0]} ${sn.get(lastP.school)} ${c.map(p => p.season).join(',')} ↔ profile grad ${fit[0].graduation_year} at ${[...(schoolsOf.get(fit[0].id) ?? [])].map(i => sn.get(i)).join('/')}`) } else noFit++
}
console.log('same name other school: class fits', fitOther, '| class does not fit (different people / graduated)', noFit)
for (const s of smp) console.log('  ', s)
