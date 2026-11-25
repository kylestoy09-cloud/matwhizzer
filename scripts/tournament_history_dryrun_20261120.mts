// Tournament history import — DRY RUN (Kyle 2026-11-20: "i went ahead and retrieved a bunch of the tournament brackets
// in history like beast of east, powerade, ironman … so that when people look at those tournaments, they can go back and
// see old years"). Reads the FloWrestling CSVs in ~/Desktop/wrestling_brackets/History/{Powerade,Beast of East,Iron Man}
// and reports, per file: events (boys high school / girls / junior), how many bouts get a round code
// (src/lib/historyRounds.ts), schools (NJ matched / out-of-state on file / out-of-state to create / unclear), NJ wrestlers
// matched to profiles, out-of-state profiles to create, and the editions already in the database. Writes the school
// list to docs/reviews/tournament_history_schools.csv. Writes nothing to the database.
//   npx tsx scripts/tournament_history_dryrun_20261120.mts
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs'
import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { codeRounds, type HistBoutIn } from '../src/lib/historyRounds'
import { largestBrackets } from './_largestBracket.mts'
import { literalNjNames } from './_literalNj.mts'
import { matchSchoolNames } from '../src/lib/matchSchools'
import { bestAlternate } from './_schoolAlternate.mts'
import { matchWrestler } from '../src/lib/matchWrestlers'
import { US_STATES } from '../src/lib/oosSchool'
import * as Nick from '../src/lib/nicknames'
import { wrestlerSeasons, yearsLabel, fitsTiming } from './_wrestlerSeasons.mts'

const ROOT = `${process.env.HOME}/Desktop/wrestling_brackets/History`
// host: an untagged, non-NJ team that never shows another state is from the host state (Beast draws from everywhere)
const SERIES = [
  { dir: 'Powerade', name: 'Powerade', host: 'PA', outOfNj: true },
  { dir: 'Beast of East', name: 'Beast of the East', host: null, outOfNj: false },   // Delaware, but full of NJ teams: no per-event check
  // Iron Man draws schools from everywhere (Illinois, Indiana …): no host-state default (Kyle 2026-11-21)
  { dir: 'Iron Man', name: 'Iron Man Tournament', host: null, outOfNj: true },
  { dir: 'East Coast Catholic Classic', name: 'East Coast Catholic Classic', host: null, outOfNj: false },
  { dir: 'Robin Leff', name: 'Robin Leff Tournament', host: null, outOfNj: false },
  { dir: 'Sam Cali', name: 'Sam Cali Battle for The Belt', host: null, outOfNj: false },
]
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const STATES = new Set<string>(US_STATES as unknown as string[])

type Row = Record<string, string>
// a file whose export left the rounds blank is read from its copy with rounds rebuilt from the bracket PDF
// (scripts/flo_pdf_rounds.py → data/history/rounds/<file name>; Iron Man 2025)
const withRounds = (path: string) => { const alt = `data/history/rounds/${path.split('/').pop()}`; return existsSync(alt) ? alt : path }
function readCsv(path: string): Row[] {
  const text = readFileSync(path, 'utf8')
  const lines: string[][] = []
  let cur: string[] = [], field = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"' && text[i + 1] === '"') { field += '"'; i++ } else if (c === '"') q = false; else field += c }
    else if (c === '"') q = true
    else if (c === ',') { cur.push(field); field = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; cur.push(field); lines.push(cur); cur = []; field = '' }
    else field += c
  }
  if (field || cur.length) { cur.push(field); lines.push(cur) }
  const clean = (s: string) => s.replace(/^=/, '').replace(/^"|"$/g, '').trim()
  const hdr = lines[0].map(clean)
  return lines.slice(1).filter(l => l.length > 1).map(l => Object.fromEntries(hdr.map((h, i) => [h, clean(l[i] ?? '')])))
}

/** "Malvern Prep, PA" / "Oak Park River Forest IL" → name + state; untagged → no state */
function splitTeam(t: string): { name: string; state: string | null } {
  const s = t.trim().replace(/\s+/g, ' ')
  const m = /^(.*?)(?:[,\s]+|\s*-\s*)\(?([A-Z]{2})\)?$/.exec(s)
  if (m && STATES.has(m[2])) return { name: m[1].trim(), state: m[2] }
  return { name: s, state: null }
}
const eventKind = (e: string) => /junior/i.test(e) && /girl/i.test(e) ? 'mixed' : /junior|jr\b|middle/i.test(e) ? 'junior' : /women|girl/i.test(e) ? 'girls' : 'boys'
const seasonOf = (date: string) => { const [m, , y] = date.split('/').map(Number); const start = m >= 7 ? y : y - 1; return `${start}-${String((start + 1) % 100).padStart(2, '0')}` }


