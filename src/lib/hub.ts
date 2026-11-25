// Tournament hubs (Kyle 2026-11-12): Middle School and Offseason, admin only, to help with rankings.
// Each side has its own tables (boys_/girls_hub_tournaments, _hub_events, _hub_placements, _hub_bouts,
// _prospects); clubs are shared (wrestling_clubs). Everyone on a podium or in a bout is a prospect — one
// record per kid across both hubs — linked to their high school wrestler once known.
// Podiums are tracked per style (folkstyle, freestyle; no Greco).

export type HubKey = 'ms' | 'offseason'
// 'X' = the mixed pool: the Middle School Hub mixes boys and girls (Kyle 2026-11-12: "we can't tell gender,
// we just have to make the middle school pool mixed"); its tables are mixed_* and both sides show them.
export type HubGender = 'M' | 'F' | 'X'
/** The pool a hub uses on a side: Middle School is mixed; Offseason follows the side. */
export const hubPool = (hub: HubKey, side: 'M' | 'F'): HubGender => (hub === 'ms' ? 'X' : side)
export type HubStyle = 'folkstyle' | 'freestyle'

export const HUBS: Record<HubKey, { label: string; path: string }> = {
  ms:        { label: 'Middle School', path: 'middle-school' },
  offseason: { label: 'Offseason',     path: 'offseason' },
}
export const hubFromPath = (p: string): HubKey | null =>
  p === 'middle-school' ? 'ms' : p === 'offseason' ? 'offseason' : null
export const isHubKey = (h: unknown): h is HubKey => h === 'ms' || h === 'offseason'
export const isHubStyle = (s: unknown): s is HubStyle => s === 'folkstyle' || s === 'freestyle'

const prefix = (g: HubGender) => (g === 'X' ? 'mixed' : g === 'F' ? 'girls' : 'boys')
export const hubTables = (g: HubGender) => ({
  tournaments: `${prefix(g)}_hub_tournaments`,
  events:      `${prefix(g)}_hub_events`,
  placements:  `${prefix(g)}_hub_placements`,
  bouts:       `${prefix(g)}_hub_bouts`,
  prospects:   `${prefix(g)}_prospects`,
})
export const CLUBS_TABLE = 'wrestling_clubs'

// Hub seasons (Kyle 2026-11-12). The offseason falls within one calendar year: the 2026 offseason is every
// event dated in 2026. The middle school season runs June through May, keyed by its ending year like the
// site's seasons (June 2025 – May 2026 = 2026, shown "2025-26").
export function hubSeasonOfDate(hub: HubKey, isoDate: string): number {
  const [y, m] = isoDate.split('-').map(Number)
  return hub === 'ms' && m >= 6 ? y + 1 : y
}
export const hubSeasonLabel = (hub: HubKey, season: number) =>
  hub === 'ms' ? `${season - 1}-${String(season).slice(2)}` : String(season)

export const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// ── Names ────────────────────────────────────────────────────────────────────

/** "Smith, John" or "John Smith" → first/last. A suffix (Jr, III) stays on the last name. */
export function splitName(raw: string): { first_name: string; last_name: string } {
  const s = raw.replace(/\s+/g, ' ').trim()
  if (s.includes(',')) {
    const [last, first] = s.split(',', 2).map(x => x.trim())
    return { first_name: first, last_name: last }
  }
  const parts = s.split(' ')
  if (parts.length === 1) return { first_name: '', last_name: parts[0] }
  const suffix = /^(jr|sr|ii|iii|iv)\.?$/i.test(parts[parts.length - 1]) && parts.length > 2 ? parts.pop()! : null
  const last = parts.pop()!
  return { first_name: parts.join(' '), last_name: suffix ? `${last} ${suffix}` : last }
}

/** Comparison key: lower case, letters only, initials joined ("J.D. Smith" = "JD Smith"). */
export const nameKey = (first: string, last: string) =>
  `${first} ${last}`.toLowerCase().replace(/\b([a-z])\./g, '$1').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()

export const clubKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

// ── Pasted results ───────────────────────────────────────────────────────────

export type PodiumRow = {
  line: number
  division: string | null
  weight: string
  place: number
  place_to: number | null   // a tied group: 9–12 = place 9, place_to 12
  style?: HubStyle | null   // from a Style column (uploads); else the import's style
  class_year?: number | null   // from a Class column (uploads: grade → HS class year)
  name: string
  club: string | null
  state: string | null
}
export type BoutRow = {
  line: number
  division: string | null
  weight: string
  date: string | null
  round: string | null
  winner: string
  winner_club: string | null
  loser: string
  loser_club: string | null
  win_type: string | null
  score: string | null
}
export type ParseOutcome<T> = { rows: T[]; skipped: { line: number; text: string; why: string }[] }

