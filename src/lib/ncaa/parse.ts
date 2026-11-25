// NCAA tournament PDF readers (Kyle 2026-11-17). Input: the PDF's text items with positions (unpdf getTextContent:
// string, x, y, width, page — y grows upward). Output per weight: every entrant (name, school, seed, record) and the
// place winners 1–8. Bout-by-bout results come later (the layouts number bouts differently by year).
// Formats, by what the file contains:
//   'stats'    wrestlingstats.com printout (2000–2014, 2016): page 1 "1st: Name [seed] - School (score)" for each
//              weight; then each weight's championship bracket ("Name, School [seed]") and consolation pages.
//   'official' NCAA bracket, one page a weight (2015, 2017–2019, 2021–2023, 2025, 2026): "(seed) First Last (ABBR) W-L";
//              place bouts labelled CHAMPION / Third Place / Fifth Place / Seventh Place.
//   'official-2024' two pages a weight, "(seed) First Last, ABBR, W-L", places labelled 1ST / 3RD / 5TH / 7TH.

export type Item = { p: number; s: string; x: number; y: number; w: number }
export type NcaaEntrant = { name: string; school: string; seed: number | null; record: string | null }
export type NcaaPlacer = { place: number; name: string; school: string; seed: number | null }
export type NcaaWeight = { weight: number; entrants: NcaaEntrant[]; placers: NcaaPlacer[]; byes?: number; problems: string[]; placesGiven?: number }
export type NcaaParse = { format: 'stats' | 'official' | 'official-2024' | 'unknown'; year: number | null; weights: NcaaWeight[]; problems: string[] }

// a weight label: the number, or "UNL" (unlimited — the heavyweight until 1987), kept as 285 with the later heavyweights
const WT = '(\\d{3}|UNL)'
const weightOf = (label: string) => (/^UNL/.test(label) ? 285 : Number(label.slice(0, 3)))
const clean = (s: string) => s.replace(/\s+/g, ' ').trim()
// the 2017 file splits some names with a stray space ("Thom as Gilman"); matching allows for it, the name is kept as printed
const seedOf = (s: string | undefined) => (s && /^\d+$/.test(s) ? Number(s) : null)

export function detectFormat(items: Item[]): NcaaParse['format'] {
  if (items.some(i => /^\d(st|nd|rd|th):$/.test(i.s)) || items.some(i => /Champions and Place Winners/i.test(i.s))) return 'stats'
  if (items.some(i => /^\(\d+\)\s*[^,()]+,\s*[A-Z]{2,6},\s*\d+-\d+$/.test(i.s))) return 'official-2024'
  if (items.some(i => /^\(\d+\)\s*.+\([A-Z&]{2,6}\)\s*\d+-\d+$/.test(i.s))) return 'official'
  return 'unknown'
}

export function parseNcaa(items: Item[]): NcaaParse {
  const format = detectFormat(items)
  const year = Number(items.map(i => i.s.match(/\b(19|20)\d{2}\b/)?.[0]).find(Boolean)) || null
  if (format === 'stats') return { format, year, ...parseStats(items) }
  if (format === 'official') return { format, year, ...parseOfficial(items) }
  if (format === 'official-2024') return { format, year, ...parseOfficial2024(items) }
  return { format, year, weights: [], problems: ['Not a layout this import knows'] }
}

// ── 'stats' ───────────────────────────────────────────────────────────────────────────────────────────────────

