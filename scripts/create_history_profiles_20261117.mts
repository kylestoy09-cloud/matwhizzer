// Kyle 2026-11-17: "give everyone a profile" — every boys NJ Wrestling History finish before our postseason records
// (State 1–8, Region titles, 1934–2012) tied to one wrestler (src/lib/historyPeople.ts): a new profile (origin
// 'history'), or the one he already has when his career runs into 2012-13 (same school, same last name, first name
// equal / a nickname / initials with only one fit). Kyle's calls on the review list: Nick Lopez (Williamstown 1997 →
// Washington Township 1998) is one wrestler; Gilliand, Reeves, John Brennan and Jim Smith stay two each, with a ★ line
// on each profile naming the other. Dry run unless --apply. Writes the created ids to docs/migrations/backups/.
// Needs docs/migrations/20261117_history_profiles.sql.
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { writeFileSync } from 'fs'
import { schoolMatcher, historyFinishSchools, historySchoolLabel } from '../src/lib/historySchools'
import { sameLastName } from '../src/lib/trophyRows'
import { groupHistoryPeople, possibleTransfers, sameFirst, type HistFinish, type HistPerson } from '../src/lib/historyPeople'

const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const letters = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')

// ── finishes → people ────────────────────────────────────────────────────────────────────────────────────────────
const all: (HistFinish & { gender: string; source: string })[] = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('history_finishes').select('id, year, level, region, weight, place, name, school, gender, source').eq('gender', 'M').eq('source', 'njwh').order('id').range(f, f + 999)
  if (error) throw error
  all.push(...(data as never[])); if (data!.length < 1000) break
}
const m = await schoolMatcher(db as never)
const ids = historyFinishSchools(all, m, sameLastName)
const fin: HistFinish[] = all.map((f, i) => ({ ...f, school_id: ids[i] })).filter(f => f.year <= 2012)
let people = groupHistoryPeople(fin)
const schoolName = (id: number | null) => (id == null ? '?' : m.school.get(id)?.display_name ?? '?')

// Kyle: Nick Lopez is one wrestler
const lopez = possibleTransfers.find(l => l.every(p => letters(p.first_name) === 'nick' && letters(p.last_name) === 'lopez'))
if (lopez) {
  const [a, b] = [...lopez].sort((x, y) => x.finishes[0].year - y.finishes[0].year)
  a.finishes.push(...b.finishes); a.finishes.sort((x, y) => x.year - y.year); a.transfers = [...(a.transfers ?? []), b.school_id]
  people = people.filter(p => p !== b)
}
// Kyle: the others stay two people, each noting the other
const finishText = (p: HistPerson) => {
  const best = [...p.finishes].sort((x, y) => (x.level === 'state' ? 0 : 1) - (y.level === 'state' ? 0 : 1) || x.place - y.place)[0]
  const what = best.level === 'state' ? (best.place === 1 ? 'won the state title' : `placed ${best.place}${['', 'st', 'nd', 'rd'][best.place] ?? 'th'} at States`) : `won Region ${best.region ?? ''}`.trim()
  return `${what} at ${/^h/i.test(best.weight) ? 'heavyweight' : best.weight} in ${best.year}`
}
const notes = new Map<HistPerson, string>()
for (const list of possibleTransfers) {
  if (list === lopez || list.length !== 2) continue
  const ys = list.flatMap(p => p.finishes.map(f => f.year))
  if (Math.max(...ys) - Math.min(...ys) > 3) continue
  const [a, b] = list
  const label = (p: HistPerson) => `${[p.first_name, p.last_name].filter(Boolean).join(' ')} of ${historySchoolLabel(p.school_raw, schoolName(p.school_id)) ?? schoolName(p.school_id)}`
  notes.set(a, `Might be the same wrestler as ${label(b)}, who ${finishText(b)}.`)
  notes.set(b, `Might be the same wrestler as ${label(a)}, who ${finishText(a)}.`)
}