// Track exports quote cells as ="value"
const cell = (v: string | undefined) => (v ?? '').replace(/^="?|"$/g, '').replace(/^"|"$/g, '').trim()

function splitLine(line: string, delim: string): string[] {
  if (delim === '\t') return line.split('\t').map(cell)
  const out: string[] = []
  let cur = '', q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++ } else q = !q }
    else if (c === ',' && !q) { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out.map(cell)
}

function table(text: string) {
  const lines = text.split(/\r?\n/)
  const first = lines.findIndex(l => l.trim())
  if (first < 0) return null
  const delim = lines[first].includes('\t') ? '\t' : ','
  const head = splitLine(lines[first], delim).map(h => h.toLowerCase())
  return { lines, first, delim, head }
}

const col = (head: string[], ...names: RegExp[]) => {
  for (const re of names) { const i = head.findIndex(h => re.test(h)); if (i >= 0) return i }
  return -1
}

const PLACE_WORD: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8 }
/** A place or a tied group: "3", "3rd", "9-12", "9th–12th". */
function parsePlaceRange(v: string): { place: number; place_to: number | null } | null {
  const r = /^(\d+)(?:st|nd|rd|th)?\s*[-–]\s*(\d+)(?:st|nd|rd|th)?/i.exec(v.trim())
  if (r && +r[2] > +r[1]) return { place: +r[1], place_to: +r[2] }
  const p = parsePlace(v)
  return p ? { place: p, place_to: null } : null
}
export const placeLabel = (place: number, to: number | null | undefined) => (to ? `${ordinal(place)}–${ordinal(to)}` : ordinal(place))

function parsePlace(v: string): number | null {
  const s = v.trim().toLowerCase()
  const m = /^(\d+)/.exec(s)
  if (m) return parseInt(m[1], 10)
  for (const [w, n] of Object.entries(PLACE_WORD)) if (s.startsWith(w)) return n
  if (/champ/.test(s)) return 1
  return null
}

/**
 * Podiums. Two shapes:
 * 1. A table with a header row (comma or tab): Weight, Place, Name/Wrestler, Club/Team, optional State,
 *    Division.
 * 2. Plain lines: a weight line ("120", "120 lbs", "Cadet 120") followed by place lines
 *    ("1st Place - John Smith of Iron Horse", "1st: John Smith (Iron Horse)", "1. John Smith, Iron Horse").
 */
export function parsePodiums(text: string): ParseOutcome<PodiumRow> {
  const rows: PodiumRow[] = [], skipped: ParseOutcome<PodiumRow>['skipped'] = []
  const t = table(text)
  if (!t) return { rows, skipped }
  const { lines, first, delim, head } = t
  const iW = col(head, /^weight|^wt/), iP = col(head, /^place|^pl/), iN = col(head, /^(name|wrestler)/)
  if (iW >= 0 && iP >= 0 && iN >= 0) {
    const iC = col(head, /^club/, /^team/, /^school/), iS = col(head, /^state|^st$/), iD = col(head, /^div|^bracket|^age/)
    const iSt = col(head, /^style/), iCl = col(head, /^class/)
    for (let i = first + 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue
      const c = splitLine(lines[i], delim)
      const pr = parsePlaceRange(c[iP] ?? ''), weight = c[iW], name = c[iN]
      const place = pr?.place ?? null
      if (!place || !weight || !name) { skipped.push({ line: i + 1, text: lines[i], why: 'needs a weight, place and name' }); continue }
      const sv = iSt >= 0 ? (c[iSt] || '').toLowerCase() : '', cy = iCl >= 0 ? parseInt(c[iCl] || '') : NaN
      rows.push({ line: i + 1, division: iD >= 0 ? c[iD] || null : null, weight, place, place_to: pr?.place_to ?? null, style: isHubStyle(sv) ? sv : null, class_year: Number.isFinite(cy) ? cy : null, name,
        club: iC >= 0 ? c[iC] || null : null, state: iS >= 0 ? (c[iS] || '').toUpperCase().slice(0, 2) || null : null })
    }
    return { rows, skipped }
  }
  let division: string | null = null, weight: string | null = null
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].trim()
    if (!s) continue
    const placeLine = /^(\d+)(?:st|nd|rd|th)?(?:\s*place)?\s*[-:.)]\s*(.+)$/i.exec(s)
    if (placeLine && weight) {
      const place = parseInt(placeLine[1], 10)
      let rest = placeLine[2].trim(), club: string | null = null
      const paren = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(rest)
      const of = /^(.*?)\s+of\s+(.+)$/i.exec(rest)
      const comma = /^([^,]+),\s*(.+)$/.exec(rest)
      if (paren) { rest = paren[1]; club = paren[2] }
      else if (of) { rest = of[1]; club = of[2] }
      else if (comma) { rest = comma[1]; club = comma[2] }
      // "Name (PA)": a two-letter code in brackets is the wrestler's state, not a club
      const isState = !!club && /^[A-Z]{2}$/.test(club.trim())
      rows.push({ line: i + 1, division, weight, place, place_to: null, name: rest.trim(), club: isState ? null : club?.trim() || null, state: isState ? club!.trim() : null })
      continue
    }
    const w = /^(.*?)(\d{2,3}|hwt|heavyweight)\s*(?:lbs?|#)?\s*$/i.exec(s)
    if (w) { division = w[1].replace(/[-–:]\s*$/, '').trim() || null; weight = w[2].toUpperCase() === 'HEAVYWEIGHT' ? 'HWT' : w[2].toUpperCase(); continue }
    skipped.push({ line: i + 1, text: s, why: weight ? 'not a place line' : 'before the first weight line' })
  }
  return { rows, skipped }
}