const seenFiles = new Set<string>()
// every team seen, with what's known of it
const teams = new Map<string, { name: string; states: Set<string>; bouts: number; series: Set<string>; years: Set<string> }>()
const fileRows: { series: string; file: string; season: string; kind: string; rows: Row[] }[] = []
for (const s of SERIES) {
  for (const f of readdirSync(`${ROOT}/${s.dir}`).filter(f => f.toLowerCase().endsWith('.csv')).sort()) {
    const digest = createHash('md5').update(readFileSync(`${ROOT}/${s.dir}/${f}`)).digest('hex')
    if (seenFiles.has(digest)) continue      // the same file saved twice (Robin Leff 2012)
    seenFiles.add(digest)
    const rowsAll = readCsv(withRounds(`${ROOT}/${s.dir}/${f}`))
    // youth brackets mixed into the boys event (Powerade 2015–2017): kept out, as the import keeps them out
    const boysAll = rowsAll.filter(r => eventKind(r['Event'] ?? '') === 'boys')
    const ws = new Set(boysAll.map(r => parseInt(r['Weight'], 10)))
    const HS = new Set([103, 106, 107, 112, 113, 114, 119, 120, 121, 125, 126, 127, 130, 132, 133, 135, 138, 139, 140, 144, 145, 150, 152, 157, 160, 165, 170, 171, 172, 175, 182, 189, 190, 195, 215, 220, 275, 285])
    const keepBoys = ws.size > 16 ? largestBrackets(boysAll.filter(r => HS.has(parseInt(r['Weight'], 10)))) : boysAll
    const keepSet = new Set(keepBoys)
    const rows = rowsAll.filter(r => eventKind(r['Event'] ?? '') !== 'boys' || keepSet.has(r))
    const byKind = new Map<string, Row[]>()
    for (const r of rows) { const k = eventKind(r['Event'] ?? ''); (byKind.get(k) ?? byKind.set(k, []).get(k)!).push(r) }
    for (const [kind, rs] of byKind) fileRows.push({ series: s.name, file: f, season: seasonOf(rs[0]['Date']), kind, rows: rs })
    for (const r of rows.filter(x => eventKind(x['Event'] ?? '') === 'boys')) for (const t of [r['Winning Team'], r['Losing Team']]) {
      if (!t) continue
      const { name, state } = splitTeam(t)
      const key = name.toLowerCase()
      const e = teams.get(key) ?? teams.set(key, { name, states: new Set(), bouts: 0, series: new Set(), years: new Set() }).get(key)!
      if (state) e.states.add(state)
      e.bouts++; e.series.add(s.name); e.years.add(seasonOf(r['Date']))
    }
  }
}

// out-of-state schools on file by their name without the "(ST)" tag
const oosByName = new Map<string, { id: number; display_name: string }[]>()
for (let f = 0; ; f += 1000) {
  const { data } = await db.from('schools').select('id, display_name').eq('is_nj', false).order('id').range(f, f + 999)
  for (const x of data ?? []) { const k = x.display_name.replace(/\s*\([A-Z]{2}\)\s*$/, '').toLowerCase(); (oosByName.get(k) ?? oosByName.set(k, []).get(k)!).push(x) }
  if (!data || data.length < 1000) break
}
const stateOf = (shown: string) => /\(([A-Z]{2})\)\s*$/.exec(shown)?.[1] ?? null
// each team's wrestlers (boys events), to confirm an NJ school by its wrestlers
const teamWrestlers = new Map<string, { name: string; weight: number; tournament: string; season: string }[]>()
for (const f of fileRows.filter(x => x.kind === 'boys')) for (const r of f.rows) for (const [n, t] of [[r['Winning Wrestler'], r['Winning Team']], [r['Losing Wrestler'], r['Losing Team']]]) {
  if (!n || !t) continue
  const k = splitTeam(t).name.toLowerCase(); const list = teamWrestlers.get(k) ?? teamWrestlers.set(k, []).get(k)!
  if (!list.some(x => x.name === n)) list.push({ name: n, weight: parseInt(r['Weight'], 10), tournament: f.series, season: f.season })
}

