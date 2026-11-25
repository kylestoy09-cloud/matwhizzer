// Tournament history import (Kyle 2026-11-20): the FloWrestling CSVs in ~/Desktop/wrestling_brackets/History → past
// editions of the boys history tournaments — one in_season_tournaments row per season (linked to the season before
// with prior_id), every bout (rounds from src/lib/historyRounds.ts), placements from the placement matches.
// Schools: NJ (exact name / alias, or confirmed by its wrestlers), out-of-state on file, or out-of-state created as
// "Name (ST)" (a state tag in the files, the host state, or Kyle's review); wrestlers: NJ ones matched to their profiles
// (a weak match only as Kyle decided in the review, no match → a new NJ profile), everyone else an out-of-state profile.
// Kyle's review decisions come from history_import_review (Tournament Hub → History → Review). A bout whose team or NJ
// wrestler is still waiting there is held back, and counted. An edition already in the database (this season, loaded
// from NJ teams' results) only gets the bouts it doesn't have; its placements stay. Dry run unless --apply.
//   npx tsx scripts/import_tournament_history_20261120.mts [--apply] [--only=powerade,beast,…] [--season=2025-26]
import { readFileSync, readdirSync, existsSync } from 'fs'
import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { codeRounds, type HistBoutIn } from '../src/lib/historyRounds'
import { largestBrackets } from './_largestBracket.mts'
import { matchSchoolNames } from '../src/lib/matchSchools'
import { bestAlternate } from './_schoolAlternate.mts'
import { literalNjNames } from './_literalNj.mts'
import { matchWrestler } from '../src/lib/matchWrestlers'
import { createOosSchool, US_STATES } from '../src/lib/oosSchool'
import { boutResultToDb } from '../src/lib/parseRtf'
import { saveNameLinks } from '../src/lib/nameLinks'
import { wrestlerSeasons, fitsTiming } from './_wrestlerSeasons.mts'

const APPLY = process.argv.includes('--apply')
const ONLY = (process.argv.find(a => a.startsWith('--only='))?.slice(7) ?? '').split(',').filter(Boolean)
// --season=2025-26: only those editions (Kyle 2026-11-21: fill this season's out-of-state brackets first)
const SEASONS = (process.argv.find(a => a.startsWith('--season='))?.slice(9) ?? '').split(',').filter(Boolean)
const ROOT = `${process.env.HOME}/Desktop/wrestling_brackets/History`
const SERIES = [
  { key: 'powerade', dir: 'Powerade', name: 'Powerade', host: 'PA', outOfNj: true },
  { key: 'beast', dir: 'Beast of East', name: 'Beast of the East', host: null, outOfNj: false },   // Delaware, but full of NJ teams: no per-event check
  // Iron Man draws schools from everywhere (Illinois, Indiana …): no host-state default (Kyle 2026-11-21)
  { key: 'ironman', dir: 'Iron Man', name: 'Iron Man Tournament', host: null, outOfNj: true },
  { key: 'eccc', dir: 'East Coast Catholic Classic', name: 'East Coast Catholic Classic', host: null, outOfNj: false },
  { key: 'leff', dir: 'Robin Leff', name: 'Robin Leff Tournament', host: null, outOfNj: false },
  { key: 'samcali', dir: 'Sam Cali', name: 'Sam Cali Battle for The Belt', host: null, outOfNj: false },
].filter(s => !ONLY.length || ONLY.includes(s.key))
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const STATES = new Set<string>(US_STATES as unknown as string[])

// ── reading ─────────────────────────────────────────────────────────────────────────────────────────────────────────
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
function splitTeam(t: string): { name: string; state: string | null } {
  const s = t.trim().replace(/\s+/g, ' ')
  const m = /^(.*?)(?:[,\s]+|\s*-\s*)\(?([A-Z]{2})\)?$/.exec(s)
  if (m && STATES.has(m[2])) return { name: m[1].trim(), state: m[2] }
  return { name: s, state: null }
}
const eventKind = (e: string) => /junior/i.test(e) && /girl/i.test(e) ? 'mixed' : /\bjunior\b|\bjr\b|middle school/i.test(e) ? 'junior' : /women|girl/i.test(e) ? 'girls' : 'boys'
const parseDate = (d: string) => { const [m, day, y] = d.split('/').map(Number); return { m, day, y, iso: `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}` } }
const seasonOf = (d: string) => { const { m, y } = parseDate(d); const start = m >= 7 ? y : y - 1; return `${start}-${String((start + 1) % 100).padStart(2, '0')}` }