function parseStats(items: Item[]): { weights: NcaaWeight[]; problems: string[] } {
  const problems: string[] = []
  const p1 = items.filter(i => i.p === 1)
  // weight labels down the left of page 1 (x < 70), each owning the place rows until the next
  const weightRows = p1.filter(i => new RegExp(`^${WT}$`).test(i.s) && i.x < 70).sort((a, b) => b.y - a.y)
  const placeLabels = p1.filter(i => /^\d(st|nd|rd|th):$/.test(i.s))
  const out = new Map<number, NcaaWeight>()
  for (let k = 0; k < weightRows.length; k++) {
    const top = weightRows[k].y + 3, bottom = k + 1 < weightRows.length ? weightRows[k + 1].y + 3 : -Infinity
    const weight = weightOf(weightRows[k].s)
    const w: NcaaWeight = { weight, entrants: [], placers: [], problems: [] }
    for (const lab of placeLabels.filter(l => l.y <= top && l.y > bottom)) {
      const place = Number(lab.s[0])
      // the text right of the label on the same row
      const txt = p1.filter(i => Math.abs(i.y - lab.y) < 2 && i.x > lab.x && i.x < lab.x + 25).sort((a, b) => a.x - b.x)[0]
      // "Name [seed] - School (score)"; before seeding (1930s–40s) no "[seed]"
      const m = txt?.s.match(/^(.+?)\s*(?:\[(\d+|US)\])?\s+-\s+(.+?)(?:\s*\((?:[^()]*)\))?$/)
      if (!m) { w.problems.push(`${weight} ${lab.s} not read: ${txt?.s ?? '(nothing)'}`); continue }
      // a tie for a place prints both: "Dick Bishop - Lehigh & Caifson Johnson - Minnesota"
      const tie = m[3].match(/^(.+?)\s+&\s+(.+?)\s+-\s+(.+)$/)
      const school = (x: string) => clean(x).replace(/\s+automatic$/i, '')   // "Oklahoma automatic" (an automatic advance)
      if (tie) { w.placers.push({ place, name: clean(m[1]), school: school(tie[1]), seed: seedOf(m[2]) }, { place, name: clean(tie[2]), school: school(tie[3]), seed: null }); continue }
      w.placers.push({ place, name: clean(m[1]), school: school(m[3]), seed: seedOf(m[2]) })
    }
    w.placers.sort((a, b) => a.place - b.place)
    // how many places the page gives this weight (4 until 1962, 6 to 1978, 8 since)
    w.placesGiven = placeLabels.filter(l => l.y <= top && l.y > bottom).length
    out.set(weight, w)
  }
  // entrants: the championship bracket pages, left column "Name, School [seed]"
  const pages = [...new Set(items.map(i => i.p))].filter(p => p > 1)
  for (const p of pages) {
    const pg = items.filter(i => i.p === p)
    const wl = pg.find(i => new RegExp(`^${WT} Weight Class$`).test(i.s)) ?? pg.find(i => new RegExp(`^${WT}$`).test(i.s) && pg.some(j => j.s === 'Weight Class' && Math.abs(j.y - i.y) < 3))
    const weight = wl ? weightOf(wl.s) : null
    if (!weight || !out.has(weight)) continue
    // a field under 32 fills the bracket with byes
    out.get(weight)!.byes = (out.get(weight)!.byes ?? 0) + pg.filter(i => i.s === 'Bye').length
    // "First Last, School [seed]": a comma, no score digits (results read "Name 7-3" / "Name TF 20-4, 5:57"); some years
    // print the page sideways, so the pattern finds them, not a column. A row can carry a result after the entrant.
    for (const it of pg) {
      const m = it.s.match(/^([A-Z][^,\d]*?),\s*([^,\d[\]]+?)(?:\s*\[(\d+)\])?(?:\s{2,}.*)?$/)
      if (m && m[1].includes(' ') && !/\b(Fall|Dec|TF|MD|Inj|Def|For|DQ|OT|TB)\b/.test(m[2])) out.get(weight)!.entrants.push({ name: clean(m[1]), school: clean(m[2]).replace(/\s+automatic$/i, ''), seed: seedOf(m[3]), record: null })
      // the 1930s–40s pages list each round's bouts as "Name - School (team points)"
      const r = it.s.match(/^([A-Z][^-\d()]*?)\s+-\s+(.+?)\s+\(\d+\)$/)
      const W = out.get(weight)!
      const rs = r ? clean(r[2]).replace(/\s+automatic$/i, '') : ''   // "Oklahoma automatic" = moved on automatically
      if (r && r[1].includes(' ') && !W.entrants.some(e => e.name === clean(r[1]) && e.school === rs)) W.entrants.push({ name: clean(r[1]), school: rs, seed: null, record: null })
    }
  }
  // the last weight's block runs to the foot of the page and can take in other labels: no more places than the rest
  const counts = [...out.values()].map(w => w.placesGiven ?? 0).filter(Boolean).sort((a, b) => a - b)
  const usual = counts[Math.floor(counts.length / 2)]
  for (const w of out.values()) if (usual && (w.placesGiven ?? 0) > usual) w.placesGiven = usual
  for (const w of out.values()) checkWeight(w)
  if (!out.size) problems.push('No weights found on page 1')
  return { weights: [...out.values()].sort((a, b) => a.weight - b.weight), problems }
}

// ── 'official' ────────────────────────────────────────────────────────────────────────────────────────────────

// 2015–2018 seeded only 16, so an unseeded entrant has no "(seed)"
// a name has no digits ("TB-2 (RT) 3-3" is a tiebreak result, RT = riding time)
const OFFICIAL_ENTRANT = /^(?:\((\d+)\)\s*)?([A-Z][^()\d]*?)\s*\(([A-Z&]{2,6})\)\s*(\d+-\d+)$/
const OFFICIAL_SHORT = /^(?:\((\d+)\)\s*)?([A-Z][^()\d]*?)\s*\(([A-Z&]{2,6})\)$/     // "(2) Piccininni (OKST)" / "Hudkins (NIU)" further along

