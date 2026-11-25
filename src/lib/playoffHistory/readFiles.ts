// Playoff History: reads the past-season postseason exports Kyle downloads (2026-11-13) from ~/Desktop/wrestling_brackets/History/<year>/:
// one TrackWrestling bout export per district / region / state tournament (cells written ="..."), plus the state
// bracket PDF from FloWrestling. Columns: Date, Weight, Round, Winning Wrestler, Winning Team, Result, Win Type,
// Losing Wrestler, Losing Team, City, State, Event. A file's event comes from its Event column, not its name.
import fs from 'fs'
import path from 'path'
import { floBoutOrder } from './floBoutOrder'

export const HISTORY_DIR = path.join(process.env.HOME ?? '', 'Desktop/wrestling_brackets/History')
// girls: History/Girls/<year>/ (Kyle's 2019-2024 region + state exports and the Flo state PDFs; copied 2026-11-13
// from Whizzer Upload/Girls History, which scripts/load_girls_history_20261113.mts still reads)
export const yearDir = (year: number, gender: 'M' | 'F' = 'M') => path.join(HISTORY_DIR, ...(gender === 'F' ? ['Girls'] : []), String(year))

// girls regions by number, as the site keys them (Girl_s Regions r1-r4) plus the 2020-2022 two-region North
export const GIRLS_REGION: Record<number, string> = { 1: 'North I', 2: 'North II', 3: 'Central', 4: 'South', 5: 'North' }
// boys 2020-21 (COVID): no districts; four named super regions, then a 16-man state
export const BOYS_NAMED_REGION: Record<number, string> = { 1: 'North 1', 2: 'North 2', 3: 'Central', 4: 'South' }

export type HistRow = {
  file: string; date: string; weight: string; round: string; winner: string; winnerTeam: string; result: string
  winType: string; loser: string; loserTeam: string; city: string; event: string
}
export type HistEvent = {
  year: number; kind: 'district' | 'region' | 'state'; num: number | null; event: string; files: string[]; rows: HistRow[]
  boutOrder?: Map<number, Map<string, { num: number; result: string }[]>>   // weight → "lastA|lastB" → Flo bouts (exports with no rounds)
}

const cells = (line: string) => [...line.matchAll(/"((?:[^"]|"")*)"/g)].map(m => m[1].replace(/""/g, '"').replace(/^="?|"$/g, '').trim())

export function readCsv(file: string): HistRow[] {
  const lines = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim())
  const head = cells(lines[0])
  const col = (name: string) => head.findIndex(h => h.toLowerCase() === name.toLowerCase())
  const idx = Object.fromEntries(['Date', 'Weight', 'Round', 'Winning Wrestler', 'Winning Team', 'Result', 'Win Type', 'Losing Wrestler', 'Losing Team', 'City', 'Event'].map(n => [n, col(n)]))
  const missing = Object.entries(idx).filter(([, i]) => i < 0).map(([n]) => n)
  if (missing.length) throw new Error(`${path.basename(file)}: no column ${missing.join(', ')}`)
  return lines.slice(1).map(l => {
    const c = cells(l), g = (n: string) => c[idx[n]] ?? ''
    return { file: path.basename(file), date: g('Date'), weight: g('Weight'), round: g('Round'), winner: g('Winning Wrestler'), winnerTeam: g('Winning Team'), result: g('Result'), winType: g('Win Type'), loser: g('Losing Wrestler'), loserTeam: g('Losing Team'), city: g('City'), event: g('Event') }
  })
}

export function kindOf(event: string): { kind: HistEvent['kind']; num: number | null } | null {
  // girls: "NJSIAA District Girls Region-North II", "NJSIAA Girls South Region", "NJSIAA Girls Region Championships" (2019: all regions, split later)
  if (/girls/i.test(event) && /region/i.test(event)) {
    const r = /north\s*ii\b/i.test(event) ? 2 : /north\s*i\b/i.test(event) ? 1 : /central/i.test(event) ? 3 : /south/i.test(event) ? 4 : /north/i.test(event) ? 5 : 0
    return { kind: 'region', num: r }
  }
  const d = /district\s*(\d+)/i.exec(event); if (d) return { kind: 'district', num: Number(d[1]) }
  // boys 2021: "NJSIAA Region - North 1", "NJSIAA Region - North 2 @Union HS - April 2021", "NJSIAA Central Region"
  if (/region/i.test(event) && /north|south|central/i.test(event)) {
    const r = /north\W*2\b/i.test(event) ? 2 : /north\W*1\b/i.test(event) ? 1 : /central/i.test(event) ? 3 : /south/i.test(event) ? 4 : 0
    return { kind: 'region', num: r }
  }
  const r = /region\s*(\d+)/i.exec(event); if (r) return { kind: 'region', num: Number(r[1]) }
  if (/state/i.test(event)) return { kind: 'state', num: null }
  return null
}