// CSV win type + result → the stored result (as the RTF import stores it, src/lib/parseRtf.ts boutResultToDb)
function result(winType: string, res: string) {
  const wt = winType.trim().toUpperCase()
  const time = /(\d{1,2}:\d{2})/.exec(res)?.[1] ?? null
  const score = /(\d+-\d+)/.exec(res)?.[1] ?? null
  const type = wt === 'F' || wt === 'FALL' ? 'Fall' : wt === 'TF' ? 'TF' : wt === 'MD' ? 'MD' : wt === 'DEC' ? (/\b(SV|TB|UTB|OT)/i.test(res) ? (/\bTB/i.test(res) ? 'TB-1' : 'SV-1') : 'Dec')
    : /^(FF|FOR|M FOR)/.test(wt) ? 'For' : /^(MFF|MFFL)/.test(wt) ? 'MFFL' : /^INJ/.test(wt) ? 'Inj' : /^DQ/.test(wt) ? 'DQ' : /^(SV|TB|UTB|OT)/.test(wt) ? wt : wt === 'NC' ? null : wt || null
  if (!type) return null
  const detail = type === 'Fall' ? time : type === 'TF' ? [score, time].filter(Boolean).join(' ') : score
  return boutResultToDb(type, detail)
}

// ── review decisions ────────────────────────────────────────────────────────────────────────────────────────────────
const decisions = new Map<string, { njSchoolId?: number; schoolId?: number; state?: string; wrestlerId?: string; new?: boolean }>()
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('history_import_review').select('kind, key, decision').eq('gender', 'M').not('decision', 'is', null).order('id').range(f, f + 999)
  if (error) throw new Error(`history_import_review: ${error.message}`)
  for (const r of data ?? []) decisions.set(`${r.kind}|${r.key}`, r.decision)
  if (!data || data.length < 1000) break
}

// ── files ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const seenFiles = new Set<string>()
const files: { series: typeof SERIES[number]; file: string; season: string; rows: Row[] }[] = []
const teams = new Map<string, { name: string; states: Set<string>; series: Set<string> }>()
for (const s of SERIES) {
  for (const f of readdirSync(`${ROOT}/${s.dir}`).filter(f => f.toLowerCase().endsWith('.csv')).sort()) {
    const digest = createHash('md5').update(readFileSync(`${ROOT}/${s.dir}/${f}`)).digest('hex')
    if (seenFiles.has(digest)) continue
    seenFiles.add(digest)
    const rows = readCsv(withRounds(`${ROOT}/${s.dir}/${f}`)).filter(r => eventKind(r['Event'] ?? '') === 'boys')
    if (!rows.length) continue
    files.push({ series: s, file: f, season: seasonOf(rows[0]['Date']), rows })
    for (const r of rows) for (const t of [r['Winning Team'], r['Losing Team']]) {
      if (!t) continue
      const { name, state } = splitTeam(t)
      const e = teams.get(name.toLowerCase()) ?? teams.set(name.toLowerCase(), { name, states: new Set(), series: new Set() }).get(name.toLowerCase())!
      if (state) e.states.add(state)
      e.series.add(s.name)
    }
  }
}