function parseOfficial(items: Item[]): { weights: NcaaWeight[]; problems: string[] } {
  const problems: string[] = []
  const out: NcaaWeight[] = []
  for (const p of [...new Set(items.map(i => i.p))]) {
    const pg = items.filter(i => i.p === p)
    const head = pg.find(i => /^\d{3} CHAMPIONSHIP$/.test(i.s))
    if (!head) continue
    const weight = Number(head.s.slice(0, 3))
    const w: NcaaWeight = { weight, entrants: [], placers: [], problems: [] }
    for (const it of pg) {
      const m = it.s.match(OFFICIAL_ENTRANT)
      // the same entrant can be printed twice (a pigtail loser repeated in the wrestlebacks): once each
      if (m && !w.entrants.some(e => e.name === clean(m[2]) && e.school === m[3])) w.entrants.push({ name: clean(m[2]), school: m[3], seed: seedOf(m[1]), record: m[4] })
    }
    const short = pg.filter(i => OFFICIAL_SHORT.test(i.s))
    const who = (it: Item | undefined) => {
      const m = it?.s.match(OFFICIAL_SHORT)
      if (!m) return null
      return (m[1] ? w.entrants.find(e => e.seed === Number(m[1]) && e.school === m[3]) : null)
        ?? w.entrants.find(e => e.school === m[3] && lastName(e.name) === lastName(m[2])) ?? null
    }
    const nums = pg.filter(i => /^\d{2,3}$/.test(i.s))
    const label = (re: RegExp) => pg.find(i => re.test(i.s))
    // bout numbers run on from weight to weight, so a place bout is found from its label: the number closest to it
    const boutAt = (l: Item | undefined) => (l ? nearest(nums, l, -60, 60, -30, 30) : undefined)
    // a bout's winner: just right of / above its number
    const winnerAt = (b: Item | undefined) => (b ? who(nearest(short, b, 3, 45, -2, 16)) : null)
    // the bouts feeding one: the nearest numbers in the column to its left, one above and one below
    const feeders = (b: Item | undefined) => {
      if (!b) return []
      const col = nums.filter(i => i.x - b.x > -80 && i.x - b.x < -20 && Math.abs(i.y - b.y) < 200)
      const up = col.filter(i => i.y > b.y).sort((x, y) => x.y - y.y)[0], down = col.filter(i => i.y < b.y).sort((x, y) => y.y - x.y)[0]
      return [up, down].filter(Boolean) as Item[]
    }
    // the two wrestlers going into a 5th / 7th place bout: left of its number
    const intoBout = (b: Item | undefined) => (b ? short.filter(i => i.x - b.x > -80 && i.x - b.x < -30 && Math.abs(i.y - b.y) < 14).map(who).filter(Boolean) as NcaaEntrant[] : [])
    // a place label's winner: the name just above it
    const above = (l: Item | undefined) => (l ? who(nearest(short, l, -45, 80, 4, 60)) : null)
    const set = (place: number, e: NcaaEntrant | null) => { if (e) w.placers.push({ place, name: e.name, school: e.school, seed: e.seed }) }
    const other = (pair: (NcaaEntrant | null)[], one: NcaaEntrant | null) => pair.find(e => e && e !== one) ?? null

    const lChamp = label(/^CHAMPION$/), lThird = label(/^Third Place$/), lFifth = label(/^Fifth Place$/), lSeventh = label(/^Seventh Place$/)
    const champ = above(lChamp)
    set(1, champ); set(2, other(feeders(boutAt(lChamp)).map(winnerAt), champ))
    const third = above(lThird)
    set(3, third); set(4, other(feeders(boutAt(lThird)).map(winnerAt), third))
    const b5 = boutAt(lFifth), b7 = boutAt(lSeventh)
    const fifth = winnerAt(b5) ?? above(lFifth)
    set(5, fifth); set(6, other(intoBout(b5), fifth))
    const seventh = winnerAt(b7) ?? above(lSeventh)
    set(7, seventh); set(8, other(intoBout(b7), seventh))
    checkWeight(w)
    out.push(w)
  }
  if (!out.length) problems.push('No "<weight> CHAMPIONSHIP" pages found')
  return { weights: out.sort((a, b) => a.weight - b.weight), problems }
}

// ── 'official-2024' ───────────────────────────────────────────────────────────────────────────────────────────

const Y24_ENTRANT = /^\((\d+)\)\s*([^,()]+),\s*([A-Z&]{2,6}),\s*(\d+-\d+)$/
const Y24_SHORT = /^([^,()]+),\s*([A-Z&]{2,6})$/                      // "Figueroa, ASU"
const D1_WEIGHTS = new Set([125, 133, 141, 149, 157, 165, 174, 184, 197, 285])

function parseOfficial2024(items: Item[]): { weights: NcaaWeight[]; problems: string[] } {
  const byWeight = new Map<number, Item[]>()
  for (const p of [...new Set(items.map(i => i.p))]) {
    const pg = items.filter(i => i.p === p)
    // the weight is printed at the top corner; bout numbers share that row, so only real weights count
    const head = pg.filter(i => /^\d{3}$/.test(i.s) && i.y > 735 && D1_WEIGHTS.has(Number(i.s)) && (i.x < 60 || i.x > 500)).sort((a, b) => b.y - a.y)[0]
    if (!head || !pg.some(i => Y24_ENTRANT.test(i.s) || Y24_SHORT.test(i.s))) continue
    byWeight.set(Number(head.s), [...(byWeight.get(Number(head.s)) ?? []), ...pg])
  }
  const out: NcaaWeight[] = []
  for (const [weight, its] of byWeight) {
    const w: NcaaWeight = { weight, entrants: [], placers: [], problems: [] }
    for (const it of its) { const m = it.s.match(Y24_ENTRANT); if (m) w.entrants.push({ name: clean(m[2]), school: m[3], seed: Number(m[1]), record: m[4] }) }
    for (const p of [...new Set(its.map(i => i.p))]) {
      const pg = its.filter(i => i.p === p)
      const short = pg.filter(i => Y24_SHORT.test(i.s))
      const who = (it: Item | undefined) => {
        const m = it?.s.match(Y24_SHORT)
        return m ? w.entrants.find(e => e.school === m[2] && lastName(e.name) === clean(m[1]).toLowerCase()) ?? null : null
      }
      const set = (place: number, e: NcaaEntrant | null) => { if (e && !w.placers.some(x => x.place === place)) w.placers.push({ place, name: e.name, school: e.school, seed: e.seed }) }
      for (const [lab, place] of [['1ST', 1], ['3RD', 3], ['5TH', 5], ['7TH', 7]] as const) {
        const l = pg.find(i => i.s === lab)
        if (!l) continue
        // the place bout's number sits up and to the left of its label; the winner just above-right of the number
        const b = nearest(pg.filter(i => /^\d{3}$/.test(i.s)), l, -60, 60, 0, 45)
        if (!b) continue
        // winner just above the number: to its right, or to its left on the mirrored page
        const winner = who(nearest(short, b, 15, 40, 12, 32) ?? nearest(short, b, -60, -40, 12, 32))
        let pair: (NcaaEntrant | null)[]
        if (place === 1) {
          // the final's two wrestlers: winners of the semifinals, the numbers in the column to its left
          const col = pg.filter(i => /^\d{3}$/.test(i.s) && i.x - b.x > -100 && i.x - b.x < -20 && Math.abs(i.y - b.y) < 220)
          const semis = [col.filter(i => i.y > b.y).sort((x, y) => x.y - y.y)[0], col.filter(i => i.y < b.y).sort((x, y) => y.y - x.y)[0]].filter(Boolean) as Item[]
          pair = semis.map(x => who(nearest(short, x, 15, 40, 0, 12)))
        }
        else if (place === 3) {
          // the consolation page is mirrored: each consolation semifinal's winner sits left of its number
          pair = pg.filter(i => i.s === '581' || i.s === '582').map(x => who(nearest(short, x, -70, -40, -8, 8)))
        }
        else pair = short.filter(i => i.x - b.x > -65 && i.x - b.x < -30 && i.y - b.y > -14 && i.y - b.y < 28).map(who)
        set(place, winner)
        set(place + 1, pair.find(e => e && e !== winner) ?? null)
      }
    }
    w.placers.sort((a, b) => a.place - b.place)
    checkWeight(w)
    out.push(w)
  }
  return { weights: out.sort((a, b) => a.weight - b.weight), problems: out.length ? [] : ['No weights found'] }
}

