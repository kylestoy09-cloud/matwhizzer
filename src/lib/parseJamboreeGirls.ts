// ─────────────────────────────────────────────────────────────────────────────
// parseJamboreeGirls.ts
//
// Parses three jamboree / round-robin text formats into ParsedMeetGirls[] —
// one entry per unique cross-school pairing.
//
// FORMAT 1 — by-team listing (Garnet style):
//   Each line is a bout; weight prefixes the line:
//   100 Varsity - Winner Name (School) over Loser Name (School) (Fall 0:42)
//   The same bout appears in each team's section → de-duplicated.
//
// FORMAT 2 — by-pool listing (EB style):
//   Section headers give the weight: "Jamboree 100a"
//   Bullet-point lines: "•  Round 3 - Winner (School) won by fall over Loser (School) Fall 0:27"
//   DFF lines: "•  Round 2 - Name1 (School1) and Name2 (School2) DFF"
//   Same-school and "Unattached" bouts are skipped.
//
// FORMAT 3 — table copy-paste (TW team-view / Del Val style):
//   Weight on its own line, bout on the next line, "No"/"Yes" noise skipped:
//   100
//   [Varsity - ]Winner Name (School) over Loser Name (School) (Fall 0:00)
//   No
//   No
//   Same bout appears in multiple team-view sections → de-duplicated.
// ─────────────────────────────────────────────────────────────────────────────

import type { ParsedMeetGirls, ParsedMatchGirls } from './parseDualMeetGirls'

const WEIGHT_LIST = [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235] as const
const WEIGHT_SET  = new Set<number>(WEIGHT_LIST as unknown as number[])
const WEIGHT_ALT  = WEIGHT_LIST.join('|')

// ── Shared helpers ────────────────────────────────────────────────────────────

// Index of the "(" that opens the group closed at closeIdx, or -1.
function matchingOpenParen(s: string, closeIdx: number): number {
  let depth = 0
  for (let i = closeIdx; i >= 0; i--) {
    if (s[i] === ')') depth++
    else if (s[i] === '(') { depth--; if (depth === 0) return i }
  }
  return -1
}

function splitNameSchool(s: string): { name: string; school: string | null } {
  const lastClose = s.lastIndexOf(')')
  if (lastClose === -1) return { name: s.trim(), school: null }
  const openIdx = matchingOpenParen(s, lastClose)
  if (openIdx <= 0) return { name: s.trim(), school: null }
  return { name: s.slice(0, openIdx).trim(), school: s.slice(openIdx + 1, lastClose).trim() || null }
}

// NFHS dual scoring: fall, forfeit, default (injury) and disqualification are all
// worth 6; technical fall 5; major decision 4; every decision 3.
function winnerPoints(resultType: string): number {
  switch (resultType) {
    case 'Fall': case 'For': case 'MFFL': case 'Inj': case 'DQ': return 6
    case 'TF':   return 5
    case 'MD':   return 4
    default:     return 3   // Dec, SV-1, UTB
  }
}

// A trailing "(…)" group is the bout result only if it opens with a result token —
// otherwise it is the loser's school and the line carries no result.
const RESULT_TOKEN_RE = /^(?:fall|dec|md|maj|tf|sv-?1|tb-?1|tb-?2|utb|mffl|inj|def|for|dq|double\s*forfeit)\b/i

function pairKey(s1: string, s2: string): string {
  const [a, b] = [s1, s2].sort()
  return `${a}|||${b}`
}

// ── Raw bout (shared by both format parsers) ──────────────────────────────────

type RawBout = {
  weight:          number
  winnerName:      string | null
  winnerSchool:    string | null
  loserName:       string | null
  loserSchool:     string | null
  // for DFFs where both parties are known (Format 2)
  dffName1?:       string | null
  dffSchool1?:     string | null
  dffName2?:       string | null
  dffSchool2?:     string | null
  resultType:      string
  resultDetail:    string | null
  isDoubleForfeit: boolean
  isForfeitWin:    boolean
}