// schools: NJ only on an exact name / alias; out-of-state on file; else state known → create; else unclear
type SchoolCall = { status: 'nj' | 'oos_on_file' | 'oos_create' | 'unclear'; schoolId: number | null; shown: string | null; state: string | null; note: string }
const schoolOf = new Map<string, SchoolCall>()
const isLiteral = await literalNjNames(db as never)
const altOf = new Map<string, ReturnType<typeof bestAlternate>>()
// two or more of the team's wrestlers are NJ wrestlers at that school, exactly
async function confirmedByWrestlers(teamKey: string, schoolId: number): Promise<boolean> {
  let hits = 0
  for (const w of teamWrestlers.get(teamKey) ?? []) { if ((await matchWrestler(w.name, schoolId, w.weight, 'M')).confidence === 'exact' && ++hits >= 2) return true }
  return false
}
// the host state, when every tournament the team appears at has the same host
const hostOf = (t: { series: Set<string> }) => { const hs = [...t.series].map(n => SERIES.find(x => x.name === n)!.host); return hs.every(h => h && h === hs[0]) ? hs[0] : null }
for (const [key, t] of teams) {
  const state = t.states.size === 1 ? [...t.states][0] : t.states.size > 1 ? null : null
  const m = await matchSchoolNames(t.name)
  let call: SchoolCall
  if (state && state !== 'NJ') {
    // a school on file of that state only ("St. Francis-NY" is not St. Francis (CA)); one with no state in its name counts
    const ok = m.confidence === 'oos' && (!/\(([A-Z]{2})\)\s*$/.test(m.displayName ?? '') || (m.displayName ?? '').endsWith(`(${state})`))
    call = ok ? { status: 'oos_on_file', schoolId: m.schoolId, shown: m.displayName, state, note: '' }
      : { status: 'oos_create', schoolId: null, shown: `${t.name} (${state})`, state, note: m.confidence === 'exact' || m.confidence === 'high' ? `tagged ${state} but looks like NJ ${m.displayName}` : '' }
  // an exact match only when the printed name is the school's own name or alias; a word-dropped one ("Franklin
  // Regional" → Franklin) needs two of the team's wrestlers on file there (scripts/_literalNj.mts)
  } else if (m.confidence === 'exact' && m.schoolId && (isLiteral(t.name, m.schoolId) || await confirmedByWrestlers(key, m.schoolId))) call = { status: 'nj', schoolId: m.schoolId, shown: m.displayName, state: 'NJ', note: state === 'NJ' ? '' : 'untagged' }
  else if (m.confidence === 'oos') call = { status: 'oos_on_file', schoolId: m.schoolId, shown: m.displayName, state: null, note: '' }
  else if (bestAlternate(t.name, m)?.sure) { const alt = bestAlternate(t.name, m)!; call = { status: alt.oos ? 'oos_on_file' : 'nj', schoolId: alt.id, shown: alt.name, state: alt.oos ? stateOf(alt.name) : 'NJ', note: `matcher's clear best: ${alt.name}` } }
  else if (oosByName.get(t.name.toLowerCase())?.length === 1) { const o = oosByName.get(t.name.toLowerCase())![0]; call = { status: 'oos_on_file', schoolId: o.id, shown: o.display_name, state: stateOf(o.display_name), note: 'matched without the state tag' } }
  else if ((m.confidence === 'high' || m.confidence === 'low') && m.schoolId && await confirmedByWrestlers(key, m.schoolId)) call = { status: 'nj', schoolId: m.schoolId, shown: m.displayName, state: 'NJ', note: `confirmed by its wrestlers (printed "${t.name}")` }
  else if (!state && t.states.size === 0 && hostOf(t) && m.confidence !== 'high') call = { status: 'oos_create', schoolId: null, shown: `${t.name} (${hostOf(t)})`, state: hostOf(t), note: `host state (${[...t.series].join(', ')})` }
  else call = { status: 'unclear', schoolId: m.schoolId, shown: m.displayName, state: t.states.size > 1 ? [...t.states].join('/') : state, note: m.confidence === 'high' || m.confidence === 'low' || m.confidence === 'exact' ? `closest NJ: ${m.displayName} (${m.confidence === 'exact' ? 'name without a word' : m.confidence})` : t.states.size > 1 ? 'tagged with more than one state' : 'no state' }
  schoolOf.set(key, call)
  altOf.set(key, bestAlternate(t.name, m))
}

