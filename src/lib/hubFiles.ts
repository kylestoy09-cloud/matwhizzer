// Tournament hub uploads (Kyle 2026-11-12: "make parsers so that i can just upload those files to the site").
// Reads the files in the browser — some rosters are 15 MB, past what the server accepts — and turns them
// into podium rows for the hub import (individual tournaments only; duals aren't tracked):
//   * TrackWrestling bout export (CSV, cells like ="10/24/2026"): every bout. Bouts that link wrestlers
//     form one bracket (two divisions at one weight stay apart); places from the placement bouts
//     ("Finals", "Nth Place"), round robins by record, and below the placement bouts tied groups — everyone
//     eliminated in the same consolation round shares a place (9th–12th, 13th–16th…), to the bottom.
//   * Roster (TrackWrestling / FloArena page saved as RTF or text: "Last, First", team or state, weight,
//     [scale weight], [grade], division, [bracket]): names each bracket's division and gives grades.
//   * USA Bracketing placements (copied page: "JR Boys FS - 106" then "1st - Name (State)").
//   * Mobbin bracket PDF (one bracket; ✅ winner / ❌ loser): 1st–4th; weight and division typed in.

export type FileKind = 'bouts' | 'roster' | 'placements' | 'bracket-pdf' | 'duals' | 'unknown'
export type PodiumOut = { division: string; weight: string; place: number; place_to: number | null; name: string; team: string; state: string | null; style: 'folkstyle' | 'freestyle' | 'greco'; grade: number | null }

// ── RTF → text ───────────────────────────────────────────────────────────────

const SKIP_GROUPS = new Set(['fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'listtable', 'listoverridetable', 'rsidtbl', 'generator', 'xmlnstbl', 'themedata', 'colorschememapping', 'latentstyles', 'datastore', 'expandedcolortbl'])
const CP1252: Record<number, string> = { 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x96: '–', 0x97: '—', 0x85: '…' }

/** Plain text from an RTF document (paragraphs become lines; formatting dropped). */
export function rtfToText(rtf: string): string {
  if (!rtf.startsWith('{\\rtf')) return rtf
  let out = '', i = 0, depth = 0, skipDepth = -1, uc = 1, pendingSkip = 0
  const n = rtf.length
  while (i < n) {
    const ch = rtf[i]
    if (ch === '{') { depth++; i++; continue }
    if (ch === '}') { if (skipDepth === depth) skipDepth = -1; depth--; i++; continue }
    if (ch === '\\') {
      const nx = rtf[i + 1]
      if (nx === '\\' || nx === '{' || nx === '}') { if (skipDepth < 0) out += nx; i += 2; continue }
      if (nx === '\'') { const code = parseInt(rtf.substr(i + 2, 2), 16); if (skipDepth < 0) { if (pendingSkip) pendingSkip--; else out += CP1252[code] ?? String.fromCharCode(code) } i += 4; continue }
      if (nx === '*') { if (skipDepth < 0) skipDepth = depth; i += 2; continue }
      if (nx === '\n' || nx === '\r') { if (skipDepth < 0) out += '\n'; i += 2; continue }
      const m = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(rtf.slice(i, i + 40))
      if (!m) { i += 2; continue }
      const word = m[1], arg = m[2]
      i += m[0].length
      if (skipDepth >= 0) continue
      if (SKIP_GROUPS.has(word)) { skipDepth = depth; continue }
      if (word === 'par' || word === 'line' || word === 'row') out += '\n'
      else if (word === 'tab' || word === 'cell') out += '\t'
      else if (word === 'uc') uc = Number(arg ?? 1)
      else if (word === 'u') { let c = Number(arg); if (c < 0) c += 65536; out += String.fromCharCode(c); pendingSkip = uc }
      continue
    }
    if (ch === '\r' || ch === '\n') { i++; continue }
    if (skipDepth < 0) { if (pendingSkip) pendingSkip--; else out += ch }
    i++
  }
  return out
}

// ── Kind ─────────────────────────────────────────────────────────────────────

export function detectKind(name: string, text: string): FileKind {
  if (/\.pdf$/i.test(name)) return 'bracket-pdf'
  const head = text.slice(0, 600)
  // a duals page copied whole: dual after dual, "TEAM A" / " - " / "TEAM B" / score / " - " / score (before the
  // roster check: the page carries its roster too)
  if ((text.match(/\n[^\n\t]{2,80}\n\s*-\s*\n[^\n\t]{2,80}\n\d+\n\s*-\s*\n\d+\n/g) ?? []).length >= 3) return 'duals'
  if (/^\S+ lbs(?: - .+)?\s*$/m.test(text) && /^1st\b/m.test(text)) return 'placements'   // FloArena Results page (before the roster check: its pages hold commas too)
  if (/Winning Wrestler/.test(head) && /Losing Wrestler/.test(head)) return 'bouts'
  if (/^[\s•·*]*\d+(st|nd|rd|th) - .+\([^)]+\)\s*$/m.test(text) && /^.+ - \d+\s*$/m.test(text)) return 'placements'
  if (/(FS|GR)[\t\n]+\d{1,2}[\t\n]+\d{2,3}[\t\n]+[^\t\n]+\([^\t\n]*\)/.test(text)) return 'placements'   // FloArena
  if (/^[^,\n]+, [^,\n]+\n/m.test(text)) return 'roster'
  return 'unknown'
}

// ── Bout export ──────────────────────────────────────────────────────────────

export type Bout = { weight: string; round: string; winner: string; winTeam: string; loser: string; loseTeam: string; winType: string; result: string; date: string; event: string }

function csvCells(line: string): string[] {
  const out: string[] = []; let cur = '', q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++ } else q = !q }
    else if (c === ',' && !q) { out.push(cur); cur = '' } else cur += c
  }
  out.push(cur)
  return out.map(c => c.replace(/^=/, '').replace(/^"|"$/g, '').trim())
}

export function parseBoutExport(text: string): Bout[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  const head = csvCells(lines[0]), col = (n: string) => head.indexOf(n)
  const [iW, iR, iWW, iWT, iT, iLW, iLT, iD, iE, iRes] = ['Weight', 'Round', 'Winning Wrestler', 'Winning Team', 'Win Type', 'Losing Wrestler', 'Losing Team', 'Date', 'Event', 'Result'].map(col)
  return lines.slice(1).map(l => csvCells(l)).map(c => ({ weight: c[iW], round: c[iR], winner: c[iWW], winTeam: c[iWT] ?? '', loser: c[iLW] ?? '', loseTeam: c[iLT] ?? '', winType: c[iT] ?? '', result: iRes >= 0 ? c[iRes] ?? '' : '', date: c[iD] ?? '', event: c[iE] ?? '' }))
}