/** Every event in a year's folder, grouped by the Event column; exact duplicate files are skipped. */
export function readYear(year: number, gender: 'M' | 'F' = 'M'): { events: HistEvent[]; skipped: string[]; pdfs: string[] } {
  const dir = yearDir(year, gender)
  if (!fs.existsSync(dir)) return { events: [], skipped: [], pdfs: [] }
  const files = fs.readdirSync(dir).filter(f => !f.startsWith('.'))
  const seen = new Map<string, string>(), skipped: string[] = []
  const by = new Map<string, HistEvent>()
  for (const f of files.filter(f => f.toLowerCase().endsWith('.csv')).sort()) {
    const buf = fs.readFileSync(path.join(dir, f), 'utf8')
    if (seen.has(buf)) { skipped.push(`${f} (same as ${seen.get(buf)})`); continue }
    seen.set(buf, f)
    for (const r of readCsv(path.join(dir, f))) {
      const k = kindOf(r.event)
      const key = k ? `${k.kind}|${k.num ?? ''}` : `?|${r.event}`
      const ev = by.get(key) ?? by.set(key, { year, kind: k?.kind ?? 'district', num: k?.num ?? null, event: r.event, files: [], rows: [] }).get(key)!
      if (!ev.files.includes(f)) ev.files.push(f)
      ev.rows.push(r)
    }
  }
  let events = [...by.values()]
  // one file with every region (girls 2019): split each weight's bouts into their separate brackets, then name each
  // bracket by where its schools wrestled the next season
  const combined = events.find(e => e.kind === 'region' && e.num === 0)
  if (combined) {
    const next = readYear(year + 1, gender).events.filter(e => e.kind === 'region' && e.num)
    const regionOfTeam = new Map<string, number>()
    for (const e of next) for (const r of e.rows) for (const t of [r.winnerTeam, r.loserTeam]) if (t) regionOfTeam.set(t, e.num!)
    const parts = new Map<number, HistEvent>()
    for (const w of new Set(combined.rows.map(r => r.weight))) {
      const rows = combined.rows.filter(r => r.weight === w)
      // connected brackets: wrestlers joined by their bouts
      const parent = new Map<string, string>()
      const find = (x: string): string => { const p = parent.get(x) ?? x; if (p === x) return x; const r = find(p); parent.set(x, r); return r }
      const key = (n: string, t: string) => `${n}|${t}`
      for (const r of rows) { const a = key(r.winner, r.winnerTeam); parent.set(a, find(a)); if (r.loser) { const b = key(r.loser, r.loserTeam); parent.set(find(b), find(a)) } }
      const groups = new Map<string, HistRow[]>()
      for (const r of rows) { const g = find(key(r.winner, r.winnerTeam)); (groups.get(g) ?? groups.set(g, []).get(g)!).push(r) }
      for (const g of groups.values()) {
        const votes: Record<number, number> = {}
        for (const r of g) for (const t of [r.winnerTeam, r.loserTeam]) { const n = regionOfTeam.get(t); if (n) votes[n] = (votes[n] ?? 0) + 1 }
        const num = Number(Object.entries(votes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0)
        const ev = parts.get(num) ?? parts.set(num, { year, kind: 'region', num, event: `${combined.event} (${GIRLS_REGION[num] ?? 'unplaced'})`, files: combined.files, rows: [] }).get(num)!
        ev.rows.push(...g)
      }
    }
    events = [...events.filter(e => e !== combined), ...parts.values()]
  }
  // an event whose export has no round names: its Flo bracket PDF ("NJSIAA Region 7 - Brackets - FloWrestling.pdf") gives the order
  for (const e of events) {
    if (e.kind === 'state' || e.rows.some(r => r.round.trim())) continue
    const pdf = files.find(f => f.toLowerCase().endsWith('.pdf') && new RegExp(`${e.kind}\\s*${e.num}\\b`, 'i').test(f))
    if (!pdf) continue
    const weights = [...new Set(e.rows.map(r => Number(r.weight)))]
    const order = new Map<number, Map<string, { num: number; result: string }[]>>()
    for (const b of floBoutOrder(path.join(dir, pdf), weights)) {
      const m = order.get(b.weight) ?? order.set(b.weight, new Map()).get(b.weight)!
      const [a, c] = [b.a.split('|')[0], b.b.split('|')[0]]
      for (const k of [`${a}|${c}`, `${c}|${a}`]) (m.get(k) ?? m.set(k, []).get(k)!).push({ num: b.num, result: b.result })
    }
    e.boutOrder = order
  }
  return { events, skipped, pdfs: files.filter(f => f.toLowerCase().endsWith('.pdf') && /state/i.test(f)) }
}