// ── Cross-view de-duplication (Formats 1 and 3) ───────────────────────────────
// TrackWrestling repeats each bout in every team's section, and the weight it
// shows can differ between the all-matches grid and a team view (Del Val Kickoff
// listed one Dec 9-4 at both 120 and 126). Listings that agree on winner, loser
// and result are therefore the same bout even when the weight differs: the weight
// reported by the most listings wins, and the first listing breaks a tie.
//
// The result stays in the key so a real rematch survives — if a pair meets twice
// the two bouts end differently, while a repeated listing of one bout carries the
// identical result string in every section.
//
// Forfeits and double forfeits leave one side unknown, so those stay keyed by
// weight — otherwise every forfeit in the event would collapse into one bout.

function boutSignature(b: RawBout): string {
  if (!b.winnerName || !b.loserName) {
    return `w${b.weight}|${(b.winnerName ?? '').toLowerCase()}|${(b.loserName ?? '').toLowerCase()}|${b.resultType}`
  }
  return `${b.winnerName.toLowerCase()}|||${b.loserName.toLowerCase()}|||${b.resultType}|||${b.resultDetail ?? ''}`
}

function collapseDuplicateBouts(bouts: RawBout[]): RawBout[] {
  const groups = new Map<string, RawBout[]>()
  const order: string[] = []

  for (const b of bouts) {
    const sig = boutSignature(b)
    if (!groups.has(sig)) { groups.set(sig, []); order.push(sig) }
    groups.get(sig)!.push(b)
  }

  return order.map(sig => {
    const group = groups.get(sig)!
    if (group.length === 1) return group[0]

    const counts = new Map<number, number>()
    for (const b of group) counts.set(b.weight, (counts.get(b.weight) ?? 0) + 1)

    let best = group[0]
    for (const b of group) {
      if ((counts.get(b.weight) ?? 0) > (counts.get(best.weight) ?? 0)) best = b
    }
    return best
  })
}

// ── Grouping logic (shared) ───────────────────────────────────────────────────