/**
 * Bouts: a TrackWrestling bout export (Date, Weight, Round, Winning Wrestler, Winning Team, Result,
 * Win Type, Losing Wrestler, Losing Team, ...). Byes and rows with no loser are skipped.
 */
export function parseBouts(text: string): ParseOutcome<BoutRow> {
  const rows: BoutRow[] = [], skipped: ParseOutcome<BoutRow>['skipped'] = []
  const t = table(text)
  if (!t) return { rows, skipped }
  const { lines, first, delim, head } = t
  const iWin = col(head, /^winn(ing|er)( wrestler)?$/, /^winn/), iLos = col(head, /^los(ing|er)( wrestler)?$/, /^los/)
  const iW = col(head, /^weight|^wt/)
  if (iWin < 0 || iLos < 0 || iW < 0) {
    skipped.push({ line: first + 1, text: lines[first], why: 'needs a header row with Weight, Winning Wrestler and Losing Wrestler' })
    return { rows, skipped }
  }
  const iWT = col(head, /^winning team|^winner team|^winner club/), iLT = col(head, /^losing team|^loser team|^loser club/)
  const iD = col(head, /^date/), iR = col(head, /^round/), iRes = col(head, /^result|^score/), iType = col(head, /^win type|^type|^dec/)
  const iDiv = col(head, /^div|^bracket|^age/)
  for (let i = first + 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const c = splitLine(lines[i], delim)
    const winner = c[iWin], loser = c[iLos], winType = iType >= 0 ? c[iType] || null : null
    if (!winner || !loser || /^bye$/i.test(winType ?? '')) { skipped.push({ line: i + 1, text: lines[i], why: 'bye or no opponent' }); continue }
    const d = iD >= 0 ? /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(c[iD] ?? '') : null
    rows.push({
      line: i + 1, division: iDiv >= 0 ? c[iDiv] || null : null, weight: c[iW],
      date: d ? `${d[3]}-${d[1].padStart(2, '0')}-${d[2].padStart(2, '0')}` : null,
      round: iR >= 0 ? c[iR] || null : null,
      winner, winner_club: iWT >= 0 ? c[iWT] || null : null, loser, loser_club: iLT >= 0 ? c[iLT] || null : null,
      win_type: winType, score: iRes >= 0 ? c[iRes] || null : null,
    })
  }
  return { rows, skipped }
}

/** A tournament's level and the champion rating it starts with (Kyle 2026-11-12: "90, 75, 50"); the rating can be
 *  changed per tournament. Used to rate out-of-state wrestlers. */
export const HUB_LEVELS: Record<string, number> = { national: 90, regional: 75, state: 50, local: 25 }   // local: middle school (Kyle 2026-11-12)
export const HUB_LEVEL_LABEL: Record<string, string> = { national: 'National', regional: 'Regional', state: 'State', local: 'Local' }