// ── shared ────────────────────────────────────────────────────────────────────────────────────────────────────

const lastName = (name: string) => clean(name).split(' ').slice(-1)[0].toLowerCase()

/** The item closest to `from` inside the box dx ∈ [dx0, dx1], dy ∈ [dy0, dy1] (dy up) */
function nearest(pool: Item[], from: Item, dx0: number, dx1: number, dy0: number, dy1: number): Item | undefined {
  return pool.filter(i => i !== from && i.x - from.x >= dx0 && i.x - from.x <= dx1 && i.y - from.y >= dy0 && i.y - from.y <= dy1)
    .sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0]
}

function checkWeight(w: NcaaWeight) {
  const places = w.placers.map(p => p.place)
  for (let p = 1; p <= (w.placesGiven || 8); p++) if (!places.includes(p)) w.problems.push(`${w.weight}: no ${p}${p === 1 ? 'st' : p === 2 ? 'nd' : p === 3 ? 'rd' : 'th'} place`)
  const names = w.placers.map(p => `${p.name}|${p.school}`)
  if (new Set(names).size !== names.length) w.problems.push(`${w.weight}: the same wrestler holds two places`)
  if (w.entrants.length + (w.byes ?? 0) < (w.placesGiven && w.placesGiven < 8 ? w.placesGiven : 32)) w.problems.push(`${w.weight}: ${w.entrants.length} entrants read (expected ${32 - (w.byes ?? 0)}–33)`)
}

/** Several files for one year (2015: brackets in one, places in another): entrants and places together */
export function mergeParses(parts: NcaaParse[]): NcaaParse {
  if (parts.length === 1) return parts[0]
  const byWeight = new Map<number, NcaaWeight>()
  for (const part of parts) for (const w of part.weights) {
    const cur = byWeight.get(w.weight) ?? { weight: w.weight, entrants: [], placers: [], problems: [] }
    for (const e of w.entrants) if (!cur.entrants.some(x => x.name === e.name && x.school === e.school)) cur.entrants.push(e)
    // places come whole from the file with the most of them for that weight (a bracket printed before the finals
    // reads a few wrong "places"; the finished results have all eight)
    if (w.placers.length > cur.placers.length) cur.placers = [...w.placers]
    cur.byes = Math.max(cur.byes ?? 0, w.byes ?? 0)
    byWeight.set(w.weight, cur)
  }
  const weights = [...byWeight.values()].sort((a, b) => a.weight - b.weight)
  for (const w of weights) { w.placers.sort((a, b) => a.place - b.place); w.problems = []; checkWeight(w) }
  return { format: parts[0].format, year: parts.find(p => p.year)?.year ?? null, weights, problems: parts.flatMap(p => p.problems) }
}

// ── bouts, official layout ────────────────────────────────────────────────────────────────────────────────────────

/** round: pigtail r1 r2 qf sf f (championship side), cpig c1 c2 c3 c4 cqf csf (consolation), 3rd 5th 7th (place bouts) */
export type NcaaBout = { weight: number; bout: number; winner: NcaaEntrant; loser: NcaaEntrant | null; result: string | null; round?: string | null }

export const CHAMP_ROUNDS = ['pigtail', 'r1', 'r2', 'qf', 'sf', 'f']
export const CONS_ROUNDS = ['cpig', 'c1', 'c2', 'c3', 'c4', 'cqf', 'csf']
export const PLACE_ROUNDS = ['3rd', '5th', '7th']
/** A place bout from the two wrestlers' places (3rd/4th, 5th/6th, 7th/8th) */
function placeBoutOf(W: NcaaWeight, a: NcaaEntrant, b: NcaaEntrant | null): string | null {
  if (!b) return null
  const at = (e: NcaaEntrant) => W.placers.find(p => p.name === e.name && p.school === e.school)?.place
  const x = at(a), y = at(b)
  if (x == null || y == null || Math.ceil(x / 2) !== Math.ceil(y / 2) || Math.abs(x - y) !== 1) return null
  return ({ 2: '3rd', 3: '5th', 4: '7th' } as Record<number, string>)[Math.ceil(x / 2)] ?? null
}
/** Rounds from bracket columns: the side's columns sorted right to left, named from the last round back */
function roundsByColumn<T>(nums: { item: Item; tag: T }[], names: string[]): Map<T, string> {
  const cols: number[] = []
  for (const x of [...new Set(nums.map(n => n.item.x))].sort((a, b) => b - a)) if (!cols.some(c => Math.abs(c - x) < 12)) cols.push(x)
  const out = new Map<T, string>()
  for (const n of nums) { const i = cols.findIndex(c => Math.abs(c - n.item.x) < 12); out.set(n.tag, names[i] ?? names[names.length - 1]) }
  return out
}