// ── schools (as the dry run decided them, plus Kyle's review) ──────────────────────────────────────────────────────
const oosByName = new Map<string, { id: number; display_name: string }[]>()
for (let f = 0; ; f += 1000) {
  const { data } = await db.from('schools').select('id, display_name').eq('is_nj', false).order('id').range(f, f + 999)
  for (const x of data ?? []) { const k = x.display_name.replace(/\s*\([A-Z]{2}\)\s*$/, '').toLowerCase(); (oosByName.get(k) ?? oosByName.set(k, []).get(k)!).push(x) }
  if (!data || data.length < 1000) break
}
const njSchoolIds = new Set<number>()
for (let f = 0; ; f += 1000) { const { data } = await db.from('schools').select('id').eq('is_nj', true).order('id').range(f, f + 999); for (const x of data ?? []) njSchoolIds.add(x.id); if (!data || data.length < 1000) break }
const hostOf = (t: { series: Set<string> }) => { const hs = [...t.series].map(n => SERIES.find(x => x.name === n)?.host ?? null); return hs.length && hs.every(h => h && h === hs[0]) ? hs[0] : null }
type SchoolPlan = { kind: 'nj' | 'oos'; id: number | null; create?: { name: string; state: string } } | { kind: 'waiting' }
const schoolPlan = new Map<string, SchoolPlan>()
const isLiteral = await literalNjNames(db as never)
const teamWrestlers = new Map<string, { name: string; weight: number }[]>()
for (const f of files) for (const r of f.rows) for (const [n, t] of [[r['Winning Wrestler'], r['Winning Team']], [r['Losing Wrestler'], r['Losing Team']]]) {
  if (!n || !t) continue
  const k = splitTeam(t).name.toLowerCase(); const list = teamWrestlers.get(k) ?? teamWrestlers.set(k, []).get(k)!
  if (!list.some(x => x.name === n)) list.push({ name: n, weight: parseInt(r['Weight'], 10) })
}
async function confirmedByWrestlers(teamKey: string, schoolId: number) {
  let hits = 0
  for (const w of teamWrestlers.get(teamKey) ?? []) if ((await matchWrestler(w.name, schoolId, w.weight, 'M')).confidence === 'exact' && ++hits >= 2) return true
  return false
}
for (const [key, t] of teams) {
  const state = t.states.size === 1 ? [...t.states][0] : null
  const d = decisions.get(`team|${key}`)
  if (d?.njSchoolId) { schoolPlan.set(key, { kind: 'nj', id: d.njSchoolId }); continue }
  if (d?.schoolId) { schoolPlan.set(key, { kind: njSchoolIds.has(d.schoolId) ? 'nj' : 'oos', id: d.schoolId }); continue }
  if (d?.state) { schoolPlan.set(key, { kind: 'oos', id: oosByName.get(t.name.toLowerCase())?.find(o => o.display_name.endsWith(`(${d.state})`))?.id ?? null, create: { name: t.name, state: d.state } }); continue }
  const m = await matchSchoolNames(t.name)
  // a state-tagged team is a school of that state: one on file named so ("St. Francis-NY" is not St. Francis (CA)), else new
  if (state && state !== 'NJ') {
    const sameState = m.confidence === 'oos' && !/\(([A-Z]{2})\)\s*$/.test(m.displayName ?? '') ? null : m.confidence === 'oos' && (m.displayName ?? '').endsWith(`(${state})`) ? m.schoolId : null
    const byState = oosByName.get(t.name.toLowerCase())?.find(o => o.display_name.endsWith(`(${state})`))?.id ?? null
    const untaggedOnFile = m.confidence === 'oos' && !/\(([A-Z]{2})\)\s*$/.test(m.displayName ?? '') ? m.schoolId : null
    const id = sameState ?? byState ?? untaggedOnFile
    schoolPlan.set(key, id ? { kind: 'oos', id } : { kind: 'oos', id: null, create: { name: t.name, state } }); continue
  }
  // an exact match only when the printed name is the school's own name or alias; a word-dropped one ("Franklin
  // Regional" → Franklin) needs two of the team's wrestlers on file there (scripts/_literalNj.mts)
  if (m.confidence === 'exact' && m.schoolId && (isLiteral(t.name, m.schoolId) || await confirmedByWrestlers(key, m.schoolId))) { schoolPlan.set(key, { kind: 'nj', id: m.schoolId }); continue }
  if (m.confidence === 'oos') { schoolPlan.set(key, { kind: 'oos', id: m.schoolId }); continue }
  const alt = bestAlternate(t.name, m)
  if (alt?.sure) { schoolPlan.set(key, { kind: alt.oos ? 'oos' : 'nj', id: alt.id }); continue }
  const byName = oosByName.get(t.name.toLowerCase())
  if (byName?.length === 1) { schoolPlan.set(key, { kind: 'oos', id: byName[0].id }); continue }
  if ((m.confidence === 'high' || m.confidence === 'low') && m.schoolId && await confirmedByWrestlers(key, m.schoolId)) { schoolPlan.set(key, { kind: 'nj', id: m.schoolId }); continue }
  const host = hostOf(t)
  if (!state && t.states.size === 0 && host && m.confidence !== 'high') { schoolPlan.set(key, { kind: 'oos', id: null, create: { name: t.name, state: host } }); continue }
  schoolPlan.set(key, { kind: 'waiting' })
}

