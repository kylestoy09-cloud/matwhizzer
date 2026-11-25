import { createClient } from '@supabase/supabase-js'
import { schoolMatcher, historyFinishSchools } from '../../src/lib/historySchools'
import { sameLastName } from '../../src/lib/trophyRows'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const all = async (q: (f: number, t: number) => any) => { const out: any[] = []; for (let f = 0; ; f += 1000) { const { data, error } = await q(f, f + 999); if (error) throw error; out.push(...data); if (data.length < 1000) return out } }
const finAll = await all((f, t) => db.from('history_finishes').select('id, year, level, region, region_name, weight, place, tie, name, school').eq('gender', 'M').order('id').range(f, t))
const m = await schoolMatcher(db as never)
const ids = historyFinishSchools(finAll, m, sameLastName)
const fin = finAll.map((f, i) => ({ ...f, sid: ids[i] })).filter(f => f.year >= 2009 && f.year <= 2012)
// boys entries 2013-2016 with wrestler + school
const tours = await all((f, t) => db.from('tournaments').select('id, season_id').eq('gender', 'M').gte('season_id', 2013).lte('season_id', 2016).range(f, t))
const tSeason = new Map(tours.map(t => [t.id, t.season_id]))
const ents: any[] = []
for (let i = 0; i < tours.length; i += 50) ents.push(...await all((f, t) => db.from('tournament_entries').select('tournament_id, school_id, wrestler_id, wrestler:wrestlers(first_name, last_name)').in('tournament_id', tours.slice(i, i + 50).map(x => x.id)).not('wrestler_id', 'is', null).order('id').range(f, t)))
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
const byKey = new Map<string, Map<string, { first: number; name: string }>>()   // school|name -> wrestler -> first season
const bySchool = new Map<number, Map<string, { first: number; name: string; last: string }>>()
for (const e of ents) {
  const s = tSeason.get(e.tournament_id)!; const nm = `${e.wrestler.first_name} ${e.wrestler.last_name}`
  const k = `${e.school_id}|${norm(nm)}`
  const mm = byKey.get(k) ?? byKey.set(k, new Map()).get(k)!
  const cur = mm.get(e.wrestler_id); mm.set(e.wrestler_id, { first: Math.min(cur?.first ?? 9999, s), name: nm })
  const bs = bySchool.get(e.school_id) ?? bySchool.set(e.school_id, new Map()).get(e.school_id)!
  const c2 = bs.get(e.wrestler_id); bs.set(e.wrestler_id, { first: Math.min(c2?.first ?? 9999, s), name: nm, last: norm(e.wrestler.last_name) })
}
let exact = 0, multi = 0, none = 0, noSchool = 0; const fuzzy: string[] = []
const links: any[] = []
for (const f of fin) {
  if (f.sid == null) { noSchool++; continue }
  const hits = [...(byKey.get(`${f.sid}|${norm(f.name)}`) ?? new Map())].filter(([, v]) => v.first <= f.year + 3)
  if (hits.length === 1) { exact++; links.push({ f, w: hits[0] }) }
  else if (hits.length > 1) multi++
  else {
    none++
    // same last name, same school, first season within window
    const cand = [...(bySchool.get(f.sid) ?? new Map())].filter(([, v]) => v.first <= f.year + 3 && norm(f.name).endsWith(v.last) && v.first === Math.max(2013, v.first))
    if (cand.length) fuzzy.push(`${f.year} ${f.level} ${f.place} ${f.weight} ${f.name} (${f.school}) ~ ${cand.map(([, v]) => `${v.name} ${v.first}`).join('; ')}`)
  }
}
console.log({ total: fin.length, exact, multi, none, noSchool, fuzzy: fuzzy.length })
console.log(fuzzy.join('\n'))
const ws = new Set(links.map(l => l.w[0])); console.log('wrestlers linked', ws.size)
for (const l of links.slice(0, 10)) console.log(l.f.year, l.f.level, l.f.place, l.f.name, '->', l.w[1].name, l.w[1].first)
