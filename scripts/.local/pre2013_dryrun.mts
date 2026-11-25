// dev dry run: group pre-2013 NJ Wrestling History finishes (boys: State 1–8, Region champs) into people, and see
// how many already have a profile (2013+ data) vs need a new one. Writes nothing.
import { createClient } from '@supabase/supabase-js'
import { schoolMatcher, historyFinishSchools } from '../../src/lib/historySchools'
import { sameLastName } from '../../src/lib/trophyRows'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const fin: any[] = []
for (let f = 0; ; f += 1000) { const { data, error } = await db.from('history_finishes').select('id, year, level, region, weight, place, name, school').eq('gender', 'M').eq('source', 'njwh').order('id').range(f, f + 999); if (error) throw error; fin.push(...data!); if (data!.length < 1000) break }
const ids = historyFinishSchools(fin, await schoolMatcher(db as never), sameLastName)
const norm = (s: string) => s.toLowerCase().replace(/\b(jr|sr|ii|iii|iv)\b\.?/g, '').replace(/[^a-z]/g, '')
const pre = fin.map((f, i) => ({ ...f, school_id: ids[i] })).filter(f => f.year <= 2012 && (f.level === 'state' || f.place === 1))
console.log('finishes (state 1-8 + region champs, ≤2012):', pre.length, '| no school match:', pre.filter(f => f.school_id == null).length)
// people: same name + same school, within a 4-season span
const groups = new Map<string, any[]>()
for (const f of pre.sort((a, b) => a.year - b.year)) { const k = `${norm(f.name)}|${f.school_id ?? 'raw:' + f.school}`; groups.set(k, [...(groups.get(k) ?? []), f]) }
const people: any[][] = []
for (const g of groups.values()) { let cur: any[] = []; for (const f of g) { if (cur.length && f.year - cur[0].year > 3) { people.push(cur); cur = [] } cur.push(f) } if (cur.length) people.push(cur) }
const initials = people.filter(p => /^[A-Z]\.?\s|^[A-Z]{2}\s/.test(p[0].name)).length
console.log('people:', people.length, '| first name is an initial:', initials)
const byDecade: Record<string, number> = {}; for (const p of people) { const d = `${Math.floor(p[p.length - 1].year / 10) * 10}s`; byDecade[d] = (byDecade[d] ?? 0) + 1 }
console.log('by decade of last finish:', byDecade)
// already on our records: last finish 2010-2012 and an existing wrestler at the school with that name in 2012-13..2015-16 entries
const late = people.filter(p => p[p.length - 1].year >= 2010 && p[0].school_id)
let linked = 0
for (const p of late) {
  const last = p[0].name.trim().split(/\s+/).slice(-1)[0]
  const { data } = await db.from('tournament_entries').select('wrestler:wrestlers!inner(id, first_name, last_name, gender), tournament:tournaments!inner(season_id)').eq('school_id', p[0].school_id).eq('wrestler.gender', 'M').ilike('wrestler.last_name', last).lte('tournament.season_id', p[p.length - 1].year + 3)
  if ((data ?? []).some((r: any) => norm(`${r.wrestler.first_name}${r.wrestler.last_name}`) === norm(p[0].name))) linked++
}
console.log('last finish 2010–2012:', late.length, '| of those already a profile (same name + school in 2013–15 records):', linked)
console.log('→ new profiles ≈', people.length - linked)