type Person = { name: string; team: string }
export type Bracket = { weight: string; bouts: Bout[]; people: Person[]; division?: string }   // division: set when split by the roster
const pkey = (w: string, n: string, t: string) => `${w}\u0000${n}\u0000${t}`

/** Bouts that link wrestlers form one bracket. */
export function bracketsFrom(bouts: Bout[]): Bracket[] {
  const par = new Map<string, string>()
  const find = (x: string): string => { let r = x; while ((par.get(r) ?? r) !== r) r = par.get(r)!; let y = x; while (y !== r) { const nx = par.get(y)!; par.set(y, r); y = nx } if (!par.has(r)) par.set(r, r); return r }
  for (const b of bouts) {
    const a = find(pkey(b.weight, b.winner, b.winTeam))
    if (b.loser) { const c = find(pkey(b.weight, b.loser, b.loseTeam)); if (a !== c) par.set(c, a) }
  }
  const groups = new Map<string, Bracket>()
  for (const b of bouts) {
    const k = find(pkey(b.weight, b.winner, b.winTeam))
    const g = groups.get(k) ?? groups.set(k, { weight: b.weight, bouts: [], people: [] }).get(k)!
    g.bouts.push(b)
  }
  for (const g of groups.values()) {
    const seen = new Map<string, Person>()
    for (const b of g.bouts) { seen.set(`${b.winner}|${b.winTeam}`, { name: b.winner, team: b.winTeam }); if (b.loser) seen.set(`${b.loser}|${b.loseTeam}`, { name: b.loser, team: b.loseTeam }) }
    g.people = [...seen.values()]
  }
  return [...groups.values()]
}

/** A bracket's places: placement bouts, round robin by record, then tied groups to the bottom. */
/** Two draws stuck together: kids entered in both freestyle and Greco (or two pools with the same kids) join one
 *  bracket, and the export doesn't say which bout belongs to which. Such a bracket has more than one final; it
 *  can't be placed, so it is left out and reported, never guessed. */
export function mergedBracket(b: Bracket): boolean {
  return b.bouts.filter(x => x.loser && /^(finals|1st place)/i.test(x.round)).length > 1
}

/** Pull a stuck-together bracket apart by the roster when every bout's two kids share exactly one division at
 *  that weight (NHSCA: Junior, Senior and Sophomore 152 joined through a kid). Each part must have at most one
 *  final; otherwise null (Freestyle + Greco with the same kids, Journeymen's tiered hammer brackets). */