// ── wrestlers ───────────────────────────────────────────────────────────────────────────────────────────────────────
const created = { schools: 0, njProfiles: 0, oosProfiles: 0 }
const schoolIdCache = new Map<string, number>()
// At an event held outside NJ an untagged team named like an NJ school is that school only when its wrestlers there
// are ours: two of them (one, if it brought one or two) already on file at the school (Kyle 2026-11-21: Iron Man's
// Westfield, Edison, Columbia, Highland and Clay are Indiana and Ohio schools). Otherwise it's out of state — a school
// in the host state, or waiting when the event has none. A team decided in Kyle's review keeps his decision.
const newSchoolNames: string[] = []
const waitingTeams = new Map<string, number>()
let fileCtx: { outOfNj: boolean; host: string | null; rows: Row[]; series: string } = { outOfNj: false, host: null, rows: [], series: '' }
const njHere = new Map<string, boolean>()   // file|team → confirmed
const hostSchool = new Map<string, number | null>()
async function confirmedHere(teamKey: string, schoolId: number) {
  const k = `${fileCtx.rows.length}|${fileCtx.rows[0]?.['Date']}|${teamKey}`
  if (njHere.has(k)) return njHere.get(k)!
  const people = new Map<string, number>()
  for (const r of fileCtx.rows) for (const [n, t] of [[r['Winning Wrestler'], r['Winning Team']], [r['Losing Wrestler'], r['Losing Team']]]) if (n && t && splitTeam(t).name.toLowerCase() === teamKey) people.set(n, parseInt(r['Weight'], 10))
  const need = Math.min(2, people.size)
  let hits = 0
  for (const [n, wt] of people) if ((await matchWrestler(n, schoolId, wt, 'M')).confidence === 'exact' && ++hits >= need) break
  const ok = need > 0 && hits >= need
  njHere.set(k, ok)
  return ok
}
// a year already on file: the school each team's bouts were linked to in its first import (reviewed then) comes first
let editionSchools = new Map<string, number>()
async function loadEditionSchools(tid: string | null) {
  editionSchools = new Map()
  if (!tid) return
  for (let f = 0; ; f += 1000) {
    const { data } = await db.from('tournament_bouts').select('wrestler1_school_raw, wrestler1_school_id, wrestler2_school_raw, wrestler2_school_id, source_format').eq('in_season_tournament_id', tid).neq('source_format', 'csv').order('id').range(f, f + 999)
    for (const b of data ?? []) for (const [raw, id] of [[b.wrestler1_school_raw, b.wrestler1_school_id], [b.wrestler2_school_raw, b.wrestler2_school_id]] as [string | null, number | null][]) if (raw && id) editionSchools.set(splitTeam(raw).name.toLowerCase(), id)
    if (!data || data.length < 1000) break
  }
}
async function schoolIdFor(teamKey: string, printed: string): Promise<{ id: number; nj: boolean } | 'waiting' | 'noteam'> {
  const p = schoolPlan.get(teamKey)
  if (!p) return 'noteam'                       // no team printed for the wrestler
  // (only for a name printed without a state — "Franklin-MA" is not the year's plain "Franklin")
  const known = splitTeam(printed).state ? undefined : editionSchools.get(teamKey)
  if (known && !decisions.get(`team|${teamKey}`)) return { id: known, nj: njSchoolIds.has(known) }
  if (p.kind === 'waiting') return 'waiting'
  if (p.id && p.kind === 'nj' && fileCtx.outOfNj && !splitTeam(printed).state && !decisions.get(`team|${teamKey}`) && !(await confirmedHere(teamKey, p.id))) {
    // Kyle's decision for this tournament only (the dry run's "<team> @ <tournament>" review item)
    const sd = decisions.get(`team|${teamKey} @ ${fileCtx.series}`.toLowerCase())
    if (sd?.njSchoolId) return { id: sd.njSchoolId, nj: true }
    if (sd?.schoolId) return { id: sd.schoolId, nj: njSchoolIds.has(sd.schoolId) }
    if (sd?.state) {
      const name = splitTeam(printed).name, hk = `${teamKey}|${sd.state}`
      if (!hostSchool.has(hk)) {
        const onFile = oosByName.get(name.toLowerCase())?.find(o => o.display_name.endsWith(`(${sd.state})`))
        if (onFile) hostSchool.set(hk, onFile.id)
        else { created.schools++; newSchoolNames.push(`${name} (${sd.state})`); hostSchool.set(hk, APPLY ? (await createOosSchool(db, name, sd.state)).id : -created.schools) }
      }
      return { id: hostSchool.get(hk)!, nj: false }
    }
    if (!fileCtx.host) return 'waiting'
    const hk = `${teamKey}|${fileCtx.host}`
    if (!hostSchool.has(hk)) {
      const name = splitTeam(printed).name
      const onFile = oosByName.get(name.toLowerCase())?.find(o => o.display_name.endsWith(`(${fileCtx.host})`))
      if (onFile) hostSchool.set(hk, onFile.id)
      else { created.schools++; newSchoolNames.push(`${name} (${fileCtx.host})`); hostSchool.set(hk, APPLY ? (await createOosSchool(db, name, fileCtx.host)).id : -created.schools) }
    }
    return { id: hostSchool.get(hk)!, nj: false }
  }
  if (p.id) return { id: p.id, nj: p.kind === 'nj' }
  if (schoolIdCache.has(teamKey)) return { id: schoolIdCache.get(teamKey)!, nj: false }
  created.schools++
  newSchoolNames.push(`${p.create!.name} (${p.create!.state})`)
  if (!APPLY) { schoolIdCache.set(teamKey, -created.schools); return { id: -created.schools, nj: false } }
  const s = await createOosSchool(db, p.create!.name, p.create!.state)
  schoolIdCache.set(teamKey, s.id)
  return { id: s.id, nj: false }
}
const splitName = (n: string) => { const parts = n.replace(/\s+/g, ' ').trim().split(' '); return parts.length > 1 ? { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] } : null }
const wrestlerCache = new Map<string, string | 'waiting' | null>()
const links: { raw_name: string; school_id: number; wrestler_id: string }[] = []
let fakeIds = 0
// a profile's seasons on record, for the timing check: a match more than 4 seasons from the bout is not him
const seasonsCache = new Map<string, number[]>()
let timingRejected = 0
async function fits(id: string | null, start: number) {
  if (!id) return false
  if (!seasonsCache.has(id)) seasonsCache.set(id, (await wrestlerSeasons(db, [id])).get(id) ?? [])
  return fitsTiming(seasonsCache.get(id), start)
}
let boutStart = 0   // the season (start year) of the file being read
// --reuse=<from>,<to> (ISO times): profiles a failed run created in that window, with no bouts or name links yet, are
// taken again by name instead of created twice (2026-11-21: a Powerade 2025-26 run made 403 profiles, then its bouts
// were refused — source_format 'flo_csv' isn't allowed)
const REUSE = new Map<string, string[]>()
{
  const r = process.argv.find(a => a.startsWith('--reuse='))?.slice(8).split(',')
  if (r?.length === 2) {
    const { data } = await db.from('wrestlers').select('id, first_name, last_name').gte('created_at', r[0]).lte('created_at', r[1]).eq('gender', 'M')
    for (const w of data ?? []) { const k = `${w.first_name}|${w.last_name}`.toLowerCase(); REUSE.set(k, [...(REUSE.get(k) ?? []), w.id]) }
    console.log(`reusing up to ${data?.length ?? 0} profiles created ${r[0]} – ${r[1]}`)
  }
}
let reused = 0