const BOUT_NAME = /^(?:\((\d+)\)\s*)?([A-Z][^()\d]*?)\s*\(([A-Z&]{2,6})\)(?:\s*\d+-\d+)?$/
const BOUT_RESULT = /^(Dec|MD|TF[-\d.]*|Fall|SV-\d|TB-\d|UTB|Inj\.?|M\. ?For\.?|For\.?|DQ|MFF|Def\.?)\b/

/** Every bout on the official layout's pages (Kyle 2026-11-17: track pins, techs, wins, records). A bout number's
 *  winner sits just right of / above it, the result just under the winner; the two going in are the names printed
 *  between the previous column of bout numbers and this one, inside the bout's box (championship and wrestleback
 *  sides kept apart; the final and 3rd place bout found from their CHAMPION / Third Place labels). */
export function parseOfficialBouts(items: Item[], weights: NcaaWeight[]): NcaaBout[] {
  const out: NcaaBout[] = []
  const numOf = new Map<NcaaBout, Item>()
  for (const p of [...new Set(items.map(i => i.p))]) {
    const pg = items.filter(i => i.p === p)
    const head = pg.find(i => /^\d{3} CHAMPIONSHIP$/.test(i.s))
    if (!head) continue
    const weight = Number(head.s.slice(0, 3))
    const W = weights.find(w => w.weight === weight)
    if (!W) continue
    const names = pg.filter(i => BOUT_NAME.test(i.s)), results = pg.filter(i => BOUT_RESULT.test(i.s))
    const who = (it: Item | undefined) => {
      const m = it?.s.match(BOUT_NAME)
      if (!m) return null
      const last = m[2].trim().split(/\s+/).slice(-1)[0].toLowerCase()
      return (m[1] ? W.entrants.find(e => e.school === m[3] && e.seed === Number(m[1])) : null) ?? W.entrants.find(e => e.school === m[3] && e.name.toLowerCase().endsWith(last)) ?? null
    }
    const nums = pg.filter(i => /^\d{1,3}$/.test(i.s) && Number(i.s) >= 1 && Number(i.s) !== weight && i.y < head.y - 5)
    const cols: Item[][] = []
    for (const n of [...nums].sort((a, c) => a.x - c.x)) { const c = cols.find(cc => Math.abs(cc[0].x - n.x) < 12); if (c) c.push(n); else cols.push([n]) }
    const colOf = new Map<Item, Item[]>(); for (const c of cols) for (const n of c) colOf.set(n, c)
    const winnerItem = new Map<Item, Item | undefined>()
    for (const b of nums) winnerItem.set(b, nearest(names, b, 3, 45, -2, 16))
    const lChamp = pg.find(i => i.s === 'CHAMPION'), lThird = pg.find(i => i.s === 'Third Place')
    const champNum = lChamp ? nearest(nums, lChamp, -40, 60, -40, 0) : undefined
    const thirdNum = lThird ? nearest(nums, lThird, -40, 60, -30, 10) : undefined
    if (champNum && lChamp) winnerItem.set(champNum, nearest(names, lChamp, -45, 80, 4, 60))
    if (thirdNum && lThird) winnerItem.set(thirdNum, nearest(names, lThird, -45, 80, 4, 60))
    const wbY = pg.find(i => i.s === 'WRESTLEBACKS')?.y ?? -Infinity
    const champSide = (n: Item) => n.y > wbY
    for (const b of nums) {
      const win = winnerItem.get(b), w = who(win)
      if (!win || !w) continue
      const res = nearest(results, win, -5, 45, -16, 0)
      const others = colOf.get(b)!.filter(o => o !== b).map(o => Math.abs(o.y - b.y))
      const sp = others.length ? Math.min(...others) : 120
      const side = (n: Item) => (b === thirdNum ? !champSide(n) : champSide(n) === champSide(b))
      const prevX = Math.max(-Infinity, ...cols.map(c => c.filter(n => n !== b && side(n))).filter(c => c.length && c[0].x < b.x - 10).map(c => c[0].x))
      const reach = b === champNum || b === thirdNum ? 260 : Math.max(12, sp * 0.6)
      const box = names.filter(i => i !== win && i.x > prevX - 2 && i.x < b.x - 2 && Math.abs(i.y - b.y) < reach && side(i)).sort((a, c) => Math.abs(a.y - b.y) - Math.abs(c.y - b.y))
      const ppl: NcaaEntrant[] = []
      for (const i of box) { const e = who(i); if (e && !ppl.includes(e)) ppl.push(e); if (ppl.length >= 2) break }
      // nothing in the box (a place bout drawn beside an earlier column): the nearest names just left of the number
      if (ppl.length < 2) for (const i of names.filter(i => i !== win && i.x < b.x && b.x - i.x < 95 && Math.abs(i.y - b.y) < 16 && side(i)).sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y))) {
        const e = who(i); if (e && !ppl.includes(e)) ppl.push(e); if (ppl.length >= 2) break
      }
      let winner = w, result = res?.s ?? null
      // the pigtail (the 33rd man): a championship bout alone (or nearly) in the leftmost column — its winner is the one
      // of the two also printed on a first-round line. (Bout numbers alone don't tell: 2021 numbers the first round 1–16.)
      const champCols = cols.filter(c => c.some(champSide))
      const isPigtail = champSide(b) && colOf.get(b)!.length <= 2 && champCols.length > 0 && b.x <= Math.min(...champCols.map(c => c[0].x)) + 1
      if (isPigtail && ppl.length === 2) {
        // (his first-round line can carry the pigtail result: "Dyson Dunham (VMI) 27-9 Dec 6-4")
        const appears = (e: NcaaEntrant) => pg.filter(i => i.s.includes(e.name) && i.s.includes(`(${e.school})`)).length
        const [x, y] = ppl
        winner = appears(x) > appears(y) ? x : appears(y) > appears(x) ? y : w
        const tagged = pg.find(i => i.s.includes(winner.name.split(' ').slice(-1)[0]) && BOUT_RESULT.test(i.s.replace(/^.*?\d+-\d+\s+/, '')))
        result = tagged ? tagged.s.replace(/^.*?\d+-\d+\s+/, '') : null
      }
      const bout: NcaaBout = { weight, bout: Number(b.s), winner, loser: ppl.find(x => x !== winner) ?? null, result }
      bout.round = b === champNum ? 'f' : isPigtail ? 'pigtail' : null
      out.push(bout); numOf.set(bout, b)
    }
    // the place bouts are the three highest bout numbers on the wrestleback side (wrestled last, before the final);
    // the rest by column, right to left on each side (every bout number on the side counts, read or not, so a bout
    // that wasn't read doesn't shift the columns)
    const mine = out.filter(o => o.weight === weight && numOf.has(o) && pg.includes(numOf.get(o)!))
    const placeNums = new Set(nums.filter(n => !champSide(n) || n === thirdNum).sort((a, c) => Number(c.s) - Number(a.s)).slice(0, 3))
    const special = new Set([champNum, ...placeNums, ...mine.filter(o => o.round === 'pigtail').map(o => numOf.get(o))])
    for (const champ of [true, false]) {
      const sideNums = nums.filter(n => champSide(n) === champ && !special.has(n))
      const names = champ ? ['sf', 'qf', 'r2', 'r1', 'pigtail'] : ['csf', 'cqf', 'c4', 'c3', 'c2', 'c1', 'cpig']
      const r = roundsByColumn(sideNums.map(n => ({ item: n, tag: n })), names)
      for (const o of mine) if (!o.round && !placeNums.has(numOf.get(o)!) && champSide(numOf.get(o)!) === champ) o.round = r.get(numOf.get(o)!) ?? null
    }
    // which place: from the two wrestlers' places, else from how they got there (both won / both lost a consolation
    // semifinal → 3rd / 5th; both lost a consolation quarterfinal → 7th)
    const lostIn = (e: NcaaEntrant, rd: string) => mine.some(o => o.round === rd && o.loser === e)
    const wonIn = (e: NcaaEntrant, rd: string) => mine.some(o => o.round === rd && o.winner === e)
    for (const o of mine) {
      if (!placeNums.has(numOf.get(o)!) || !o.loser) continue
      const two = [o.winner, o.loser]
      o.round = placeBoutOf(W, o.winner, o.loser)
        ?? (two.every(e => wonIn(e, 'csf')) ? '3rd' : two.every(e => lostIn(e, 'csf')) ? '5th' : two.every(e => lostIn(e, 'cqf')) ? '7th' : numOf.get(o) === thirdNum ? '3rd' : null)
    }
    // the one left over when the other two are known
    const placeBouts = mine.filter(o => placeNums.has(numOf.get(o)!))
    const open = placeBouts.filter(o => !o.round), missing = PLACE_ROUNDS.filter(r => !placeBouts.some(o => o.round === r))
    if (placeBouts.length === 3 && open.length === 1 && missing.length === 1) open[0].round = missing[0]
  }
  return out
}