// existing editions
const { data: editions } = await db.from('in_season_tournaments').select('id, name, season').in('name', SERIES.map(s => s.name))
const { data: gEditions } = await db.from('in_season_tournaments_girls').select('id, name, season')
const have = new Set((editions ?? []).map(e => `${e.name}|${e.season}`))

// per file
const njWrestler = new Map<string, string>()   // "name|schoolId" → match confidence
const weakNj: { name: string; school: string; schoolId: number; season: string; series: string; weight: string; match: string; alts: string; candidates: { id: string; name: string; years?: string }[] }[] = []
const oosPeople = new Set<string>()
console.log('series | file | season | event | bouts | coded | byes/no-opponent | uncoded | in DB already')
for (const f of fileRows) {
  const byWeight = new Map<number, HistBoutIn[]>()
  for (const r of f.rows) {
    const w = parseInt(r['Weight'], 10)
    const b: HistBoutIn = { weight: w, round: r['Round'] ?? '', winner: `${r['Winning Wrestler']}|${r['Winning Team']}`, loser: r['Losing Wrestler'] ? `${r['Losing Wrestler']}|${r['Losing Team']}` : null, bye: /bye/i.test(r['Win Type'] ?? '') }
    ;(byWeight.get(w) ?? byWeight.set(w, []).get(w)!).push(b)
  }
  let coded = 0, byes = 0, uncoded = 0
  for (const bs of byWeight.values()) for (const b of codeRounds(bs)) { if (b.bye || !b.loser) byes++; else if (b.code) coded++; else uncoded++ }
  if (f.kind === 'boys') for (const r of f.rows) for (const [n, t] of [[r['Winning Wrestler'], r['Winning Team']], [r['Losing Wrestler'], r['Losing Team']]]) {
    if (!n || !t) continue
    const call = schoolOf.get(splitTeam(t).name.toLowerCase())!
    if (call.status === 'nj') {
      const k = `${n}|${call.schoolId}`
      if (!njWrestler.has(k)) {
        const m = await matchWrestler(n, call.schoolId!, parseInt(r['Weight'], 10), 'M')
        njWrestler.set(k, m.confidence)
        if (m.confidence === 'low') weakNj.push({ name: n, school: call.shown ?? '', schoolId: call.schoolId!, season: f.season, series: f.series, weight: r['Weight'], match: m.displayName ?? '', alts: m.alternates.slice(0, 3).map(a => a.displayName).join(' / '),
          candidates: [...(m.wrestlerId ? [{ id: m.wrestlerId, name: m.displayName ?? '' }] : []), ...m.alternates.filter(a => a.wrestlerId !== m.wrestlerId).slice(0, 3).map(a => ({ id: a.wrestlerId, name: a.displayName }))] })
      }
    }
    else oosPeople.add(`${n.toLowerCase()}|${splitTeam(t).name.toLowerCase()}`)
  }
  const inDb = f.kind === 'boys' ? have.has(`${f.series}|${f.season}`) : f.kind === 'girls' ? (gEditions ?? []).some(e => e.season === f.season && e.name.toLowerCase().includes(f.series.split(' ')[0].toLowerCase())) : false
  console.log(`${f.series} | ${f.file} | ${f.season} | ${f.kind} | ${f.rows.length} | ${coded} | ${byes} | ${uncoded} | ${inDb ? 'yes' : 'no'}`)
}

const sc = [...schoolOf.values()]
const count = (s: string) => sc.filter(x => x.status === s).length
const njConf = new Map<string, number>(); for (const c of njWrestler.values()) njConf.set(c, (njConf.get(c) ?? 0) + 1)
console.log(`\nSchools (${sc.length} team names): NJ matched ${count('nj')}, out-of-state on file ${count('oos_on_file')}, out-of-state to create ${count('oos_create')}, unclear ${count('unclear')}`)
console.log(`NJ wrestlers (boys events): ${njWrestler.size} — ${[...njConf].map(([c, n]) => `${c} ${n}`).join(', ')}`)
console.log(`Out-of-state / unclear-school wrestlers (boys events, by name + team): ${oosPeople.size}`)