function buildMeets(bouts: RawBout[], date: string): ParsedMeetGirls[] {
  const pairMap = new Map<string, RawBout[]>()

  for (const b of bouts) {
    let k: string | null = null

    if (b.isDoubleForfeit) {
      const s1 = b.dffSchool1
      const s2 = b.dffSchool2
      if (s1 && s2 && s1 !== s2) {
        k = pairKey(s1, s2)
      }
    } else {
      const ws = b.winnerSchool
      const ls = b.loserSchool
      if (!ws) continue
      if (b.isForfeitWin) {
        // forfeit win — loser school unknown, skip grouping (can't assign pairing)
        continue
      }
      if (!ls || ws === ls) continue   // skip same-school bouts
      k = pairKey(ws, ls)
    }

    if (!k) continue
    if (!pairMap.has(k)) pairMap.set(k, [])
    pairMap.get(k)!.push(b)
  }

  const results: ParsedMeetGirls[] = []

  for (const [key, pairBouts] of pairMap) {
    const [team1Name, team2Name] = key.split('|||')

    let team1Score = 0
    let team2Score = 0

    const matches: ParsedMatchGirls[] = pairBouts
      .sort((a, b) => a.weight - b.weight)
      .map(b => {
        let t1Pts = 0, t2Pts = 0

        if (!b.isDoubleForfeit) {
          const winnerIsT1 = b.winnerSchool === team1Name
          const pts = winnerPoints(b.resultType)
          t1Pts = winnerIsT1 ? pts : 0
          t2Pts = winnerIsT1 ? 0   : pts
        }

        team1Score += t1Pts
        team2Score += t2Pts

        return {
          weightClass:     b.weight,
          winnerName:      b.winnerName   ?? null,
          winnerSchoolRaw: b.winnerSchool ?? null,
          loserName:       b.loserName    ?? null,
          loserSchoolRaw:  b.loserSchool  ?? null,
          resultType:      b.resultType,
          resultDetail:    b.resultDetail,
          team1Points:     t1Pts,
          team2Points:     t2Pts,
          isDoubleForfeit: b.isDoubleForfeit,
          isForfeitWin:    b.isForfeitWin,
        }
      })

    results.push({
      rawText:    `${team1Name} vs. ${team2Name} — jamboree ${date}`,
      date,
      team1Name,
      team2Name,
      team1Score,
      team2Score,
      matches,
    })
  }

  results.sort((a, b) => a.team1Name.localeCompare(b.team1Name) || a.team2Name.localeCompare(b.team2Name))
  return results
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT 1 — by-team listing parser
// ─────────────────────────────────────────────────────────────────────────────

const WEIGHT_RE_F1 = new RegExp(`^(${WEIGHT_ALT})\\s+`)

function cleanDetail(s: string): string | null {
  // strip placeholder brackets like [time] from copied TW tables
  return s.replace(/\[.*?\]/g, '').trim() || null
}

function parseResultF1(s: string): { resultType: string; resultDetail: string | null } {
  s = s.trim()
  if (/^fall/i.test(s))             return { resultType: 'Fall',          resultDetail: cleanDetail(s.replace(/^fall\s*/i,  '')) }
  if (/^md/i.test(s))               return { resultType: 'MD',            resultDetail: cleanDetail(s.replace(/^md\s*/i,    '')) }
  if (/^maj/i.test(s))              return { resultType: 'MD',            resultDetail: cleanDetail(s.replace(/^maj\s*/i,   '')) }
  if (/^tf/i.test(s))               return { resultType: 'TF',            resultDetail: cleanDetail(s.replace(/^tf\s*/i,    '')) }
  if (/^sv-1/i.test(s))             return { resultType: 'SV-1',          resultDetail: cleanDetail(s.replace(/^sv-1\s*/i,  '')) }
  if (/^tb-1/i.test(s))             return { resultType: 'SV-1',          resultDetail: cleanDetail(s.replace(/^tb-1\s*/i,  '')) }
  if (/^utb/i.test(s))              return { resultType: 'UTB',           resultDetail: cleanDetail(s.replace(/^utb\s*/i,   '')) }
  if (/^mffl/i.test(s))             return { resultType: 'MFFL',          resultDetail: null }
  if (/^dec/i.test(s))              return { resultType: 'Dec',           resultDetail: cleanDetail(s.replace(/^dec\s*/i,   '')) }
  if (/^inj/i.test(s))              return { resultType: 'Inj',           resultDetail: cleanDetail(s.replace(/^inj\.?\s*/i,'')) }
  if (/^def/i.test(s))              return { resultType: 'Inj',           resultDetail: cleanDetail(s.replace(/^def\.?\s*/i,'')) }
  if (/^dq/i.test(s))               return { resultType: 'DQ',            resultDetail: null }
  if (/^for/i.test(s))              return { resultType: 'For',           resultDetail: null }
  if (/^double\s*forfeit/i.test(s)) return { resultType: 'Double Forfeit', resultDetail: null }
  return { resultType: s, resultDetail: null }
}

function parseBoutLineF1(line: string): RawBout | null {
  const t = line.trim()
  const wm = t.match(WEIGHT_RE_F1)
  if (!wm) return null
  const weight = parseInt(wm[1])
  if (!WEIGHT_SET.has(weight)) return null

  let body = t.slice(wm[0].length).replace(/^(?:varsity|jv|junior varsity)\s*-\s*/i, '').trim()

  if (/^double\s*forfeit/i.test(body)) {
    return { weight, winnerName: null, winnerSchool: null, loserName: null, loserSchool: null,
             resultType: 'Double Forfeit', resultDetail: null, isDoubleForfeit: true, isForfeitWin: false }
  }

  const overIdx = body.indexOf(' over ')
  if (overIdx === -1) return null

  const winnerPart = body.slice(0, overIdx).trim()
  const afterOver  = body.slice(overIdx + 6).trim()
  const { name: winnerName, school: winnerSchool } = splitNameSchool(winnerPart)
  if (!winnerName || !winnerSchool) return null

  const lastClose = afterOver.lastIndexOf(')')
  if (lastClose === -1) return null
  const bStart = matchingOpenParen(afterOver, lastClose)
  if (bStart === -1) return null

  const resultStr = afterOver.slice(bStart + 1, lastClose)
  const loserPart = afterOver.slice(0, bStart).trim()
  const { resultType, resultDetail } = parseResultF1(resultStr)

  if (resultType === 'For' || /^unknown\s*\(for\.\)$/i.test(loserPart)) {
    return { weight, winnerName, winnerSchool, loserName: null, loserSchool: null,
             resultType: 'For', resultDetail: null, isDoubleForfeit: false, isForfeitWin: true }
  }

  const { name: loserName, school: loserSchool } = splitNameSchool(loserPart)
  if (!loserName || !loserSchool) return null

  return { weight, winnerName, winnerSchool, loserName, loserSchool,
           resultType, resultDetail, isDoubleForfeit: false, isForfeitWin: false }
}

function parseFormatOne(rawText: string, date: string): ParsedMeetGirls[] {
  const lines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const bouts: RawBout[] = []

  for (const line of lines) {
    const b = parseBoutLineF1(line)
    if (b) bouts.push(b)
  }

  return buildMeets(collapseDuplicateBouts(bouts), date)
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT 2 — by-pool listing (EB style)
// ─────────────────────────────────────────────────────────────────────────────

// Result type mapping for "won by X over" phrasing and trailing type tokens
const EB_TYPE_MAP: Record<string, string> = {
  fall:          'Fall',
  decision:      'Dec',
  'major decision': 'MD',
  'technical fall': 'TF',
  'injury default': 'Inj',
  default:       'Inj',
  forfeit:       'For',
  disqualification: 'DQ',
}
const EB_TRAIL_MAP: Record<string, string> = {
  fall:  'Fall',
  dec:   'Dec',
  maj:   'MD',
  md:    'MD',
  tf:    'TF',
  'sv-1':'SV-1',
  'tb-1':'SV-1',
  utb:   'UTB',
  'inj.':'Inj',
  inj:   'Inj',
  'def.':'Inj',
  def:   'Inj',
  'for.':'For',
  for:   'For',
  forfeit:'For',
  dq:    'DQ',
  mffl:  'MFFL',
}

function parseResultTrailF2(trailStr: string): { resultType: string; resultDetail: string | null } {
  const parts = trailStr.trim().split(/\s+/)
  if (parts.length === 0) return { resultType: trailStr.trim(), resultDetail: null }
  const typeRaw = parts[0].toLowerCase()
  const resultType = EB_TRAIL_MAP[typeRaw] ?? parts[0]
  const resultDetail = parts.slice(1).join(' ').trim() || null
  return { resultType, resultDetail }
}

// Extract weight from "Jamboree 100a", "Jamboree 114-114 B", "Jamboree 185-185"
function extractWeightF2(header: string): number | null {
  const m = header.match(/Jamboree\s+(\d+)/i)
  if (!m) return null
  const w = parseInt(m[1])
  return WEIGHT_SET.has(w) ? w : null
}

// Parse a stripped bullet body (after "Round N - " or "1st Place Match - " is removed)
function parseBulletBodyF2(body: string, weight: number): RawBout | null {
  // Bye — skip
  if (/received\s+a\s+bye/i.test(body)) return null

  // DFF: "Name1 (School1) and Name2 (School2) DFF"
  if (/\bDFF\b$/.test(body)) {
    // find " and " that separates the two parties
    const andMatch = body.match(/^(.+?)\s+and\s+(.+?)\s+DFF$/i)
    if (!andMatch) return null
    const { name: name1, school: school1 } = splitNameSchool(andMatch[1].trim())
    const { name: name2, school: school2 } = splitNameSchool(andMatch[2].trim())
    // skip if either school is unattached/missing
    if (!school1 || !school2) return null
    if (/unattached/i.test(school1) || /unattached/i.test(school2)) return null
    return {
      weight,
      winnerName: null, winnerSchool: null, loserName: null, loserSchool: null,
      dffName1: name1, dffSchool1: school1, dffName2: name2, dffSchool2: school2,
      resultType: 'Double Forfeit', resultDetail: null,
      isDoubleForfeit: true, isForfeitWin: false,
    }
  }

  // Regular bout: "Winner (School) won by fall over Loser (School) Fall 0:27"
  //           or: "Winner (School) won in tie breaker - 1 over Loser (School) TB-1 5-4"
  const wonIdx = body.search(/\bwon\s+(?:by|in)\b/i)
  if (wonIdx === -1) return null

  const winnerPart = body.slice(0, wonIdx).trim()
  const afterWon   = body.slice(wonIdx).trim()

  const overIdx = afterWon.indexOf(' over ')
  if (overIdx === -1) return null

  // Extract the "won by/in X" phrase to identify result type
  const wonPhrase = afterWon.slice(0, overIdx).replace(/^won\s+(?:by|in)\s+/i, '').trim().toLowerCase()
  // Handle "tie breaker - 1" → SV-1
  let resultTypeFromPhrase: string
  if (/tie.?breaker.*1/i.test(wonPhrase)) {
    resultTypeFromPhrase = 'SV-1'
  } else {
    resultTypeFromPhrase = EB_TYPE_MAP[wonPhrase] ?? wonPhrase
  }

  const afterOver = afterWon.slice(overIdx + 6).trim()
  // "Loser Name (School) Fall 0:27" — the result trails the loser's school. Some
  // pastes wrap it in parentheses instead ("… (Riverside) (Fall 0:27)"), so peel
  // that group off first; otherwise the last ")" is the school's and the result
  // string would be read as the loser's school name.
  const lastClose = afterOver.lastIndexOf(')')
  if (lastClose === -1) return null

  let loserPart = afterOver.slice(0, lastClose + 1).trim()
  let trailStr  = afterOver.slice(lastClose + 1).trim()

  if (!trailStr && lastClose === afterOver.length - 1) {
    const paren = matchingOpenParen(afterOver, lastClose)
    if (paren > 0) {
      const inner = afterOver.slice(paren + 1, lastClose).trim()
      if (RESULT_TOKEN_RE.test(inner)) {
        loserPart = afterOver.slice(0, paren).trim()
        trailStr  = inner
      }
    }
  }

  const { name: winnerName, school: winnerSchool } = splitNameSchool(winnerPart)
  const { name: loserName,  school: loserSchool  } = splitNameSchool(loserPart)

  if (!winnerName || !winnerSchool || !loserName || !loserSchool) return null
  if (/unattached/i.test(winnerSchool) || /unattached/i.test(loserSchool)) return null

  // Use the trailing type token if available (more structured), else use phrase
  const { resultType: trailType, resultDetail } = trailStr
    ? parseResultTrailF2(trailStr)
    : { resultType: resultTypeFromPhrase, resultDetail: null }

  const resultType = trailStr ? trailType : resultTypeFromPhrase

  return {
    weight, winnerName, winnerSchool, loserName, loserSchool,
    resultType, resultDetail,
    isDoubleForfeit: false, isForfeitWin: false,
  }
}

const BULLET_RE = /[•\-\*]\s+/

function parseFormatTwo(rawText: string, date: string): ParsedMeetGirls[] {
  const lines   = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const bouts: RawBout[] = []
  let currentWeight: number | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // Section header: "Jamboree 100a", "Jamboree 114-114 B"
    if (/^Jamboree\s+\d/i.test(line)) {
      currentWeight = extractWeightF2(line)
      continue
    }

    // Bullet line
    if (!BULLET_RE.test(line)) continue
    if (currentWeight === null) continue

    // Strip bullet and "Round N - " / "1st Place Match - " / "Finals - " prefix
    const stripped = line
      .replace(/^[•\-\*]\s+/, '')
      .replace(/^(?:Round\s+\d+|1st\s+Place\s+Match|2nd\s+Place\s+Match|3rd\s+Place\s+Match|Finals?)\s*-\s*/i, '')
      .trim()

    const b = parseBulletBodyF2(stripped, currentWeight)
    if (b) bouts.push(b)
  }

  return buildMeets(bouts, date)
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT 3 — TW table copy-paste (Del Val / tri-meet style)
// Weight is on its own line; bout on the next non-noise line.
// ─────────────────────────────────────────────────────────────────────────────

const WEIGHT_STANDALONE_RE   = new RegExp(`^(${WEIGHT_ALT})$`)   // used against individual lines (no m flag needed)
const WEIGHT_STANDALONE_RE_M = new RegExp(`^(${WEIGHT_ALT})$`, 'm') // used against full text

// Lines that are pure noise from TW table copy-paste. The wildcard alternatives
// ("…high school…", "…jamboree…") match anywhere in the line, so this is only
// ever tested against lines that are NOT bout lines — a school named "Randolph
// High School" or an event named "… Jamboree" would otherwise take its bouts
// down with it.
const NOISE_RE = /^(?:no|yes|weight|summary|stats|tw event|click here|team:|teams|divisions|weights|wrestlers|matches|dashboard|del val kickoff|round results|.*kickoff.*|.*jamboree.*|\d{1,2}\/\d{1,2}\/\d{4}|.*high school.*|.*\d{5}.*)\s*$/i

// A line carrying a result is a bout row, never noise.
function looksLikeBoutLine(line: string): boolean {
  return line.includes(' over ') || /\bdouble\s*forfeit\b/i.test(line)
}

function parseBoutBodyF3(line: string, weight: number): RawBout | null {
  // Strip "Varsity - " / "JV - " prefix
  const body = line.replace(/^(?:varsity|jv|junior varsity)\s*-\s*/i, '').trim()
  if (!body.includes(' over ')) return null

  const overIdx = body.indexOf(' over ')
  const winnerPart = body.slice(0, overIdx).trim()
  const afterOver  = body.slice(overIdx + 6).trim()

  const { name: winnerName, school: winnerSchool } = splitNameSchool(winnerPart)
  if (!winnerName || !winnerSchool) return null

  const lastClose = afterOver.lastIndexOf(')')
  if (lastClose === -1) return null
  const bStart = matchingOpenParen(afterOver, lastClose)
  if (bStart === -1) return null

  const resultStr = afterOver.slice(bStart + 1, lastClose)
  const loserPart = afterOver.slice(0, bStart).trim()
  const { resultType, resultDetail } = parseResultF1(resultStr)

  if (resultType === 'For' || /^unknown\s*\(for\.\)$/i.test(loserPart)) {
    return { weight, winnerName, winnerSchool, loserName: null, loserSchool: null,
             resultType: 'For', resultDetail: null, isDoubleForfeit: false, isForfeitWin: true }
  }

  const { name: loserName, school: loserSchool } = splitNameSchool(loserPart)
  if (!loserName || !loserSchool) return null

  return { weight, winnerName, winnerSchool, loserName, loserSchool,
           resultType, resultDetail, isDoubleForfeit: false, isForfeitWin: false }
}

function parseFormatThree(rawText: string, date: string): ParsedMeetGirls[] {
  const lines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const bouts: RawBout[] = []
  let currentWeight: number | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) { currentWeight = null; continue }

    // Standalone weight line
    const wm = line.match(WEIGHT_STANDALONE_RE)
    if (wm) {
      currentWeight = parseInt(wm[1])
      continue
    }

    const isBoutLine = looksLikeBoutLine(line)

    // Skip noise — but never a line that carries a result
    if (!isBoutLine && NOISE_RE.test(line)) continue

    // A weight header covers every bout row under it, so rows that are not bouts
    // (a bare "Double Forfeit", a stray label) are skipped without clearing the
    // weight — clearing it dropped the rest of the section.
    if (!isBoutLine) continue

    // Some pastes mix in weight-prefixed rows ("100 Varsity - A (X) over B (Y) …").
    // Those carry their own weight and must not inherit the section's.
    const prefixed = parseBoutLineF1(line)
    if (prefixed) {
      bouts.push(prefixed)
      continue
    }
    if (WEIGHT_RE_F1.test(line)) continue   // weight-prefixed but unparseable — don't mis-weight it

    if (currentWeight === null) continue

    const b = parseBoutBodyF3(line, currentWeight)
    if (b) bouts.push(b)
    // don't reset currentWeight — same weight can have multiple bouts in the same section
  }

  return buildMeets(collapseDuplicateBouts(bouts), date)
}

// ─────────────────────────────────────────────────────────────────────────────
// Format detection + public API
// ─────────────────────────────────────────────────────────────────────────────

function isFormatTwo(rawText: string): boolean {
  return /^Jamboree\s+\d/im.test(rawText) && /[•]\s+(?:Round\s+\d|Finals?|1st\s+Place)/m.test(rawText)
}

function isFormatThree(rawText: string): boolean {
  // Has standalone weight lines (not prefixed) + bout lines — but NOT Format 2's bullet structure
  return WEIGHT_STANDALONE_RE_M.test(rawText) && rawText.includes(' over ') && !isFormatTwo(rawText)
}

export function parseJamboreeGirlsText(rawText: string, date: string): ParsedMeetGirls[] {
  if (isFormatTwo(rawText))   return parseFormatTwo(rawText, date)
  if (isFormatThree(rawText)) return parseFormatThree(rawText, date)
  return parseFormatOne(rawText, date)
}