/** Bout checks: nobody loses three times, the champion never loses, each weight's bout count */
export function checkBouts(weights: NcaaWeight[], bouts: NcaaBout[]): string[] {
  const problems: string[] = []
  for (const w of weights) {
    const mine = bouts.filter(b => b.weight === w.weight)
    const losses = new Map<NcaaEntrant, number>()
    for (const b of mine) if (b.loser) losses.set(b.loser, (losses.get(b.loser) ?? 0) + 1)
    // a place bout after elimination is a third loss: 6th and 8th can have 3, everyone else at most 2
    const placeOf = (e: NcaaEntrant) => w.placers.find(p => p.name === e.name && p.school === e.school)?.place
    for (const [e, n] of losses) if (n > ([6, 8].includes(placeOf(e) ?? 0) ? 3 : 2)) problems.push(`${w.weight}: ${e.name} has ${n} losses`)
    const champ = w.placers.find(p => p.place === 1)
    const champE = champ && w.entrants.find(e => e.name === champ.name)
    if (champE && losses.get(champE)) problems.push(`${w.weight}: champion ${champ!.name} has a loss`)
    if (mine.length < w.entrants.length + (w.entrants.length >= 32 ? 28 : 20)) problems.push(`${w.weight}: ${mine.length} bouts read`)
    const noLoser = mine.filter(b => !b.loser).length
    if (noLoser > 2) problems.push(`${w.weight}: ${noLoser} bouts without a loser`)
  }
  return problems
}

/** "Fall 1:27" → fall, 87 s; "TF-1.5 5:00 (21-6)" / "TF 20-4, 7:00" → tf; "MD 12-2" → md; "SV-1 4-2" → sv; … */
export function resultType(raw: string | null): { type: 'dec' | 'md' | 'tf' | 'fall' | 'sv' | 'tb' | 'inj' | 'for' | 'dq' | null; secs: number | null } {
  if (!raw) return { type: null, secs: null }
  const t = raw.trim()
  const time = t.match(/(\d{1,2}):(\d{2})/)
  const secs = time ? Number(time[1]) * 60 + Number(time[2]) : null
  // (older sheets: "Pin 2:46" for a fall, "Maj 8-0" for a major)
  if (/^(fall|wbf|pin)\b/i.test(t)) return { type: 'fall', secs }
  if (/^tf\b|^tf-/i.test(t)) return { type: 'tf', secs }
  if (/^(md|maj)\b/i.test(t)) return { type: 'md', secs: null }
  if (/^sv-?\d/i.test(t)) return { type: 'sv', secs: null }
  if (/^(tb-?\d|utb)/i.test(t)) return { type: 'tb', secs: null }
  if (/^(inj|def|dflt|wdf|wbd|med|i-d\b)/i.test(t)) return { type: 'inj', secs: null }
  if (/^(m\.? ?for|for\.?|forf|mff|wft|ff\b)/i.test(t)) return { type: 'for', secs: null }
  if (/^(dq|wdq)/i.test(t)) return { type: 'dq', secs: null }
  // the printout gives a plain score (with OT / TB / SV after it): major at 8+, overtime / tiebreak as such
  const sc = t.match(/^(\d+)-(\d+)/)
  if (sc) return { type: /\b(tb|utb)\b/i.test(t) ? 'tb' : /\b(ot|sv(-\d)?)\b/i.test(t) ? 'sv' : Number(sc[1]) - Number(sc[2]) >= 15 ? 'tf' : Number(sc[1]) - Number(sc[2]) >= 8 ? 'md' : 'dec', secs: null }
  if (/^dec\b/i.test(t)) return { type: 'dec', secs: null }
  return { type: null, secs: null }
}

