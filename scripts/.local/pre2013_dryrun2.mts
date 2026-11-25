// dev dry run: pre-2013 people → link to an existing profile or a new one. Writes nothing.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { schoolMatcher, historyFinishSchools } from '../../src/lib/historySchools'
import { sameLastName } from '../../src/lib/trophyRows'
import { groupHistoryPeople, possibleTransfers, sameFirst, type HistFinish } from '../../src/lib/historyPeople'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const all: any[] = []
for (let f = 0; ; f += 1000) { const { data, error } = await db.from('history_finishes').select('id, year, level, region, weight, place, name, school').eq('gender', 'M').eq('source', 'njwh').order('id').range(f, f + 999); if (error) throw error; all.push(...data!); if (data!.length < 1000) break }
const m = await schoolMatcher(db as never)
const ids = historyFinishSchools(all, m, sameLastName)
const fin: HistFinish[] = all.map((f, i) => ({ ...f, school_id: ids[i] })).filter(f => f.year <= 2012)
const people = groupHistoryPeople(fin)
const letters = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
// existing profiles: boys postseason entries 2012-13 → 2015-16 at the schools of people whose last finish is 2009+
const late = people.filter(p => p.finishes[p.finishes.length - 1].year >= 2009 && p.school_id)
const schools = [...new Set(late.map(p => p.school_id!))]
const ents: any[] = []
for (let i = 0; i < schools.length; i += 50) for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('tournament_entries').select('school_id, wrestler:wrestlers!inner(id, first_name, last_name, gender), tournament:tournaments!inner(season_id)').in('school_id', schools.slice(i, i + 50)).eq('wrestler.gender', 'M').lte('tournament.season_id', 2016).order('id').range(f, f + 999)
  if (error) throw error; ents.push(...data!); if (data!.length < 1000) break
}
const link = new Map<string, { id: string; name: string }>()
for (const p of late) {
  const last = p.finishes[p.finishes.length - 1].year
  const hits = new Map<string, string>()
  for (const e of ents) if (e.school_id === p.school_id && e.tournament.season_id <= last + 4 && letters(e.wrestler.last_name) === letters(p.last_name) && sameFirst(e.wrestler.first_name, p.first_name)) hits.set(e.wrestler.id, `${e.wrestler.first_name} ${e.wrestler.last_name}`)
  if (hits.size === 1) { const [id, name] = [...hits][0]; link.set(p.key, { id, name }) }
}
const fmt = (p: any) => `${p.first_name} ${p.last_name}${p.suffix ? ' ' + p.suffix : ''} — ${p.school_id ? m.school.get(p.school_id)?.display_name : p.school_raw} — ${p.finishes.map((f: any) => `${f.year} ${f.weight} ${f.level === 'state' ? `State ${f.place}` : 'Region champ'}`).join('; ')}`
console.log('finishes', fin.length, '| people', people.length, '| link to existing', link.size, '| new', people.length - link.size)
console.log('people with 2+ state titles', people.filter(p => p.finishes.filter(f => f.level === 'state' && f.place === 1).length >= 2).length)
console.log('first name an initial', people.filter(p => letters(p.first_name).length === 1).length, '| with a suffix', people.filter(p => p.suffix).length)
const show = (title: string, list: any[], n = 4) => { console.log(`\n${title}`); list.slice(0, n).forEach(p => console.log('  ' + fmt(p) + (link.has(p.key) ? `  → EXISTING ${link.get(p.key)!.name}` : ''))) }
show('Multi-time state champions', people.filter(p => p.finishes.filter(f => f.level === 'state' && f.place === 1).length >= 3))
show('Nickname merged (two spellings of the first name)', people.filter(p => new Set(p.finishes.map(f => f.name.split(' ')[0].toLowerCase())).size > 1), 6)
show('Linked to an existing profile', late.filter(p => link.has(p.key)), 5)
show('Initial only', people.filter(p => letters(p.first_name).length === 1), 3)
show('With a suffix', people.filter(p => p.suffix), 3)
console.log('\nFor Kyle (common name / initial):'); possibleTransfers.filter(l => { const ys = l.flatMap(p => p.finishes.map(f => f.year)); return Math.max(...ys) - Math.min(...ys) <= 3 }).forEach(l => console.log('  ' + l.map(fmt).join('  ||  ')))
console.log('\nTransfers merged:', people.filter(p => p.transfers).length)
people.filter(p => p.transfers).forEach(p => console.log('  ' + fmt(p) + ' | then ' + p.transfers!.map(t => m.school.get(t!)?.display_name).join(', ')))
writeFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/pre2013_people.json', JSON.stringify({ people, link: [...link] }))