const csv = ['team as printed,bouts,tournaments,years,status,school,state,note',
  ...[...teams].sort((a, b) => b[1].bouts - a[1].bouts).map(([k, t]) => {
    const c = schoolOf.get(k)!
    const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    return [q(t.name), t.bouts, q([...t.series].join('; ')), q([...t.years].sort().join(' ')), c.status, q(c.shown), q(c.state), q(c.note)].join(',')
  })]
writeFileSync('docs/reviews/tournament_history_schools.csv', csv.join('\n'))
console.log('school list: docs/reviews/tournament_history_schools.csv')

// the review sheets: unclear teams (fill a state, or the NJ school), and NJ wrestlers with a weak profile match
const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
// the first sheets stay as Kyle has them; anything new goes on part 2
const firstTeams = existsSync('docs/reviews/tournament_history_review_teams.csv') ? new Set(readFileSync('docs/reviews/tournament_history_review_teams.csv', 'utf8').split('\n').slice(1).map(l => (/^"((?:[^"]|"")*)"/.exec(l)?.[1] ?? '').replace(/""/g, '"').toLowerCase())) : null
const firstPeople = existsSync('docs/reviews/tournament_history_review_nj_wrestlers.csv') ? new Set(readFileSync('docs/reviews/tournament_history_review_nj_wrestlers.csv', 'utf8').split('\n').slice(1).map(l => { const m = /^"((?:[^"]|"")*)","((?:[^"]|"")*)"/.exec(l); return m ? `${m[1]}|${m[2]}`.toLowerCase() : '' })) : null
const teamsFile = 'docs/reviews/tournament_history_review_teams.csv'
const peopleFile = 'docs/reviews/tournament_history_review_nj_wrestlers.csv'
const newTeam = (_name: string) => true   // the review lives in the History tab now (one list); firstTeams kept for reference
void firstTeams
const newPerson = (_w: { name: string; school: string }) => true
void firstPeople
const unclearNew = [...teams].filter(([k, t]) => schoolOf.get(k)!.status === 'unclear' && newTeam(t.name))
// At an event held outside NJ, an untagged team named like an NJ school is that school only when its wrestlers there are
// ours — two of them (one, if it brought one or two) on file at the school; otherwise Kyle decides, for that tournament
// only ("westfield @ iron man tournament": the NJ Westfield at Sam Cali is a different team — Kyle 2026-11-21)
const scoped = new Map<string, { name: string; series: string; years: Set<string>; bouts: number; njSchool: string | null; samples: { name: string; tournament: string; season: string; weight: number }[] }>()
for (const f of fileRows.filter(x => x.kind === 'boys' && SERIES.find(s => s.name === x.series)?.outOfNj)) {
  const people = new Map<string, Map<string, number>>()
  for (const r of f.rows) for (const [n, t] of [[r['Winning Wrestler'], r['Winning Team']], [r['Losing Wrestler'], r['Losing Team']]]) {
    if (!n || !t || splitTeam(t).state) continue
    const k = splitTeam(t).name.toLowerCase(); const c = schoolOf.get(k)
    if (c?.status !== 'nj' || !c.schoolId) continue
    ;(people.get(k) ?? people.set(k, new Map()).get(k)!).set(n, parseInt(r['Weight'], 10))
  }
  for (const [k, ps] of people) {
    const c = schoolOf.get(k)!, need = Math.min(2, ps.size)
    let hits = 0
    for (const [n, wt] of ps) if ((await matchWrestler(n, c.schoolId!, wt, 'M')).confidence === 'exact' && ++hits >= need) break
    if (hits >= need) continue
    const sk = `${k} @ ${f.series}`.toLowerCase()
    const e = scoped.get(sk) ?? scoped.set(sk, { name: teams.get(k)!.name, series: f.series, years: new Set(), bouts: 0, njSchool: c.shown, samples: [] }).get(sk)!
    e.years.add(f.season); e.bouts += f.rows.filter(r => [r['Winning Team'], r['Losing Team']].some(t => t && splitTeam(t).name.toLowerCase() === k)).length
    for (const [n, wt] of ps) if (e.samples.length < 3) e.samples.push({ name: n, tournament: f.series, season: f.season, weight: wt })
  }
}
console.log(`NJ-named teams at events outside NJ not confirmed by their wrestlers: ${scoped.size}`)
writeFileSync(teamsFile, ['team as printed,bouts,tournaments,years,our note,FILL: NJ school or 2-letter state', ...unclearNew.sort((a, b) => b[1].bouts - a[1].bouts).map(([k, t]) => [q(t.name), t.bouts, q([...t.series].join('; ')), q([...t.years].sort().join(' ')), q(schoolOf.get(k)!.note), ''].join(','))].join('\n'))
// prefill: same first name family (Mike = Michael) and the same last name → "same (nickname)"
const nickSame = (a: string, b: string) => {
  const [fa, ...la] = a.trim().split(/\s+/), [fb, ...lb] = b.trim().split(/\s+/)
  if (la.join(' ').toLowerCase() !== lb.join(' ').toLowerCase()) return false
  const x = fa.toLowerCase(), y = fb.toLowerCase()
  return x === y || Nick.otherForms(fa).map(v => v.toLowerCase()).includes(y) || Nick.otherForms(fb).map(v => v.toLowerCase()).includes(x)
}
// timing (Kyle 2026-11-20): each candidate's years on record; one more than 4 seasons from the bout can't be him.
// An item with no candidate left is a new wrestler and leaves the review.
const candSeasons = await wrestlerSeasons(db, weakNj.flatMap(w => w.candidates.map(c => c.id)))
let droppedCands = 0, autoNew = 0
for (const w of weakNj) {
  const start = parseInt(w.season, 10)
  const before = w.candidates.length
  w.candidates = w.candidates.filter(c => fitsTiming(candSeasons.get(c.id), start)).map(c => ({ ...c, years: yearsLabel(candSeasons.get(c.id)) }))
  droppedCands += before - w.candidates.length
  if (!w.candidates.length) autoNew++
  w.match = w.candidates[0]?.name ?? ''
}
console.log(`timing: ${droppedCands} candidates more than 4 seasons from the bout dropped; ${autoNew} wrestlers left with none → new, out of the review`)
const weakNew = weakNj.filter(newPerson).filter(w => w.candidates.length)
// prefills: a nickname (Mike = Michael) → same; the same first and last name once middle initials and punctuation are
// dropped ("Jack J Janda") → same; a different first name altogether (Thomas vs Noah Madorno — usually a brother) → new
const bare = (n: string) => n.toLowerCase().replace(/[^a-z\s'-]/g, ' ').split(/\s+/).filter(Boolean)
const firstLast = (n: string) => { const t = bare(n); return t.length ? [t[0], t[t.length - 1]] : ['', ''] }
function prefill(w: { name: string; match: string }): string {
  if (!w.match) return ''
  if (nickSame(w.name, w.match)) return 'same (nickname)'
  const [fa, la] = firstLast(w.name), [fb, lb] = firstLast(w.match)
  if (fa === fb && la === lb) return 'same (spelling)'
  const nick = Nick.otherForms(fa).map(v => v.toLowerCase()).includes(fb) || Nick.otherForms(fb).map(v => v.toLowerCase()).includes(fa)
  if (la === lb && !nick && fa[0] !== fb[0]) return 'new (different first name)'
  // a typo: the whole name at most two letters off, same first initial ("Darrius Scott" / "Darius Scott")
  if (fa[0] === fb[0] && la[0] === lb[0] && editDistance(`${fa} ${la}`, `${fb} ${lb}`) <= 2) return 'same (close spelling)'
  return ''
}
function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}
writeFileSync(peopleFile, ['name as printed,NJ school,season,tournament,weight,closest profile,other candidates,FILL: same / new', ...weakNew.map(w => [q(w.name), q(w.school), w.season, q(w.series), w.weight, q(w.match), q(w.alts), prefill(w)].join(','))].join('\n'))
console.log(`review sheets: ${teamsFile} (${unclearNew.length} teams), ${peopleFile} (${weakNew.length} wrestlers; ${weakNew.filter(w => prefill(w)).length} prefilled — ${weakNew.filter(w => !prefill(w)).length} left)`)

const GUESSES = JSON.parse(readFileSync('data/history/team_guesses.json', 'utf8')) as Record<string, unknown>
const schoolNames = new Map<number, string>(), njGuess = new Set<number>()
{ const ids = Object.values(GUESSES).map(g => (g as { school?: number }).school).filter((x): x is number => !!x)
  const { data } = await db.from('schools').select('id, display_name, is_nj').in('id', ids); for (const x of data ?? []) { schoolNames.set(x.id, x.display_name); if (x.is_nj) njGuess.add(x.id) } }
// the review in the admin Tournament Hub → History tab (20261120_history_import_review.sql): items refreshed, decisions kept
{
  const { error: tErr } = await db.from('history_import_review').select('id').limit(1)
  if (tErr) console.log(`review table not there yet (${tErr.message}) — run docs/migrations/20261120_history_import_review.sql, then rerun`)
  else {
    const now = new Date().toISOString()
    const teamItems = unclearNew.map(([k, t]) => {
      const c = schoolOf.get(k)!
      // Claude's guess (data/history/team_guesses.json) wins over the matcher's weak alternate; ambiguous names get none
      const mine = GUESSES[k] as { school?: number; state?: string; unsure?: boolean } | undefined
      // a team the files tagged with more than one state (Independence: WV / VA / TN) gets no matcher guess
      const alt = mine || t.states.size > 1 ? null : altOf.get(k) ?? null
      const guessId = mine?.school ?? alt?.id ?? null
      return { gender: 'M', kind: 'team', key: k, updated_at: now, item: { name: t.name, bouts: t.bouts, tournaments: [...t.series], years: [...t.years].sort(), note: c.note,
        guessId, guess: mine?.school ? schoolNames.get(mine.school) ?? null : alt?.name ?? null, guessOos: alt?.oos ?? false,
        stateGuess: mine?.state ?? null, guessUnsure: !!mine?.unsure, states: [...t.states],
        // a few of the team's wrestlers, for a quick web search (Kyle 2026-11-20)
        samples: (teamWrestlers.get(k) ?? []).slice(0, 3).map(w => ({ name: w.name, tournament: w.tournament, season: w.season, weight: w.weight })) } }
    })
    const personItems = weakNew.map(w => ({ gender: 'M', kind: 'wrestler', key: `${w.name}|${w.schoolId}`.toLowerCase(), updated_at: now,
      item: { name: w.name, school: w.school, schoolId: w.schoolId, season: w.season, tournament: w.series, weight: w.weight, candidates: w.candidates, suggestion: prefill(w) } }))
    // one item per key (the same name printed in different case is one wrestler)
    const once = <T extends { key: string }>(xs: T[]) => [...new Map(xs.map(x => [x.key, x])).values()]
    // NJ-named teams at an event outside NJ: decided for that tournament only; guess = a school on file with the name
    const scopedItems = [...scoped].map(([k, e]) => {
      const onFile = oosByName.get(e.name.toLowerCase()) ?? []
      const mine = GUESSES[k] as { school?: number; state?: string; unsure?: boolean } | undefined
      const gid = mine?.school ?? (onFile.length === 1 ? onFile[0].id : null)
      return { gender: 'M', kind: 'team', key: k, updated_at: now, item: { name: `${e.name} (at ${e.series})`, bouts: e.bouts, tournaments: [e.series], years: [...e.years].sort(),
        note: `named like NJ ${e.njSchool}, but its wrestlers there aren't ours`, guessId: gid, guess: mine?.school ? schoolNames.get(mine.school) ?? null : onFile.length === 1 ? onFile[0].display_name : null, guessOos: !mine?.school || !njGuess.has(mine.school),
        stateGuess: mine?.state ?? null, guessUnsure: !!mine?.unsure, states: [], samples: e.samples } }
    })
    for (const batch of [once([...teamItems, ...scopedItems]), once(personItems)]) for (let i = 0; i < batch.length; i += 500) {
      const { error } = await db.from('history_import_review').upsert(batch.slice(i, i + 500), { onConflict: 'gender,kind,key' })
      if (error) throw new Error(`review upsert: ${error.message}`)
    }
    // undecided items no longer needed (timing settled them, or a team now matches) leave the review
    const keep = new Set([...teamItems, ...scopedItems, ...personItems].map(x => `${x.kind}|${x.key}`))
    const { data: open } = await db.from('history_import_review').select('id, kind, key').eq('gender', 'M').is('decision', null)
    const stale = (open ?? []).filter(r => !keep.has(`${r.kind}|${r.key}`)).map(r => r.id)
    for (let i = 0; i < stale.length; i += 200) await db.from('history_import_review').delete().in('id', stale.slice(i, i + 200))
    console.log(`review items written: ${teamItems.length} teams, ${personItems.length} wrestlers; ${stale.length} undecided items no longer needed removed`)
  }
}