export function splitByRoster(b: Bracket, byName: Map<string, RosterEntry[]>): Bracket[] | null {
  const sameWeight = (h: RosterEntry) => h.weight === b.weight || (Number(h.weight) > 0 && Number(h.weight) === Number(b.weight))
  const kid = (name: string, team: string) => `${name}|${team}`
  // each kid's divisions at this weight from the roster (the club as written tells a kid's two entries apart:
  // "Este Built WC" freestyle, "Estebuilt WC" Greco)
  const known = new Map<string, Set<string>>(), fullName = new Map<string, string>()   // one division under two names counts once
  for (const p of b.people) {
    const hits = byName.get(p.name.toLowerCase()) ?? []
    const sameTeam = hits.filter(h => h.team.toLowerCase() === p.team.toLowerCase())
    let pick = sameTeam.length ? sameTeam : hits
    if (pick.some(sameWeight)) pick = pick.filter(sameWeight)
    if (pick.length) known.set(kid(p.name, p.team), new Set(pick.map(h => baseDiv(h.division))))
    for (const h of pick) if ((fullName.get(baseDiv(h.division))?.length ?? 0) < h.division.length) fullName.set(baseDiv(h.division), h.division)
  }
  const all = new Set([...known.values()].flatMap(d => [...d]))
  if (all.size < 2) return null
  const of = new Map<Bout, string>()
  const sizes = new Map<string, number>()   // draw sizes, cleared whenever a bout is placed
  const assign = (x: Bout, d: string) => { of.set(x, d); sizes.clear() }
  const sides = (x: Bout) => (x.loser ? [kid(x.winner, x.winTeam), kid(x.loser, x.loseTeam)] : [kid(x.winner, x.winTeam)])
  const boutsOf = new Map<string, Bout[]>()
  for (const x of b.bouts) for (const k of sides(x)) boutsOf.set(k, [...(boutsOf.get(k) ?? []), x])
  // a kid not on the roster: any division at first; later, the divisions of the bouts already placed for them
  let late = false
  const setOf = (k: string) => {
    const d = known.get(k)
    if (d) return d
    if (!late) return all
    const got = new Set((boutsOf.get(k) ?? []).filter(y => of.has(y)).map(y => of.get(y)!))
    return got.size ? got : all
  }
  // a kid wrestles once per round in a bracket
  const usedIn = (x: Bout, k: string) => new Set((boutsOf.get(k) ?? []).filter(y => y !== x && of.has(y) && y.round === x.round).map(y => of.get(y)!))
  // Double elimination: no championship bout after a loss in that draw; no consolation bout without a loss
  // in it first; nothing after a second loss in it
  const champ = (r: string) => { const m = /^Round of (\d+)$/.exec(r); return m ? -Number(m[1]) : r === 'Quarter-Finals' ? -8 : r === 'Semi-Finals' ? -4 : r === 'Finals' ? -2 : null }
  const consi = (r: string) => { const m = /^Consi of (\d+)(?: #(\d))?$/.exec(r); return m ? 1000 - Number(m[1]) * 10 + Number(m[2] ?? 1) : r === 'Consi-Semis' ? 1000 : /^\d+(st|nd|rd|th) Place$/.test(r) && r !== '1st Place' ? 1100 : null }
  const lostBy = (k: string) => (boutsOf.get(k) ?? []).filter(y => y.loser && kid(y.loser, y.loseTeam) === k)
  // how big a draw can be: its largest championship round among bouts that are, or could be, in it
  const sizeOf = (d: string) => {
    if (!sizes.has(d)) sizes.set(d, Math.max(0, ...b.bouts.filter(y => champ(y.round) != null && (of.get(y) === d || (!of.has(y) && sides(y).every(k => setOf(k).has(d))))).map(y => -champ(y.round)!)))
    return sizes.get(d)!
  }
  const fitsPath = (x: Bout, k: string, d: string) => {
    const losses = lostBy(k).filter(y => y !== x)
    const inD = losses.filter(y => of.get(y) === d)
    const cx = champ(x.round), sx = consi(x.round)
    if (cx != null) {
      if (inD.some(y => { const c = champ(y.round); return c != null && c < cx })) return false
      // losing here ends the championship run in this draw: no later championship bout in it
      const losesHere = x.loser && kid(x.loser, x.loseTeam) === k
      return !(losesHere && (boutsOf.get(k) ?? []).some(y => y !== x && of.get(y) === d && (champ(y.round) ?? -Infinity) > cx))
    }
    if (sx == null) return true
    // "Consi of 8" exists only in a draw of 16 or more: the draw must reach that size
    const m = /^Consi of (\d+)/.exec(x.round)
    if (m && sizeOf(d) < 2 * Number(m[1])) return false
    const champLosses = losses.filter(y => champ(y.round) != null)
    if (champLosses.length && champLosses.every(y => of.has(y)) && !champLosses.some(y => of.get(y) === d)) return false
    const before = inD.filter(y => champ(y.round) != null || (consi(y.round) ?? 9999) < sx)
    return before.length < 2
  }
  // a championship round holds so many bouts per draw: 8 in the Round of 16, 4 quarterfinals, 2 semis, 1 final
  // (not in pool formats: Journeymen runs several crossover brackets in one division)
  const pooled = new Set(b.bouts.filter(y => /^RR /i.test(y.round)).flatMap(y => sides(y).flatMap(k => [...(known.get(k) ?? [])])))
  const full = (x: Bout, d: string) => {
    const c = champ(x.round)
    return c != null && !pooled.has(d) && b.bouts.filter(y => y !== x && y.round === x.round && of.get(y) === d).length >= -c / 2
  }
  const candOf = (x: Bout) => {
    let c = [...all].filter(d => !full(x, d))
    for (const k of sides(x)) { const s = setOf(k), u = usedIn(x, k); c = c.filter(d => s.has(d) && !u.has(d) && fitsPath(x, k, d)) }
    return c
  }
  for (let changed = true; changed;) {
    changed = false
    for (const x of b.bouts) {
      if (of.has(x)) continue
      const c = candOf(x)
      if (c.length === 1) { assign(x, c[0]); changed = true }
    }
    if (!changed) {
      // the same two kids twice in one round with the same winner: one bout to each division (the places agree either way)
      for (const x of b.bouts) {
        if (of.has(x) || !x.loser) continue
        const twin = b.bouts.find(y => y !== x && !of.has(y) && y.round === x.round && y.winner === x.winner && y.loser === x.loser)
        const c = candOf(x)
        if (twin && c.length === 2) { assign(x, c[0]); assign(twin, c[1]); changed = true; break }
      }
    }
    if (!changed) {
      // a kid who wrestled up (a Freshman on the roster, every opponent a Junior) takes their opponents' division
      for (const p of b.people) {
        const me = kid(p.name, p.team)
        const open = b.bouts.filter(x => !of.has(x) && x.loser && sides(x).includes(me) && candOf(x).length === 0)
        if (!open.length) continue
        const votes = new Map<string, number>()
        for (const x of open) for (const k of sides(x)) if (k !== me) { const d = known.get(k); if (d?.size === 1) votes.set([...d][0], (votes.get([...d][0]) ?? 0) + 1) }
        const r = [...votes].sort((a, z) => z[1] - a[1])
        const was = known.get(me)
        if (r.length && r[0][1] >= 2 && (r.length === 1 || r[0][1] > 2 * r[1][1]) && !(was?.size === 1 && was.has(r[0][0]))) { known.set(me, new Set([r[0][0]])); sizes.clear(); changed = true }
      }
    }
    if (!changed && !late) { late = true; changed = true }
  }
  // a bye that can't be placed (two kids with one name) doesn't change any place; any other bout must be placed
  if (typeof process !== 'undefined' && process.env?.SPLIT_DEBUG) for (const x of b.bouts.filter(x => !of.has(x) && x.loser)) console.log('  UNPLACED', x.round, x.winner, 'v', x.loser, candOf(x))
  if (b.bouts.some(x => !of.has(x) && x.loser)) return null
  const parts = new Map<string, Bout[]>()
  for (const x of b.bouts) if (of.has(x)) parts.set(of.get(x)!, [...(parts.get(of.get(x)!) ?? []), x])
  if (parts.size < 2) return null
  const out = [...parts].flatMap(([division, bouts]) => bracketsFrom(bouts).map(x => ({ ...x, division: fullName.get(division) ?? division })))
  return out.some(x => mergedBracket(x) && !tieredPlaces(x)) ? null : out
}

/** Journeymen-style pools (Kyle 2026-11-12): round-robin pools, then crossover brackets by pool finish — pool
 *  winners in the championship bracket, runners-up in the next, and so on — each with its own final. Without the
 *  pool rounds the crossover brackets fall apart; they rank by their kids' pool records (best first), and places
 *  run on from one to the next. Null when it isn't that shape. */
export function tieredPlaces(b: Bracket): { person: Person; place: number; place_to: number | null }[] | null {
  const isRR = (x: Bout) => /^RR /i.test(x.round)
  const rr = b.bouts.filter(isRR), rest = b.bouts.filter(x => !isRR(x))
  if (!rr.length || !rest.length) return null
  const tiers = bracketsFrom(rest).filter(contested)
  if (tiers.length < 2 || tiers.some(mergedBracket)) return null
  const id = (n: string, t: string) => `${n}|${t}`
  const w = new Map<string, number>(), g = new Map<string, number>()
  for (const x of rr.filter(x => x.loser)) {
    w.set(id(x.winner, x.winTeam), (w.get(id(x.winner, x.winTeam)) ?? 0) + 1)
    for (const k of [id(x.winner, x.winTeam), id(x.loser, x.loseTeam)]) g.set(k, (g.get(k) ?? 0) + 1)
  }
  const pct = (t: Bracket) => { const ks = t.people.map(p => id(p.name, p.team)); return ks.reduce((a, k) => a + (w.get(k) ?? 0) / Math.max(1, g.get(k) ?? 0), 0) / ks.length }
  const ranked = tiers.map(t => ({ t, p: pct(t) })).sort((a, z) => z.p - a.p)
  if (ranked.some((r, i) => i && Math.abs(r.p - ranked[i - 1].p) < 1e-9)) return null   // two tiers alike: can't order them
  const out: { person: Person; place: number; place_to: number | null }[] = []
  let base = 0
  for (const { t } of ranked) {
    const ps = placesFrom(t)
    for (const p of ps) out.push({ person: p.person, place: p.place + base, place_to: p.place_to ? p.place_to + base : null })
    base += t.people.length
  }
  // pool kids who reached no crossover bracket share the places after
  const inTier = new Set(out.map(p => id(p.person.name, p.person.team)))
  const left = b.people.filter(p => !inTier.has(id(p.name, p.team)))
  for (const p of left) out.push({ person: p, place: base + 1, place_to: left.length > 1 ? base + left.length : null })
  return out
}

/** Weight labels for brackets that share a division and weight (Journeymen and War at the Shore run several pools
 *  at one weight): "96 Pool A", "96 Pool B"… in file order; a single bracket keeps its weight. */
export function poolWeights(list: { division: string; weight: string }[]): string[] {
  const n = new Map<string, number>(), seen = new Map<string, number>()
  for (const x of list) n.set(`${x.division}|${x.weight}`, (n.get(`${x.division}|${x.weight}`) ?? 0) + 1)
  return list.map(x => {
    const k = `${x.division}|${x.weight}`
    if ((n.get(k) ?? 0) < 2) return x.weight
    const i = seen.get(k) ?? 0; seen.set(k, i + 1)
    return `${x.weight} Pool ${String.fromCharCode(65 + i)}`
  })
}

export function placesFrom(b: Bracket): { person: Person; place: number; place_to: number | null }[] {
  const id = (n: string, t: string) => `${n}|${t}`
  const person = new Map(b.people.map(p => [id(p.name, p.team), p]))
  const real = b.bouts.filter(x => x.loser)
  const placed = new Map<string, number>()
  const finals = real.filter(x => x.round === 'Finals')
  // "3rd Place", older exports "3rd Place Match" or "3rd place"
  const nth = real.map(x => ({ x, n: /^(\d+)(?:st|nd|rd|th) place(?: match)?$/i.exec(x.round)?.[1] })).filter(r => r.n).map(r => ({ x: r.x, n: Number(r.n) }))
  if (finals.length || nth.length) {
    for (const f of finals) { placed.set(id(f.winner, f.winTeam), 1); placed.set(id(f.loser, f.loseTeam), 2) }
    // 3rd, 5th, 7th… then a "2nd Place" wrestle-back last (its loser drops to 3rd)
    for (const { x, n } of nth.sort((a, z) => (a.n === 2 ? 99 : a.n) - (z.n === 2 ? 99 : z.n))) { placed.set(id(x.winner, x.winTeam), n); placed.set(id(x.loser, x.loseTeam), n + 1) }
  } else {
    // round robin: by wins, then fewest losses, then head-to-head
    const w = new Map<string, number>(), l = new Map<string, number>()
    for (const x of real) { w.set(id(x.winner, x.winTeam), (w.get(id(x.winner, x.winTeam)) ?? 0) + 1); l.set(id(x.loser, x.loseTeam), (l.get(id(x.loser, x.loseTeam)) ?? 0) + 1) }
    const beat = (a: string, z: string) => real.some(x => id(x.winner, x.winTeam) === a && id(x.loser, x.loseTeam) === z)
    const order = [...person.keys()].sort((a, z) => (w.get(z) ?? 0) - (w.get(a) ?? 0) || (l.get(a) ?? 0) - (l.get(z) ?? 0) || (beat(a, z) ? -1 : beat(z, a) ? 1 : 0))
    return order.map((k, i) => ({ person: person.get(k)!, place: i + 1, place_to: null }))
  }
  const out = [...placed].map(([k, p]) => ({ person: person.get(k)!, place: p, place_to: null as number | null }))
  // Tied groups: eliminated in the same consolation round (later rounds rank higher); someone who lost
  // in the championship rounds and never wrestled back counts at that round
  const elim = new Map<string, string>()
  for (const x of real) {
    const k = id(x.loser, x.loseTeam)
    if (placed.has(k)) continue
    if (x.round.startsWith('Consi') || !elim.has(k)) elim.set(k, x.round)
  }
  const rank = (r: string): number => {
    let m = /^Consi of (\d+)(?: #(\d))?$/.exec(r)
    if (m) return Number(m[1]) * 10 - Number(m[2] ?? 1)          // Consi of 8 #2 (better) < Consi of 8 #1
    if (r === 'Consi-Semis') return 30
    if (r === 'Semi-Finals') return 20
    if (r === 'Quarter-Finals') return 40
    m = /^Round of (\d+)$/.exec(r)
    if (m) return Number(m[1]) * 10 + 5
    return 100000
  }
  const groups = new Map<number, string[]>()
  for (const [k, r] of elim) groups.set(rank(r), [...(groups.get(rank(r)) ?? []), k])
  let next = Math.max(0, ...placed.values()) + 1
  for (const r of [...groups.keys()].sort((a, z) => a - z)) {
    const g = groups.get(r)!
    const lo = next, hi = next + g.length - 1
    for (const k of g) out.push({ person: person.get(k)!, place: lo, place_to: hi > lo ? hi : null })
    next = hi + 1
  }
  return out
}

/** A bout export as podium rows (the upload page and scripts both use this): each bracket placed, its division
 *  from the roster, pools at one weight labeled apart; brackets that mix two draws are left out and named. */
export function podiumsFromBouts(text: string, byName: ReturnType<typeof rosterIndex>): { rows: PodiumOut[]; merged: string[]; bouts: { division: string; weight: string; bout: Bout }[] } {
  const rows: PodiumOut[] = [], merged: string[] = [], bouts: { division: string; weight: string; bout: Bout }[] = []
  const placed: { b: Bracket; division: string | null; grades: Map<string, number | null>; div: string; weight: string; tiered: ReturnType<typeof tieredPlaces> }[] = []
  const all = bracketsFrom(parseBoutExport(text)).filter(contested)
    .flatMap(b => (mergedBracket(b) ? splitByRoster(b, byName) ?? [b] : [b]))
  for (const b of all) {
    const found = divisionOf(b, byName), grades = found.grades
    const division = b.division ?? found.division
    const div = division ?? `Unlabeled (weight ${b.weight})`
    const tiered = mergedBracket(b) ? tieredPlaces(b) : null
    if (mergedBracket(b) && !tiered) { merged.push(`${div} ${b.weight}`); continue }
    // "102-H" → 102 (the letter is the division's code); a label that isn't a weight ("MF-A") stays as it is
    const w = b.weight.replace(/-[A-Z]\d?$/, '')
    placed.push({ b, division, grades, div, weight: division && /^\d/.test(w) ? w : b.weight, tiered })
  }
  const weights = poolWeights(placed.map(x => ({ division: x.div, weight: x.weight })))
  placed.forEach((x, i) => {
    // the bouts too, each with its bracket's division and weight (head-to-head results, Kyle 2026-11-13)
    for (const bout of x.b.bouts) if (bout.loser) bouts.push({ division: x.div, weight: weights[i], bout })
    for (const p of x.tiered ?? placesFrom(x.b)) {
      const st = /^[A-Z]{2}$/.test(p.person.team) ? p.person.team : null
      rows.push({ division: x.div, weight: weights[i], place: p.place, place_to: p.place_to, name: p.person.name, team: st ? '' : p.person.team, state: st, style: styleOf(x.div), grade: x.grades.get(`${p.person.name}|${p.person.team}`) ?? null })
    }
  })
  return { rows, merged, bouts }
}

// ── Roster ───────────────────────────────────────────────────────────────────

export type RosterEntry = { first: string; last: string; team: string; weight: string; grade: number | null; division: string }
const NAME_LINE = /^[^,\d\t]{1,60}, [^,\d\t]{1,60}$/

const HS_GRADE: Record<string, number> = { freshman: 9, sophomore: 10, junior: 11, senior: 12 }
function gradeOf(x: string): number | null | undefined {
  const m = /^(\d{1,2})(st|nd|rd|th)$/i.exec(x)
  if (m) return Number(m[1])
  if (/^K$/i.test(x)) return 0
  const h = /^HS (Freshman|Sophomore|Junior|Senior)$/i.exec(x)
  return h ? HS_GRADE[h[1].toLowerCase()] : undefined
}

function entry(name: string, team: string, weight: string, rest: string[]): RosterEntry | null {
  const fields = rest.filter(x => x && !/^\d+(\.\d+)?(-\d+(\.\d+)?)?$/.test(x))        // scale weights
  const g = fields.find(x => gradeOf(x) !== undefined)
  const divs = fields.filter(x => x !== g)
  if (!divs.length) return null
  const division = divs.length > 1 && !divs[0].toLowerCase().includes(divs[1].toLowerCase()) && !/^\d/.test(divs[1]) ? `${divs[0]} (${divs[1]})` : divs[0]
  const [last, first] = name.split(',', 2).map(s => s.replace(/[“”"'(].*?[“”"')]\s*/g, '').trim())
  return { first, last, team, weight, grade: g ? gradeOf(g) ?? null : null, division }
}

/** Roster rows: a table (one wrestler per line, cells by tab: name, team, weight, [scale], [grade], division,
 *  [bracket]) or one field per line, each wrestler starting with "Last, First". */
export function parseRoster(text: string): RosterEntry[] {
  const out: RosterEntry[] = []
  const raw = text.split(/\r?\n/)
  if (raw.filter(l => l.includes('\t')).length > raw.length / 4) {
    for (let k = 0; k < raw.length; k++) {
      // a name can sit on its own line with its row on the next ("Castro, Jacob" / "\tAll I See Is Gold…\t80…")
      const l = NAME_LINE.test(raw[k].trim()) && raw[k + 1]?.startsWith('\t') ? raw[k].trim() + raw[++k] : raw[k]
      const c = l.split('\t').map(x => x.trim())
      if (c.length < 4 || !NAME_LINE.test(c[0])) continue
      const e = entry(c[0], c[1], c[2], c.slice(3))
      if (e) out.push(e)
    }
    return out
  }
  const lines = raw.map(l => l.trim()).filter(Boolean)
  for (let i = 0; i < lines.length; i++) {
    if (!NAME_LINE.test(lines[i])) continue
    const rec: string[] = []
    let j = i + 1
    while (j < lines.length && rec.length < 7 && !NAME_LINE.test(lines[j])) rec.push(lines[j++])
    if (rec.length < 3) continue
    const e = entry(lines[i], rec[0], rec[1], rec.slice(2))
    if (e) out.push(e)
    i = j - 1
  }
  return out
}

const baseDiv = (d: string) => d.replace(/\s*\(.*\)\s*$/, '').trim()

/** Name each bracket's division from the roster: most of its wrestlers agree. */
export function divisionOf(b: Bracket, byName: Map<string, RosterEntry[]>): { division: string | null; grades: Map<string, number | null> } {
  // A kid entered in two divisions (Midget and Midget-2nd Chance; Freestyle and Greco at one weight): prefer
  // the entry at this bracket's exact weight; a remaining tie is shared, and the bracket's other kids decide.
  const votes = new Map<string, number>(), grades = new Map<string, number | null>(), fullName = new Map<string, string>()
  const sameWeight = (h: RosterEntry) => h.weight === b.weight || (Number(h.weight) > 0 && Number(h.weight) === Number(b.weight))
  for (const p of b.people) {
    const hits = (byName.get(p.name.toLowerCase()) ?? [])
    const sameTeam = hits.filter(h => h.team.toLowerCase() === p.team.toLowerCase())
    let pick = sameTeam.length ? sameTeam : hits
    if (pick.some(sameWeight)) pick = pick.filter(sameWeight)
    // one division under two names ("Cadets" and "Cadets (9th & 10th Grade)") counts once, under the longer name
    const divs = [...new Set(pick.map(h => baseDiv(h.division)))]
    for (const h of pick) { const b = baseDiv(h.division); if ((fullName.get(b)?.length ?? 0) < h.division.length) fullName.set(b, h.division) }
    for (const d of divs) votes.set(d, (votes.get(d) ?? 0) + 1 / divs.length)
    if (pick.length) grades.set(`${p.name}|${p.team}`, pick[0].grade)
  }
  const ranked = [...votes].sort((a, z) => z[1] - a[1])
  const clear = ranked.length && (ranked.length === 1 || ranked[0][1] > ranked[1][1] + 1e-9)
  return { division: clear ? fullName.get(ranked[0][0]) ?? ranked[0][0] : null, grades }
}

/** A bracket somebody actually wrestled in (not a lone entrant with a bye). */
export const contested = (b: Bracket) => b.bouts.some(x => x.loser)

export function rosterIndex(entries: RosterEntry[]): Map<string, RosterEntry[]> {
  const m = new Map<string, RosterEntry[]>()
  for (const e of entries) { const k = `${e.first} ${e.last}`.toLowerCase(); m.set(k, [...(m.get(k) ?? []), e]) }
  return m
}

// ── USA Bracketing placements ────────────────────────────────────────────────

const STATES: Record<string, string> = { Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY', 'District of Columbia': 'DC', 'Puerto Rico': 'PR' }
export const stateCode = (s: string) => (/^[A-Z]{2}$/.test(s.trim()) ? s.trim() : STATES[s.trim()] ?? null)

export function parsePlacements(text: string): PodiumOut[] {
  const out: PodiumOut[] = []
  let div: string | null = null, weight: string | null = null
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.replace(/^[\s•·*-]+(?=\d)/, '').trim()   // copied lists can carry bullets
    const h = /^(.+?) - (\d{2,3}|HWT.*)$/.exec(l)
    if (h && !/^\d+(st|nd|rd|th) - /.test(l)) { div = h[1].trim(); weight = h[2]; continue }
    const p = /^(\d+)(?:st|nd|rd|th) - (.+?) \(([^)]+)\)$/.exec(l)
    if (p && div && weight) {
      const st = stateCode(p[3])
      out.push({ division: div, weight, place: Number(p[1]), place_to: null, name: p[2].trim(), team: st ? '' : p[3], state: st, style: styleOf(div) === 'folkstyle' ? 'freestyle' : styleOf(div), grade: null })
    }
  }
  return out
}

// ── Mobbin bracket PDF ───────────────────────────────────────────────────────

type Item = { s: string; x: number; y: number }
const NOT_NAME = new Set(['match', 'bye', 'pin', 'decision', 'tf', 'md', 'am', 'pm', 'forfeit', 'dq', 'inj', 'injury-', 'default'])
type Slot = { win: boolean; x: number; y: number; name: string; team: string }

/** Each ✅ / ❌ with the name written beside it ("✅ Name (id)" or "(id)Name ✅") and the club on the line under it. */
function slotsOf(items: Item[]): Slot[] {
  // lines that hold a ✅ / ❌ are wrestlers' names, never a club
  const markLines = new Set(items.filter(i => i.s === '✅' || i.s === '❌').flatMap(i => [i.y - 1, i.y, i.y + 1]))
  const line = (y: number) => items.filter(i => Math.abs(i.y - y) <= 1).sort((a, z) => a.x - z.x)
  return items.filter(i => i.s === '✅' || i.s === '❌').map(m => {
    const row = line(m.y)
    const at = row.indexOf(m)
    const isWord = (t: Item) => /^[A-Za-z][A-Za-z.'-]*$/.test(t.s) && !NOT_NAME.has(t.s.toLowerCase())
    // to the right until the "(" of the id
    const right: Item[] = []
    for (let k = at + 1; k < row.length && row[k].s !== '(' && isWord(row[k]) && row[k].x - (right.at(-1)?.x ?? m.x) < 40; k++) right.push(row[k])
    // or to the left, back to the ")" of the id
    const left: Item[] = []
    for (let k = at - 1; k >= 0 && row[k].s !== ')' && isWord(row[k]) && (left[0]?.x ?? m.x) - row[k].x < 40; k--) left.unshift(row[k])
    const words = right.length ? right : left
    const x0 = words[0]?.x ?? m.x, x1 = words.at(-1)?.x ?? m.x
    // the club: the first line below, within the name's span
    const below = items.filter(i => i.y < m.y && m.y - i.y <= 12 && i.x >= x0 - 25 && i.x <= x1 + 40 && /[A-Za-z]{2}/.test(i.s) && !NOT_NAME.has(i.s.toLowerCase()) && !/^\d/.test(i.s) && !markLines.has(i.y))
    const by = below.length ? Math.max(...below.map(i => i.y)) : null
    const team = by == null ? '' : below.filter(i => Math.abs(i.y - by) <= 1).sort((a, z) => a.x - z.x).map(i => i.s).join(' ')
    return { win: m.s === '✅', x: m.x, y: m.y, name: words.map(w => w.s).join(' '), team }
  }).filter(s => s.name)
}

/** Places from a Mobbin bracket: an elimination bracket's final (rightmost bout) and consolation final
 *  (leftmost) give 1st–4th; a round robin ("Round 1", "Round 2"…) is placed by record. */
export function mobbinPlaces(items: Item[]): { name: string; team: string; place: number }[] {
  const slots = slotsOf(items)
  if (!slots.length) return []
  const teamOf = new Map<string, string>()
  for (const s of slots) if (s.team && !teamOf.has(s.name)) teamOf.set(s.name, s.team)
  const roundRobin = !items.some(i => /Semi-finals|Quarter-finals|Consolation/i.test(i.s)) && items.some(i => i.s === 'Round')
  if (roundRobin) {
    const w = new Map<string, number>(), l = new Map<string, number>()
    for (const s of slots) (s.win ? w : l).set(s.name, ((s.win ? w : l).get(s.name) ?? 0) + 1)
    const names = [...new Set(slots.map(s => s.name))]
    return names.sort((a, z) => (w.get(z) ?? 0) - (w.get(a) ?? 0) || (l.get(a) ?? 0) - (l.get(z) ?? 0))
      .map((n, i) => ({ name: n, team: teamOf.get(n) ?? '', place: i + 1 }))
  }
  const maxX = Math.max(...slots.map(s => s.x)), minX = Math.min(...slots.map(s => s.x))
  const col = (x: number) => slots.filter(s => Math.abs(s.x - x) < 25)
  const out: { name: string; team: string; place: number }[] = []
  const add = (s: Slot | undefined, place: number) => { if (s) out.push({ name: s.name, team: teamOf.get(s.name) ?? s.team, place }) }
  add(col(maxX).find(s => s.win), 1); add(col(maxX).find(s => !s.win), 2)
  if (minX < maxX - 50) { add(col(minX).find(s => s.win), 3); add(col(minX).find(s => !s.win), 4) }
  return out
}

/** A Mobbin PDF's weight and division from its file name ("Girls 105 - …pdf", "126 - …pdf"). */
export function mobbinFromName(file: string): { weight: string; division: string } {
  const w = /(\d{2,3})/.exec(file)?.[1] ?? ''
  return { weight: w, division: /\b(girls?|grils?)\b/i.test(file) ? 'Girls' : 'High School' }
}

// ── FloArena placements ──────────────────────────────────────────────────────

/** FloArena's placements page: division / place / weight / "Name (Club)", four lines a place. */
export function parseFloPlacements(text: string): PodiumOut[] {
  // as table rows (cells by tab) or one field per line
  const L = text.split(/\r?\n/).flatMap(l => (l.includes('\t') ? l.split('\t') : [l])).map(l => l.trim()).filter(Boolean)
  const out: PodiumOut[] = [], seen = new Set<string>()
  for (let i = 0; i + 3 < L.length; i++) {
    if (!/(FS|GR|Freestyle|Greco|Folkstyle)$/i.test(L[i]) || !/^\d{1,2}$/.test(L[i + 1]) || !/^\d{2,3}$/.test(L[i + 2])) continue
    const m = /^(.+?) \((.*)\)$/.exec(L[i + 3])
    if (!m) continue
    const div = L[i]
    // the page can list a place twice; an identical line counts once
    const key = `${div}|${L[i + 2]}|${L[i + 1]}|${m[1].trim()}`
    if (seen.has(key)) { i += 3; continue }
    seen.add(key)
    out.push({ division: div, weight: L[i + 2], place: Number(L[i + 1]), place_to: null, name: m[1].trim(), team: m[2].trim(), state: null, style: styleOf(div) === 'folkstyle' ? 'freestyle' : styleOf(div), grade: null })
    i += 3
  }
  return out
}

// ── FloArena results page ────────────────────────────────────────────────────

/** FloArena's Results page copied whole (Journeymen, NJ Freestyle & Greco): a division name, then each weight
 *  ("75 lbs", or "106 lbs - 9th-16th" for a group of places), then place / name / club. A group's "1st" is its
 *  first place (the 9th-16th group's 1st = 9th). Pool standings ("106 lbs - Pool A") are rankings inside a pool,
 *  not places, and are skipped. */
export function parseFloResults(text: string): PodiumOut[] {
  // one field per line, or a place as a table row (cells by tab)
  const L = text.split(/\r?\n/).flatMap(l => (l.includes('\t') ? l.split('\t') : [l])).map(l => l.trim())
    .filter(l => l && !/\.(png|jpe?g|gif)\b/i.test(l))   // images copied with the page
  const out: PodiumOut[] = []
  const placeLine = /^(\d+)(?:st|nd|rd|th)$/
  const weightLine = /^(\S+) lbs(?: - (.+))?$/
  let div: string | null = null, weight: string | null = null, base: number | null = null
  for (let i = 0; i < L.length; i++) {
    const w = weightLine.exec(L[i])
    if (w) {
      weight = w[1]
      const g = w[2] ? /^(\d+)(?:st|nd|rd|th)?(?:-\d+(?:st|nd|rd|th)?)?$/.exec(w[2]) : null
      base = !w[2] ? 1 : g ? Number(g[1]) : null   // null: a pool's standings
      continue
    }
    const p = placeLine.exec(L[i])
    if (p && i + 2 < L.length && !weightLine.test(L[i + 1])) {
      if (div && weight && base != null) {
        out.push({ division: div, weight, place: base + Number(p[1]) - 1, place_to: null, name: L[i + 1], team: L[i + 2], state: null, style: styleOf(div), grade: null })
      }
      i += 2
      continue
    }
    // a line just before a weight is a division name
    if (i + 1 < L.length && weightLine.test(L[i + 1])) div = L[i]
  }
  // two kids at one place (Flo lists a tie as "6th", "6th"): they share it, 22nd–23rd
  const key = (r: PodiumOut) => `${r.division}|${r.weight}|${r.place}`
  const n = new Map<string, number>()
  for (const r of out) n.set(key(r), (n.get(key(r)) ?? 0) + 1)
  return out.map(r => ((n.get(key(r)) ?? 1) > 1 ? { ...r, place_to: r.place + n.get(key(r))! - 1 } : r))
}

// ── Dual meet results copy (TrackWrestling / Flo duals page) ────────────────

/** A duals event copied whole (NHSCA National Duals, Kyle 2026-11-13): the roster, then each dual — the two teams
 *  ("MAT ASSASSINS - HSB" / " - " / "TEAM SHUTT WEAVER - HSB", then the team scores), then one row per weight:
 *  weight · both names as "N. Schuman" · both team codes · the result with the match score (in team A, team B
 *  order) · the team points each side scored, which say who won. Names are filled in from the roster by team,
 *  last name and first initial. Forfeits and empty weights are left out. The team's suffix is its division:
 *  HSB high school boys, HSG high school girls, MS middle school, EL elementary. */
export const DUAL_DIVISIONS: Record<string, string> = { HSB: 'High School Boys', HSG: 'High School Girls', MS: 'Middle School', EL: 'Elementary' }
export function parseDualCopy(text: string): { bouts: (Bout & { division: string })[]; unresolved: string[] } {
  const roster = parseRoster(text)
  const byTeam = new Map<string, RosterEntry[]>()
  for (const r of roster) { const k = r.team.toLowerCase().trim(); byTeam.set(k, [...(byTeam.get(k) ?? []), r]) }
  const unresolved = new Set<string>()
  const bare = (s: string) => s.toLowerCase().replace(/[,.]?\s+(jr|sr|ii|iii|iv)\.?$/i, '').replace(/[^a-z]/g, '')
  // "N. Schuman" on a team → the roster's full name. The bout's last name may carry a middle name or nickname
  // ("J. Paul Dubay", 'A. "Gus" Golliher'): try the whole thing, then its last word. Two kids with one initial and
  // last name on a team (brothers) are told apart by the bout's weight when their roster weights differ.
  const full = (abbr: string, team: string, weight: string) => {
    const m = /^([A-Za-z])\.?\s+(.+)$/.exec(abbr.trim())
    if (!m) return abbr.trim()
    const pool = (byTeam.get(team.toLowerCase().trim()) ?? []).filter(r => r.first?.[0]?.toLowerCase() === m[1].toLowerCase())
    const words = m[2].trim().split(/\s+/)
    for (const last of [m[2], words[words.length - 1], words.slice(-2).join(' ')]) {
      let hits = pool.filter(r => bare(r.last) === bare(last))
      if (new Set(hits.map(r => `${r.first} ${r.last}`)).size > 1) {
        // siblings: the one rostered at this weight, or clearly nearest it (12+ lb nearer than the other)
        const exact = hits.filter(r => r.weight === weight)
        if (exact.length) hits = exact
        else {
          const gap = (r: RosterEntry) => Math.abs((Number.parseInt(r.weight) || 999) - (Number.parseInt(weight) || 0))
          const sorted = [...hits].sort((x, y) => gap(x) - gap(y))
          if (gap(sorted[1]) - gap(sorted[0]) >= 12) hits = [sorted[0]]
        }
      }
      const names = [...new Set(hits.map(r => `${r.first} ${r.last}`))]
      if (names.length === 1) return names[0]
      if (names.length > 1) break   // two kids it could be: don't guess
    }
    unresolved.add(`${abbr} (${team})`)
    return abbr.trim()
  }
  const bouts: (Bout & { division: string })[] = []
  // (the separators are " - " with non-breaking spaces). A team's suffix (" - HSB") is its division; without one
  // (AAU Scholastic Duals) the page's heading above says Boys or Girls.
  const head = /\n([^\n\t]{2,80})\n\s*-\s*\n([^\n\t]{2,80})\n\d+\n\s*-\s*\n\d+\n/g
  // the page titles: "Duals Boys - Results", "Duals - Girls Natl - Participants". A copied page carries its title at
  // the end, so a dual's division is the next title below it (or, past the last one, the last title)
  const headings = [...text.matchAll(/Duals?\s*(?:-\s*)?(Boys|Girls)\b/gi)].map(m => ({ at: m.index!, division: /girls/i.test(m[1]) ? 'High School Girls' : 'High School Boys' }))
  const heads = [...text.matchAll(head)]
  heads.forEach((h, i) => {
    const teamA = h[1].trim(), teamB = h[2].trim()
    const suffix = / - (HSB|HSG|MS|EL)$/.exec(teamA)?.[1]
    const division = suffix ? DUAL_DIVISIONS[suffix] : (headings.find(x => x.at > h.index!) ?? headings[headings.length - 1])?.division
    if (!division) return
    const seg = text.slice(h.index! + h[0].length, heads[i + 1]?.index ?? text.length)
    // the round label (if any) sits just before the next dual's teams; rows end with two tabs
    for (const row of seg.split(/\t\t\n?/)) {
      const c = row.replace(/^\n+/, '').split('\t')
      if (c.length < 5 || !/^\d{2,3}$/.test(c[0].trim())) continue
      const [a, b] = c[1].split('\n').map(x => x.trim())
      const resCell = c[3].split('\n').map(x => x.trim()).filter(Boolean)
      const [pa, pb] = c[4].split('\n').map(x => Number(x.trim()) || 0)
      if (!a || !b || resCell.some(x => /^(for|ff|dff|nc)$/i.test(x))) continue   // forfeits, empty weights
      const type = resCell.find(x => /[A-Za-z]/.test(x)) ?? ''
      const nums = resCell.filter(x => /^\d+$/.test(x)).map(Number)
      const aWon = pa > pb
      // names listed under the other team (the copy swaps a few): when each name belongs only to the other team,
      // the roster's teams say who won — the team points follow the teams
      const onTeam = (n: string, team: string) => (byTeam.get(team.toLowerCase().trim()) ?? []).some(r => r.first?.[0]?.toLowerCase() === n.trim()[0]?.toLowerCase() && n.toLowerCase().includes(r.last.toLowerCase().split(' ').pop() ?? '#'))
      let [na, nb] = [a, b]
      if (!onTeam(a, teamA) && !onTeam(b, teamB) && onTeam(a, teamB) && onTeam(b, teamA)) [na, nb] = [b, a]
      const winType = type.split(' ')[0]
      const score = nums.length === 2 ? (aWon ? `${nums[0]}-${nums[1]}` : `${nums[1]}-${nums[0]}`) : type.replace(/^\S+\s*/, '')
      bouts.push({
        weight: c[0].trim(), round: '', division,
        winner: full(aWon ? na : nb, aWon ? teamA : teamB, c[0].trim()), winTeam: aWon ? teamA : teamB,
        loser: full(aWon ? nb : na, aWon ? teamB : teamA, c[0].trim()), loseTeam: aWon ? teamB : teamA,
        winType, result: score, date: '', event: '',
      })
    }
  })
  return { bouts, unresolved: [...unresolved] }
}

// ── Shared ───────────────────────────────────────────────────────────────────

export function styleOf(division: string): 'folkstyle' | 'freestyle' | 'greco' {
  if (/\b(GR|Greco)\b/i.test(division)) return 'greco'
  if (/\b(FS|Freestyle)\b/i.test(division)) return 'freestyle'
  return 'folkstyle'
}

/** Where a division belongs by default: high school boys / girls on the Offseason Hub, younger to the mixed pool. */
export function destinationOf(division: string): 'M' | 'F' | 'X' {
  const d = division.toLowerCase()
  const young = /\b(middle|ms|8u|10u|11u|12u|14u|bantam|midget|novice|intermediate|schoolboy|youth|elementary|junior high|jh|tots?|pre-k|kindergarten)\b/.test(d) || /\b[1-8](st|nd|rd|th)( |-|$)(?!chance)/.test(d)
  if (young) return 'X'
  if (/\b(girls?|women'?s?|female)\b/.test(d)) return 'F'
  return 'M'
}

/** The class year (HS graduation) for a grade at an event date: 8th grade in 2026-27 = 2031. */
export function classYear(grade: number | null, eventDate: string | null): number | null {
  if (grade == null || !eventDate) return null
  const [y, m] = eventDate.split('-').map(Number)
  const schoolYearEnd = m >= 7 ? y + 1 : y
  return schoolYearEnd + (12 - grade)
}