// ── existing profiles (careers running into 2012-13) ─────────────────────────────────────────────────────────────
const late = people.filter(p => p.finishes[p.finishes.length - 1].year >= 2009 && p.school_id)
const lateSchools = [...new Set(late.flatMap(p => [p.school_id!, ...(p.transfers ?? []).filter((x): x is number => x != null)]))]
const ents: { school_id: number; wrestler: { id: string; first_name: string; last_name: string }; tournament: { season_id: number } }[] = []
for (let i = 0; i < lateSchools.length; i += 50) for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('tournament_entries').select('school_id, wrestler:wrestlers!inner(id, first_name, last_name, gender), tournament:tournaments!inner(season_id)')
    .in('school_id', lateSchools.slice(i, i + 50)).eq('wrestler.gender', 'M').lte('tournament.season_id', 2016).order('id').range(f, f + 999)
  if (error) throw error
  ents.push(...(data as never[])); if (data!.length < 1000) break
}
const existing = new Map<HistPerson, { id: string; name: string }>()
for (const p of late) {
  const last = p.finishes[p.finishes.length - 1].year
  const schools = new Set([p.school_id, ...(p.transfers ?? [])])
  const at = ents.filter(e => schools.has(e.school_id) && e.tournament.season_id <= last + 4 && letters(e.wrestler.last_name) === letters(p.last_name))
  const byId = new Map(at.map(e => [e.wrestler.id, e.wrestler]))
  let hits = [...byId.values()].filter(w => sameFirst(w.first_name, p.first_name))
  // initials ("BJ" = Bryant): the one wrestler there with that last name and first letter
  if (!hits.length && /^[A-Z]{2}$/.test(p.first_name)) hits = [...byId.values()].filter(w => letters(w.first_name)[0] === letters(p.first_name)[0])
  if (hits.length === 1) existing.set(p, { id: hits[0].id, name: `${hits[0].first_name} ${hits[0].last_name}` })
}

// ── report ───────────────────────────────────────────────────────────────────────────────────────────────────────
const created = people.filter(p => !existing.has(p))
console.log({ finishes: fin.length, people: people.length, linked_to_existing: existing.size, new_profiles: created.length, notes: notes.size, apply: APPLY })
for (const [p, n] of notes) console.log('  ★', p.first_name, p.last_name, '—', n)
console.log('  linked by initials:', [...existing].filter(([p, w]) => letters(p.first_name) !== letters(w.name.split(' ')[0])).map(([p, w]) => `${p.first_name} ${p.last_name} → ${w.name}`).join('; '))
if (!APPLY) process.exit(0)

// ── write ────────────────────────────────────────────────────────────────────────────────────────────────────────
const newIds = new Map<HistPerson, string>(created.map(p => [p, randomUUID()]))
const rows = created.map(p => ({
  // the 1930s–40s sources sometimes give only a last name (39 wrestlers): first name '?' (a name is required)
  id: newIds.get(p)!, first_name: p.first_name.trim() || '?', last_name: p.last_name, suffix: p.suffix, gender: 'M', is_active: false, is_oos: false,
  origin: 'history', history_note: notes.get(p) ?? null,
}))
for (let i = 0; i < rows.length; i += 500) {
  const { error } = await db.from('wrestlers').insert(rows.slice(i, i + 500))
  if (error) throw new Error(`wrestlers insert at ${i}: ${error.message}`)
}
for (const [p, n] of notes) if (existing.has(p)) await db.from('wrestlers').update({ history_note: n }).eq('id', existing.get(p)!.id)
writeFileSync('docs/migrations/backups/20261117_history_profiles_created.json', JSON.stringify({ created: rows.map(r => r.id), linked: [...existing].map(([p, w]) => ({ wrestler_id: w.id, finishes: p.finishes.map(f => f.id) })) }))
// each finish → its wrestler and school (grouped so one update covers many rows)
const groups = new Map<string, number[]>()
for (const p of people) {
  const wid = existing.get(p)?.id ?? newIds.get(p)!
  for (const f of p.finishes) { const k = `${wid}|${f.school_id ?? ''}`; groups.set(k, [...(groups.get(k) ?? []), f.id]) }
}
let done = 0
for (const [k, fids] of groups) {
  const [wid, sid] = k.split('|')
  const { error } = await db.from('history_finishes').update({ wrestler_id: wid, school_id: sid ? Number(sid) : null }).in('id', fids)
  if (error) throw new Error(`history_finishes update: ${error.message}`)
  done += fids.length
}
console.log({ wrestlers_created: rows.length, finishes_linked: done })