async function wrestlerFor(name: string, school: { id: number; nj: boolean }, weight: number): Promise<string | 'waiting' | null> {
  const k = `${name.toLowerCase()}|${school.id}|${boutStart}`
  if (wrestlerCache.has(k)) return wrestlerCache.get(k)!
  let id: string | 'waiting' | null = null
  const create = async (oos: boolean) => {
    const parts = splitName(name)
    if (!parts) return null
    if (oos) created.oosProfiles++; else created.njProfiles++
    if (!APPLY || school.id < 0) return `new-${++fakeIds}`
    const again = REUSE.get(`${parts.first}|${parts.last}`.toLowerCase())
    if (again?.length) { reused++; return again.shift()! }
    const ins = await db.from('wrestlers').insert({ first_name: parts.first, last_name: parts.last, gender: 'M', is_oos: oos }).select('id').single()
    if (ins.error) { console.log(`  profile not created for "${name}": ${ins.error.message}`); return null }
    return ins.data.id as string
  }
  if (school.id > 0) {
    const m = await matchWrestler(name, school.id, weight, 'M')
    if ((m.confidence === 'exact' || m.confidence === 'high') && await fits(m.wrestlerId, boutStart)) id = m.wrestlerId
    else if (m.confidence === 'exact' || m.confidence === 'high') timingRejected++
    else if (school.nj && m.confidence === 'low') {
      const d = decisions.get(`wrestler|${`${name}|${school.id}`.toLowerCase()}`)
      // no candidate within 4 seasons → new (the review left it out)
      const anyFits = (await Promise.all([m.wrestlerId, ...m.alternates.map(a => a.wrestlerId)].filter(Boolean).map(x => fits(x as string, boutStart)))).some(Boolean)
      id = d?.wrestlerId ?? (d?.new || !anyFits ? await create(false) : 'waiting')
    }
  }
  if (id === null) id = await create(!school.nj)
  if (typeof id === 'string' && id !== 'waiting' && !id.startsWith('new-') && school.id > 0) links.push({ raw_name: name, school_id: school.id, wrestler_id: id })
  wrestlerCache.set(k, id)
  return id
}