// ── bouts, wrestlingstats printout (2000–2014, 2016) ──────────────────────────────────────────────────────────────

/** The printout's brackets are trees laid out in columns, each half the one before: sorted top to bottom, the i-th
 *  winner of a column came from items 2i and 2i+1 of the column to its left. A winner reads "Name score" (champion
 *  side: full name; consolation: last name); "Name, School" items are entrants (column one) or wrestlers dropping in
 *  from the championship side. The championship's last column holds both semifinal winners with the champion between
 *  them. Place bouts come from the "Third Place: … / Fourth Place: …" list, pigtails from their own page. Some years
 *  print pages sideways (every entrant on one line), so the axes swap. */
export function parseStatsBouts(items: Item[], weights: NcaaWeight[]): NcaaBout[] {
  const out: NcaaBout[] = []
  const nm = (x: string) => x.toLowerCase().replace(/[^a-z]/g, '')
  const lastNm = (x: string) => nm(x.trim().split(/\s+/).slice(-1)[0] ?? '')
  // results as the printout writes them: a score, Fall, TF, or a code (WDF win by default, WBF by fall, MFF medical forfeit…)
  const RES = /\s+(?=(?:\d+-\d+|Fall\b|TF\b|Inj|Def|For|DQ|Med|M\. ?For|Dflt|Default|WBF|WBD|WDF|WFT|WDQ|MFF|Forf))/i
  const splitWin = (s: string) => { const i = s.search(RES); return i < 0 ? { who: s.trim(), res: null } : { who: s.slice(0, i).trim(), res: s.slice(i).trim() } }
  // the winner of two: his full name first; a last name only when it fits one of the two (two wrestlers with the same
  // last name who met — Scott and Cliff Moore 2003, Bo and Isaac Jordan 2015 — were going to the first listed)
  const whichOf = (two: (NcaaEntrant | null)[], who: string) => {
    const ok = two.filter((e): e is NcaaEntrant => !!e)
    const full = ok.filter(e => nm(e.name) === nm(who))
    if (full.length === 1) return full[0]
    const last = ok.filter(e => lastNm(e.name) === nm(who) || lastNm(e.name) === lastNm(who))
    if (last.length === 1) return last[0]
    // same last name: the first-name letters printed ("S. Moore", "Scott Moore") decide, else unknown
    const first = nm(who.trim().split(/\s+/)[0] ?? '')
    const byFirst = last.filter(e => first && nm(e.name).startsWith(first.replace(/\.$/, '')))
    return byFirst.length === 1 ? byFirst[0] : null
  }
  const isEntry = (s: string) => /,/.test(s) && !/\d+-\d+|\bFall\b|\bTF\b|\bW[BDF][FDT]\b|\bMFF\b/.test(s)
  const pages = [...new Set(items.map(i => i.p))]
  for (const p of pages) {
    const raw = items.filter(i => i.p === p)
    const wl = raw.find(i => new RegExp(`^${WT} (Weight Class|Consolation Bracket)$`).test(i.s))
    const weight = wl ? weightOf(wl.s) : null
    const W = weight ? weights.find(w => w.weight === weight) : undefined
    if (!W) continue
    const champ = /Weight Class/.test(wl!.s)
    // an entrant from "Name, School [seed]" (champion side) or "Last, School" (consolation)
    const entrantOf = (s: string) => {
      const m = s.match(/^(.+?),\s*(.+?)(?:\s*\[\d+\])?$/)
      if (!m) return null
      const school = m[2].trim().toLowerCase()
      const fits = (e: NcaaEntrant) => e.school.toLowerCase().startsWith(school.slice(0, Math.max(6, Math.min(school.length, 18))))
      return W.entrants.find(e => nm(e.name) === nm(m[1]) && fits(e)) ?? W.entrants.find(e => lastNm(e.name) === lastNm(m[1]) && fits(e)) ?? W.entrants.find(e => nm(e.name) === nm(m[1])) ?? null
    }
    const pg = raw.filter(i => !/Wrestling Championship|Page \d|Compiled by|\d+\/\d+\/\d{4}|Weight Class|Consolation Bracket|Place:$/.test(i.s) && !/Place:/.test(i.s))
    const ents = pg.filter(i => isEntry(i.s))
    const sideways = new Set(ents.map(i => Math.round(i.y))).size < new Set(ents.map(i => Math.round(i.x))).size
    const colV = (i: Item) => (sideways ? i.y : i.x), ordV = (i: Item) => (sideways ? i.x : -i.y)
    // the place list sits in its own columns on the consolation page: kept out of the bracket
    const placeRows = raw.filter(i => /^(Third|Fourth|Fifth|Sixth|Seventh|Eighth) Place:$/.test(i.s))
    const inPlaceList = (i: Item) => placeRows.some(l => Math.abs((sideways ? l.x : l.y) - (sideways ? i.x : i.y)) < 3 && colV(i) > colV(l))
    // a wrestler who drew a bye moves on as just his name ("Chad Caros"), no result
    const tree = pg.filter(i => !inPlaceList(i) && (isEntry(i.s) || /^Bye$/i.test(i.s) || RES.test(i.s) || /^[A-Z][A-Za-z.'`’ -]+$/.test(i.s)))
    const cols: Item[][] = []
    for (const i of [...tree].sort((a, b) => colV(a) - colV(b))) { const c = cols.find(cc => Math.abs(colV(cc[0]) - colV(i)) < 8); if (c) c.push(i); else cols.push([i]) }
    for (const c of cols) c.sort((a, b) => ordV(a) - ordV(b))
    // each item as a wrestler: an entrant, or the winner of the pair it came from
    const holder = new Map<Item, NcaaEntrant | null>()
    for (const i of cols[0] ?? []) holder.set(i, /^Bye$/i.test(i.s) ? null : entrantOf(i.s))
    // rounds by column from the entrants' column (the championship page's last holds the semifinal winners and the final)
    // (the consolation side: its last two columns are the semifinals and quarterfinals, the ones before numbered from the
    // start — older years, 1979–1998, wrestled back in fewer rounds)
    const consRounds = cols.length - 1
    const roundAt = (k: number) => champ ? (['r1', 'r2', 'qf', 'sf'][k - 1] ?? null)
      : k === consRounds ? 'csf' : k === consRounds - 1 ? 'cqf' : k >= 1 && k <= 6 ? `c${k}` : null
    for (let k = 1; k < cols.length; k++) {
      const prev = cols[k - 1], here = cols[k]
      const last = champ && k === cols.length - 1 && here.length === 3 && prev.length === 4
      const winners = last ? [here[0], here[2]] : here.filter(i => !isEntry(i.s))
      for (const i of here.filter(i => isEntry(i.s))) holder.set(i, entrantOf(i.s))
      // the pairing only holds when the counts do: winners = half the column before. Otherwise this round is left out
      // (a shifted pairing would give wrong opponents) and its winners stay unknown
      if (winners.length * 2 !== prev.length) { for (const wi of winners) holder.set(wi, null); continue }
      winners.forEach((wi, n) => {
        const a = prev[2 * n], b = prev[2 * n + 1]
        const pa = a ? holder.get(a) ?? null : null, pb = b ? holder.get(b) ?? null : null
        const { who, res } = splitWin(wi.s)
        const pick = whichOf([pa, pb], who)
        holder.set(wi, pick)
        if (pick && pa && pb) out.push({ weight: W.weight, bout: 0, winner: pick, loser: pick === pa ? pb : pa, result: res, round: roundAt(k) })
      })
      if (last) {
        const sf1 = holder.get(here[0]) ?? null, sf2 = holder.get(here[2]) ?? null
        const { who, res } = splitWin(here[1].s)
        const pick = whichOf([sf1, sf2], who)
        if (pick && sf1 && sf2) out.push({ weight: W.weight, bout: 0, winner: pick, loser: pick === sf1 ? sf2 : sf1, result: res, round: 'f' })
      }
    }
    // place bouts: "Third Place: Brandon Precin, Northwestern 3-1" over "Fourth Place: Anthony Robles, Arizona State"
    if (!champ) {
      const rowOf = (lab: string) => {
        const l = raw.find(i => i.s === `${lab} Place:`)
        const v = l && raw.filter(i => i !== l && Math.abs((sideways ? i.x - l.x : i.y - l.y)) < 3 && colV(i) > colV(l)).sort((a, b) => colV(a) - colV(b))[0]
        return v?.s ?? null
      }
      for (const [w, l, rd] of [['Third', 'Fourth', '3rd'], ['Fifth', 'Sixth', '5th'], ['Seventh', 'Eighth', '7th']]) {
        const ws = rowOf(w), ls = rowOf(l)
        if (!ws || !ls) continue
        const m = ws.match(/^(.+?,\s*[^,\d]+?)\s+(\S.*)$/)
        const winner = entrantOf(m ? m[1] : ws), loser = entrantOf(ls)
        if (winner && loser) out.push({ weight: W.weight, bout: 0, winner, loser, result: m ? m[2] : null, round: rd })
      }
    }
  }
  // pigtails: "Championship Pigtail Bouts for 125" / "Consolation Pigtail Bouts for 125" — "Name - School" ×2, then "Last result"
  for (const p of pages) {
    const pg = items.filter(i => i.p === p).sort((a, b) => b.y - a.y || a.x - b.x)
    let W: NcaaWeight | undefined, rd = 'pigtail'
    let pair: NcaaEntrant[] = []
    for (const i of pg) {
      const h = i.s.match(/Pigtail Bouts for (\d{3})/)
      if (h) { W = weights.find(w => w.weight === Number(h[1])); rd = /Consolation/i.test(i.s) ? 'cpig' : 'pigtail'; pair = []; continue }
      if (!W) continue
      const e = i.s.match(/^(.+?)\s+-\s+(.+)$/)
      if (e && !/\d/.test(i.s)) { const x = W.entrants.find(en => nm(en.name) === nm(e[1])); if (x) pair.push(x); continue }
      if (pair.length === 2) {
        const { who, res } = splitWin(i.s)
        const winner = whichOf(pair, who) ?? undefined
        if (winner) out.push({ weight: W.weight, bout: 0, winner, loser: pair.find(x => x !== winner) ?? null, result: res, round: rd })
        pair = []
      }
    }
  }
  return out
}