// ── editions, bouts, placements ─────────────────────────────────────────────────────────────────────────────────────
const report: string[] = []
const held = { team: 0, wrestler: 0, noName: 0, noTeam: 0 }
let boutsNew = 0, boutsHad = 0, placementsNew = 0, editionsNew = 0, seedsAdded = 0
const editionOf = new Map<string, string>()   // series|season → id
for (const s of SERIES) {
  const { data } = await db.from('in_season_tournaments').select('id, season, start_date, tournament_type, is_oos, podium_depth, point_value, location, prior_id').eq('name', s.name)
  for (const e of data ?? []) editionOf.set(`${s.key}|${e.season}`, e.id)
  const template = (data ?? []).sort((a, b) => (a.season < b.season ? 1 : -1))[0]
  for (const f of files.filter(x => x.series.key === s.key && (!SEASONS.length || SEASONS.includes(x.season))).sort((a, b) => a.season.localeCompare(b.season))) {
    let tid = editionOf.get(`${s.key}|${f.season}`) ?? null
    const existed = !!tid
    const dates = f.rows.map(r => parseDate(r['Date']).iso).sort()
    if (!tid) {
      editionsNew++
      if (APPLY) {
        const ins = await db.from('in_season_tournaments').insert({
          name: s.name, season: f.season, start_date: dates[0], end_date: dates[dates.length - 1],
          location: [f.rows[0]['City'], f.rows[0]['State']].filter(Boolean).join(', ') || null,
          tournament_type: template?.tournament_type ?? null, is_oos: template?.is_oos ?? false, podium_depth: template?.podium_depth ?? 8,
          source_format: 'csv',
        }).select('id').single()
        if (ins.error) throw new Error(`edition ${s.name} ${f.season}: ${ins.error.message}`)
        tid = ins.data.id as string
      } else tid = `new:${s.key}:${f.season}`
      editionOf.set(`${s.key}|${f.season}`, tid)
    }
    // bouts already there (an edition loaded from NJ teams' results): the same pair at the same weight
    const have = new Set<string>()
    if (existed) {
      for (let o = 0; ; o += 1000) {
        const { data: b } = await db.from('tournament_bouts').select('weight_class, wrestler1_id, wrestler2_id, wrestler1_name_raw, wrestler2_name_raw').eq('in_season_tournament_id', tid).order('id').range(o, o + 999)
        for (const x of b ?? []) {
          const wt = parseInt(String(x.weight_class), 10)
          have.add(`${wt}|${[x.wrestler1_id, x.wrestler2_id].sort().join('|')}`)
          // also by one wrestler and the other's printed name (an opponent's profile may not exist yet in a dry run)
          if (x.wrestler1_id) have.add(`${wt}|${x.wrestler1_id}|${String(x.wrestler2_name_raw ?? '').toLowerCase()}`)
          if (x.wrestler2_id) have.add(`${wt}|${x.wrestler2_id}|${String(x.wrestler1_name_raw ?? '').toLowerCase()}`)
        }
        if (!b || b.length < 1000) break
      }
    }
    // rounds per weight. A year whose event mixes youth brackets in (Powerade 2015–2017: 38 "weights", 2–3 finals at a
    // high school weight): keep the series' high school weights, and at each the largest bracket — brackets are separate
    // groups of wrestlers who meet each other
    const fileWeights = new Set(f.rows.map(r => parseInt(r['Weight'], 10)))
    const mixed = fileWeights.size > 16
    const ladder = new Set(files.filter(x => x.series.key === s.key && new Set(x.rows.map(r => parseInt(r['Weight'], 10))).size <= 16).flatMap(x => x.rows.map(r => parseInt(r['Weight'], 10))))
    boutStart = parseInt(f.season, 10)
    const rowsUsed = mixed ? largestBrackets(f.rows.filter(r => ladder.has(parseInt(r['Weight'], 10)))) : f.rows
    if (mixed) report.push(`  ${s.name} ${f.season}: youth brackets mixed in — kept ${new Set(rowsUsed.map(r => r['Weight'])).size} high school weights, ${rowsUsed.length} of ${f.rows.length} rows`)
    fileCtx = { outOfNj: !!s.outOfNj, host: s.host, rows: rowsUsed, series: s.name }
    await loadEditionSchools(tid)
    const byWeight = new Map<number, { r: Row; b: HistBoutIn }[]>()
    for (const r of rowsUsed) {
      const w = parseInt(r['Weight'], 10)
      const b: HistBoutIn = { weight: w, round: r['Round'] ?? '', winner: `${r['Winning Wrestler']}|${r['Winning Team']}`, loser: r['Losing Wrestler'] ? `${r['Losing Wrestler']}|${r['Losing Team']}` : null, bye: /bye/i.test(r['Win Type'] ?? '') }
      ;(byWeight.get(w) ?? byWeight.set(w, []).get(w)!).push({ r, b })
    }
    const rows: Record<string, unknown>[] = []
    const placeRows: Record<string, unknown>[] = []
    let fileHeld = 0, fileHad = 0
    for (const [w, list] of byWeight) {
      const coded = codeRounds(list.map(x => x.b))
      for (let i = 0; i < list.length; i++) {
        const { r } = list[i], code = coded[i].code
        if (coded[i].bye || !r['Losing Wrestler']) continue
        const res = result(r['Win Type'] ?? '', r['Result'] ?? '')
        if (!res || (res.db_type === null && res.winner === null)) continue
        const wTeam = splitTeam(r['Winning Team'] ?? '').name.toLowerCase(), lTeam = splitTeam(r['Losing Team'] ?? '').name.toLowerCase()
        const ws = await schoolIdFor(wTeam, r['Winning Team'] ?? ''), ls = await schoolIdFor(lTeam, r['Losing Team'] ?? '')
        if (ws === 'noteam' || ls === 'noteam') { held.noTeam++; fileHeld++; continue }
        if (ws === 'waiting' || ls === 'waiting') { held.team++; fileHeld++; for (const [x, t] of [[ws, r['Winning Team']], [ls, r['Losing Team']]] as const) if (x === 'waiting') waitingTeams.set(`${t} (${s.name} ${f.season})`, (waitingTeams.get(`${t} (${s.name} ${f.season})`) ?? 0) + 1); continue }
        const w1 = await wrestlerFor(r['Winning Wrestler'], ws, w), w2 = await wrestlerFor(r['Losing Wrestler'], ls, w)
        if (w1 === 'waiting' || w2 === 'waiting') { held.wrestler++; fileHeld++; continue }
        if (!w1 || !w2) { held.noName++; fileHeld++; continue }
        // placements from the placement matches (also when the bout itself is already on file)
        const place = code === 'F' ? 1 : code === '3rd_Place' ? 3 : code === '5th_Place' ? 5 : code === '7th_Place' ? 7 : null
        if (place) for (const [p, wid, sid, nm, sch] of [[place, w1, ws.id, r['Winning Wrestler'], r['Winning Team']], [place + 1, w2, ls.id, r['Losing Wrestler'], r['Losing Team']]] as const) {
          placeRows.push({ in_season_tournament_id: tid, weight_class: w, place: p, bracket: '', wrestler_id: wid, school_id: sid, wrestler_name_raw: nm, school_name_raw: sch })
        }
        if (have.has(`${w}|${[w1, w2].sort().join('|')}`) || have.has(`${w}|${w1}|${r['Losing Wrestler'].toLowerCase()}`) || have.has(`${w}|${w2}|${r['Winning Wrestler'].toLowerCase()}`)) { boutsHad++; fileHad++; continue }
        rows.push({
          in_season_tournament_id: tid, weight_class: w, round: code ?? 'UNK',
          wrestler1_name_raw: r['Winning Wrestler'], wrestler1_school_raw: r['Winning Team'], wrestler1_school_id: ws.id, wrestler1_id: w1,
          wrestler2_name_raw: r['Losing Wrestler'], wrestler2_school_raw: r['Losing Team'], wrestler2_school_id: ls.id, wrestler2_id: w2,
          winner: 1, result_type: res.db_type, result_detail: res.db_detail, fall_time_seconds: res.fall_time_seconds,
          result_time_estimated: res.result_time_estimated, winner_score: res.winner_score, loser_score: res.loser_score, source_format: 'csv',
        })
      }
    }
    // an edition already here keeps the placements it has and gets the places it's missing (Kyle 2026-11-21: Powerade
    // 2025-26's podium held only the NJ placers — "if we are going to show the podium we have to show everyone")
    // one placement per weight and place: a slot two matches claim is reported and left out
    const slotCount = new Map<string, number>()
    for (const x of placeRows) slotCount.set(`${x.weight_class}|${x.place}`, (slotCount.get(`${x.weight_class}|${x.place}`) ?? 0) + 1)
    const clash = [...slotCount].filter(([, n]) => n > 1).map(([k]) => k)
    if (clash.length) report.push(`  ${s.name} ${f.season}: ${clash.length} places claimed twice, left out (${clash.slice(0, 8).join(', ')}${clash.length > 8 ? ' …' : ''})`)
    let placementsToWrite = placeRows.filter(x => slotCount.get(`${x.weight_class}|${x.place}`) === 1)
    if (existed && tid) {
      const { data: had } = await db.from('tournament_placements').select('weight_class, place').eq('in_season_tournament_id', tid)
      const filled = new Set((had ?? []).map(x => `${x.weight_class}|${x.place}`))
      placementsToWrite = placeRows.filter(x => !filled.has(`${x.weight_class}|${x.place}`))
    }
    boutsNew += rows.length; placementsNew += placementsToWrite.length
    report.push(`${s.name} ${f.season} ${existed ? '(on file)' : '(new)'}: ${rows.length} bouts to add${fileHad ? `, ${fileHad} already there` : ''}${fileHeld ? `, ${fileHeld} held back` : ''}, ${placementsToWrite.length} placements`)
    if (!APPLY) continue
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await db.from('tournament_bouts').insert(rows.slice(i, i + 500))
      if (error) throw new Error(`bouts ${s.name} ${f.season}: ${error.message}`)
    }
    for (let i = 0; i < placementsToWrite.length; i += 500) {
      const { error } = await db.from('tournament_placements').upsert(placementsToWrite.slice(i, i + 500), { onConflict: 'in_season_tournament_id,weight_class,place,bracket' })
      if (error) throw new Error(`placements ${s.name} ${f.season}: ${error.message}`)
    }
    // seeds from the bracket PDF (scripts/flo_pdf_rounds.py → data/history/seeds/<file name>; Kyle 2026-11-21: "can
    // we also seed them?"): each seed's wrestler is the one of that name at that weight in this file; a seed already
    // on file for the weight stays
    const seedFile = `data/history/seeds/${f.file}`
    if (tid && existsSync(seedFile)) {
      const seedRows = readCsv(seedFile).filter(x => eventKind(x['Event'] ?? '') === 'boys')
      const { data: had } = await db.from('in_season_tournament_seeds').select('weight_class, seed').eq('in_season_tournament_id', tid)
      const taken = new Set((had ?? []).map(x => `${x.weight_class}|${x.seed}`))
      const add: Record<string, unknown>[] = []
      for (const x of seedRows) {
        const w = parseInt(x['Weight'], 10), sd = parseInt(x['Seed'], 10)
        if (taken.has(`${w}|${sd}`)) continue
        const r = rowsUsed.find(r => parseInt(r['Weight'], 10) === w && [r['Winning Wrestler'], r['Losing Wrestler']].some(n => (n ?? '').toLowerCase() === x['Wrestler'].toLowerCase()))
        if (!r) continue
        const team = (r['Winning Wrestler'] ?? '').toLowerCase() === x['Wrestler'].toLowerCase() ? r['Winning Team'] : r['Losing Team']
        const sc = await schoolIdFor(splitTeam(team ?? '').name.toLowerCase(), team ?? '')
        if (typeof sc === 'string') continue
        const wid = await wrestlerFor(x['Wrestler'], sc, w)
        if (!wid || wid === 'waiting' || wid.startsWith('new-')) continue
        add.push({ in_season_tournament_id: tid, weight_class: w, seed: sd, wrestler_name_raw: x['Wrestler'], school_name_raw: team, wrestler_id: wid, school_id: sc.id })
        taken.add(`${w}|${sd}`)
      }
      if (add.length) { const { error } = await db.from('in_season_tournament_seeds').insert(add); if (error) throw new Error(`seeds ${s.name} ${f.season}: ${error.message}`) }
      seedsAdded += add.length
    }
  }
  // each edition linked to the season before (prior_id), where it isn't already
  if (APPLY) {
    const { data: eds } = await db.from('in_season_tournaments').select('id, season, prior_id').eq('name', s.name).order('season')
    for (let i = 1; i < (eds ?? []).length; i++) if (!eds![i].prior_id) await db.from('in_season_tournaments').update({ prior_id: eds![i - 1].id }).eq('id', eds![i].id)
  }
}
if (APPLY && links.length) await saveNameLinks(db as never, links)

console.log(report.join('\n'))
console.log(`\n${APPLY ? 'Written' : 'Would write'}: ${editionsNew} new editions, ${boutsNew} bouts (${boutsHad} already on file), ${placementsNew} placements; new out-of-state schools ${created.schools}, new NJ profiles ${created.njProfiles}, new out-of-state profiles ${created.oosProfiles}`)
if (APPLY) console.log(`seeds added: ${seedsAdded}`)
if (waitingTeams.size) console.log(`teams waiting: ${[...waitingTeams].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ×${n}`).join(', ')}`)
if (newSchoolNames.length) console.log(`new out-of-state schools: ${newSchoolNames.join(', ')}`)
if (REUSE.size) console.log(`reused ${reused} profiles from the failed run; left unused: ${[...REUSE.values()].flat().length}`)
console.log(`Timing: ${timingRejected} name matches more than 4 seasons from the bout treated as different wrestlers`)
console.log(`Held back: ${held.team} bouts with a team waiting in the review, ${held.wrestler} with an NJ wrestler waiting, ${held.noName} with a one-word name (no profile possible), ${held.noTeam} with no team printed`)
console.log(APPLY ? 'done' : 'dry run — nothing written')
