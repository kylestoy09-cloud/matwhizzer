// ─────────────────────────────────────────────────────────────────────────────
// parseDualMeetGirls.ts
// Parses raw TrackWrestling dual-meet text (copy-paste) into structured data
// for GIRLS wrestling meets.
//
// Girls weight classes: 100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235
//
// Two format variants are supported:
//   Format A — proper tab/multi-space separated lines with newlines
//   Format B — whitespace-collapsed jammed string (no tabs, possibly no \n)
//
// Usage:
//   import { parseDualMeetGirlsText } from '@/lib/parseDualMeetGirls'
//   const meets = parseDualMeetGirlsText(rawPastedText)
// ─────────────────────────────────────────────────────────────────────────────

export type ParsedMatchGirls = {
  weightClass: number
  winnerName: string | null
  winnerSchoolRaw: string | null
  loserName: string | null
  loserSchoolRaw: string | null
  resultType: string            // 'Fall' | 'Dec' | 'MD' | 'TF' | 'SV-1' | 'UTB' | 'MFFL' | 'For' | 'Double Forfeit'
  resultDetail: string | null   // score like '9-7', time like '1:34', or null
  team1Points: number
  team2Points: number
  isDoubleForfeit: boolean
  isForfeitWin: boolean
  // the weight TrackWrestling printed, when it isn't one of ours (weightClass is then the NJ weight)
  listedWeight?: number
}

// A team point adjustment listed after the bouts (usually a deduction; sometimes points awarded) ("Coach Misconduct  0  -1.0"):
// one side's points are negative.
export type ParsedDeductionGirls = {
  label: string
  team1Points: number
  team2Points: number
}

export type ParsedMeetGirls = {
  rawText: string
  date: string          // 'MM/DD/YYYY'
  team1Name: string
  team2Name: string
  team1Score: number
  team2Score: number
  matches: ParsedMatchGirls[]
  deductions: ParsedDeductionGirls[]
  isDuplicate?: true
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WEIGHT_LIST = [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235] as const
const WEIGHT_ALT = WEIGHT_LIST.join('|')
// Some duals are listed at other weights (Lodi/Saddle Brook's 145, 152, 160, 170, 182, 195, 220;
// Pennsylvania's 107, 114, 121...). Line-based formats accept any weight line; the meet's weights
// are then mapped to ours (mapToNjWeights). Before 2026-11-06 such bouts were dropped.
const ANY_WEIGHT = '\\d{3}'
const isAnyWeight = (w: number) => w >= 90 && w <= 300

// The dual's listed weights, in order, are matched to ours in order: a weight that is one of ours
// stays, and each other weight becomes an NJ weight between its neighbours, as close to the listed
// number as possible (Lodi/Saddle Brook's 145 → 144, 160 → 157, 170 → 165, 220 → 215; PA's 107 → 106,
// 172 → 175). Kyle, 2026-11-06: map to the NJ weight.
function mapToNjWeights<T extends { weightClass: number; listedWeight?: number }>(matches: T[]): T[] {
  const std = WEIGHT_LIST as unknown as number[]
  const listed = [...new Set(matches.map(m => m.weightClass))].sort((a, b) => a - b)
  if (listed.every(w => std.includes(w))) return matches
  // cost[i][j]: best total distance placing listed[0..i] with listed[i] on std[j]
  const n = listed.length, k = std.length, INF = 1e9
  const cost = listed.map(() => std.map(() => INF)), from = listed.map(() => std.map(() => -1))
  const fit = (i: number, j: number) => (std.includes(listed[i]) ? (std[j] === listed[i] ? 0 : INF) : Math.abs(std[j] - listed[i]))
  for (let j = 0; j < k; j++) cost[0][j] = fit(0, j)
  for (let i = 1; i < n; i++) for (let j = i; j < k; j++) {
    const f = fit(i, j); if (f >= INF) continue
    for (let q = 0; q < j; q++) if (cost[i - 1][q] + f < cost[i][j]) { cost[i][j] = cost[i - 1][q] + f; from[i][j] = q }
  }
  let j = -1, best = INF
  for (let q = 0; q < k; q++) if (cost[n - 1][q] < best) { best = cost[n - 1][q]; j = q }
  if (j < 0) return matches.filter(m => std.includes(m.weightClass))   // more weights than ours
  const map = new Map<number, number>()
  for (let i = n - 1; i >= 0; i--) { map.set(listed[i], std[j]); j = from[i][j] }
  for (const m of matches) { const to = map.get(m.weightClass)!; if (to !== m.weightClass) { m.listedWeight = m.weightClass; m.weightClass = to } }
  return matches
}

// ── Header / score helpers ─────────────────────────────────────────────────────

function splitIntoChunks(raw: string): string[] {
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const headerRe = /(.+?)\s+vs\.\s+(.+?)\s+\(\d{2}\/\d{2}\/\d{4}\)/g
  const positions: number[] = []
  let m: RegExpExecArray | null
  while ((m = headerRe.exec(text)) !== null) {
    const lineStart = text.lastIndexOf('\n', m.index)
    positions.push(lineStart < 0 ? 0 : lineStart + 1)
  }
  if (positions.length === 0) return [text]
  const unique = [...new Set(positions)].sort((a, b) => a - b)
  return unique.map((pos, i) => {
    const end = i + 1 < unique.length ? unique[i + 1] : text.length
    return text.slice(pos, end).trim()
  })
}

function parseHeader(chunk: string): { team1: string; team2: string; date: string } | null {
  const m = chunk.match(/^(.+?)\s+vs\.\s+(.+?)\s+\((\d{2}\/\d{2}\/\d{4})\)/)
  if (!m) return null
  return { team1: m[1].trim(), team2: m[2].trim(), date: m[3] }
}

function parseTeamScore(chunk: string): { t1: number; t2: number } | null {
  const m = chunk.match(/Team\s+Score:\s+(\d+)\s+(\d+)/i)
  if (!m) return null
  return { t1: parseInt(m[1]), t2: parseInt(m[2]) }
}

// ── Result string parser ───────────────────────────────────────────────────────

function parseResult(s: string): { resultType: string; resultDetail: string | null } {
  s = s.trim()
  if (/^fall/i.test(s))    return { resultType: 'Fall',          resultDetail: s.replace(/^fall\s*/i, '').trim() || null }
  if (/^md/i.test(s))      return { resultType: 'MD',            resultDetail: s.replace(/^md\s*/i, '').trim() || null }
  if (/^tf/i.test(s))      return { resultType: 'TF',            resultDetail: s.replace(/^tf\s*/i, '').trim() || null }
  if (/^sv-1/i.test(s))    return { resultType: 'SV-1',          resultDetail: s.replace(/^sv-1\s*/i, '').trim() || null }
  if (/^utb/i.test(s))     return { resultType: 'UTB',           resultDetail: s.replace(/^utb\s*/i, '').trim() || null }
  if (/^mffl/i.test(s))    return { resultType: 'MFFL',          resultDetail: null }
  if (/^dec/i.test(s))     return { resultType: 'Dec',           resultDetail: s.replace(/^dec\s*/i, '').trim() || null }
  if (/^for/i.test(s))     return { resultType: 'For',           resultDetail: null }
  if (/^double\s*forfeit/i.test(s)) return { resultType: 'Double Forfeit', resultDetail: null }
  return { resultType: s, resultDetail: null }
}

// ── Name normalizer ────────────────────────────────────────────────────────────

const NAME_PREFIX_RE = /^(?:varsity|jv|junior varsity|freshman)\s*-?\s*/i

function normalizeName(name: string): string {
  return name.replace(NAME_PREFIX_RE, '').trim()
}

// ── Name + school extractor ────────────────────────────────────────────────────

function splitNameSchool(s: string): { name: string; school: string | null } {
  const lastClose = s.lastIndexOf(')')
  if (lastClose === -1) return { name: s.trim(), school: null }
  let depth = 0
  let openIdx = -1
  for (let i = lastClose; i >= 0; i--) {
    if (s[i] === ')') depth++
    else if (s[i] === '(') { depth--; if (depth === 0) { openIdx = i; break } }
  }
  if (openIdx <= 0) return { name: s.trim(), school: null }
  const name   = s.slice(0, openIdx).trim()
  const school = s.slice(openIdx + 1, lastClose).trim()
  if (!name) return { name: s.trim(), school: null }
  return { name, school: school || null }
}

// ── Match summary parser ───────────────────────────────────────────────────────

function parseMatchSummary(summary: string, t1Pts: number, t2Pts: number, weight: number): ParsedMatchGirls | null {
  const s = summary.replace(/ /g, ' ').trim()

  if (/^extra\b/i.test(s)) return null

  if (/^double\s+forfeit/i.test(s)) {
    return {
      weightClass: weight,
      winnerName: null, winnerSchoolRaw: null,
      loserName: null,  loserSchoolRaw: null,
      resultType: 'Double Forfeit', resultDetail: null,
      team1Points: t1Pts, team2Points: t2Pts,
      isDoubleForfeit: true, isForfeitWin: false,
    }
  }

  const overIdx = s.indexOf(' over ')
  if (overIdx === -1) {
    if (/double\s+forfeit/i.test(s)) {
      return {
        weightClass: weight,
        winnerName: null, winnerSchoolRaw: null,
        loserName: null,  loserSchoolRaw: null,
        resultType: 'Double Forfeit', resultDetail: null,
        team1Points: t1Pts, team2Points: t2Pts,
        isDoubleForfeit: true, isForfeitWin: false,
      }
    }
    return {
      weightClass: weight,
      winnerName: null, winnerSchoolRaw: null,
      loserName: null, loserSchoolRaw: null,
      resultType: 'Unknown', resultDetail: s,
      team1Points: t1Pts, team2Points: t2Pts,
      isDoubleForfeit: false, isForfeitWin: false,
    }
  }

  const winnerPart = s.slice(0, overIdx).trim()
  const afterOver  = s.slice(overIdx + 6).trim()

  const { name: _wName, school: winnerSchoolRaw } = splitNameSchool(winnerPart)
  const winnerName = normalizeName(_wName)

  if (/^\[winner\]$/i.test(winnerName)) {
    return {
      weightClass: weight,
      winnerName: null, winnerSchoolRaw: null,
      loserName: null,  loserSchoolRaw: null,
      resultType: 'Double Forfeit', resultDetail: null,
      team1Points: t1Pts, team2Points: t2Pts,
      isDoubleForfeit: true, isForfeitWin: false,
    }
  }

  if (/^unknown\s+\(for\.\)$/i.test(afterOver)) {
    return {
      weightClass: weight,
      winnerName, winnerSchoolRaw,
      loserName: null, loserSchoolRaw: null,
      resultType: 'For', resultDetail: null,
      team1Points: t1Pts, team2Points: t2Pts,
      isDoubleForfeit: false, isForfeitWin: true,
    }
  }

  const SPLIT_RESULT_RE = /^(sv-?1|utb|mffl)/i
  const twoGroupM = afterOver.match(/^(.+?)\s+\(([^)]+)\)\s+\(([^)]+)\)\s*$/)

  let resultStr: string
  let loserAndSchool: string

  if (twoGroupM && SPLIT_RESULT_RE.test(twoGroupM[2])) {
    loserAndSchool = twoGroupM[1].trim()
    resultStr      = `${twoGroupM[2]} ${twoGroupM[3]}`
  } else {
    const lastClose = afterOver.lastIndexOf(')')
    let bStart = -1
    if (lastClose >= 0) {
      let depth = 0
      for (let i = lastClose; i >= 0; i--) {
        if (afterOver[i] === ')') depth++
        else if (afterOver[i] === '(') { depth--; if (depth === 0) { bStart = i; break } }
      }
    }

    if (bStart === -1 || lastClose === -1) {
      return {
        weightClass: weight,
        winnerName, winnerSchoolRaw,
        loserName: afterOver || null, loserSchoolRaw: null,
        resultType: 'Unknown', resultDetail: null,
        team1Points: t1Pts, team2Points: t2Pts,
        isDoubleForfeit: false, isForfeitWin: false,
      }
    }

    resultStr      = afterOver.slice(bStart + 1, lastClose)
    loserAndSchool = afterOver.slice(0, bStart).trim()
  }

  const { resultType, resultDetail } = parseResult(resultStr)
  const { name: _lName, school: loserSchoolRaw } = splitNameSchool(loserAndSchool)
  const loserNameRaw = loserAndSchool ? normalizeName(_lName) : null

  // ...as is a blank name ("over (Camden/Camden Eastside)"): a bout against an unnamed opponent,
  // kept with no wrestler on that side instead of being dropped for an unmatched wrestler
  const loserIsUnknown = /^unknown$/i.test((loserNameRaw ?? '').trim()) || (!!loserAndSchool && !(loserNameRaw ?? '').trim())
  const isForfeitWin   = resultType === 'For'
  const isDoubleForfeit = resultType === 'Double Forfeit'

  return {
    weightClass: weight,
    winnerName:      isDoubleForfeit ? null : winnerName,
    winnerSchoolRaw: isDoubleForfeit ? null : winnerSchoolRaw,
    loserName:       (isForfeitWin || isDoubleForfeit || !(loserNameRaw ?? '').trim()) ? null : loserNameRaw,
    loserSchoolRaw:  (isForfeitWin || loserIsUnknown || isDoubleForfeit) ? null : loserSchoolRaw,
    resultType, resultDetail,
    team1Points: t1Pts, team2Points: t2Pts,
    isDoubleForfeit, isForfeitWin,
  }
}

// ── Format detection ───────────────────────────────────────────────────────────

function isFormatA(chunk: string): boolean {
  const lineStartRe = new RegExp(`^[^\\S\\n]*(${WEIGHT_ALT})[^\\S\\n]+\\S`, 'm')
  return lineStartRe.test(chunk)
}

function isFormatC(chunk: string): boolean {
  const re = new RegExp(`^(${WEIGHT_ALT})$`, 'm')
  return re.test(chunk)
}

// ── Format A parser ────────────────────────────────────────────────────────────

function parseMatchLine(line: string): { weight: number; summary: string; t1: number; t2: number } | null {
  const t = line.trim()
  const weightM = t.match(new RegExp(`^(${ANY_WEIGHT})\\s+`))
  if (!weightM || !isAnyWeight(parseInt(weightM[1]))) return null

  const weight = parseInt(weightM[1])
  const rest   = t.slice(weightM[0].length)

  const trailM = rest.match(/\s+(\d+)\s+(\d+)\s*$/)
  if (!trailM) return null

  return {
    weight,
    summary: rest.slice(0, trailM.index!).trim(),
    t1: parseInt(trailM[1]),
    t2: parseInt(trailM[2]),
  }
}

function parseFormatA(chunk: string): ParsedMatchGirls[] {
  return chunk.split('\n')
    .map(parseMatchLine)
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .map(({ weight, summary, t1, t2 }) => parseMatchSummary(summary, t1, t2, weight))
    .filter((x): x is ParsedMatchGirls => x !== null)
}

// ── Format B parser ────────────────────────────────────────────────────────────

function parseFormatB(chunk: string): ParsedMatchGirls[] {
  const bulletIdx = chunk.indexOf('•')
  const bodyRaw   = bulletIdx >= 0 ? chunk.slice(bulletIdx + 1) : chunk

  const scoreIdx = bodyRaw.search(/Team\s+Score:/i)
  const body     = scoreIdx > 0 ? bodyRaw.slice(0, scoreIdx) : bodyRaw

  const entryRe = new RegExp(
    `(${WEIGHT_ALT})` +
    `((?:Double\\s*Forfeit|.+?\\([^)]+\\)))` +
    `\\s*([0-6])\\s*([0-6])`,
    'gs',
  )

  const matches: ParsedMatchGirls[] = []
  let m: RegExpExecArray | null
  while ((m = entryRe.exec(body)) !== null) {
    const weight  = parseInt(m[1])
    const summary = m[2].trim()
    const t1      = parseInt(m[3])
    const t2      = parseInt(m[4])
    const pm = parseMatchSummary(summary, t1, t2, weight)
    if (pm) matches.push(pm)
  }
  return matches
}

// ── Format C parser ────────────────────────────────────────────────────────────

function parseFormatC(chunk: string): ParsedMatchGirls[] {
  const lines    = chunk.split('\n').map(l => l.trim())
  const weightSet = new Set<number>(WEIGHT_LIST as unknown as number[])
  const matches: ParsedMatchGirls[] = []

  let i = 0
  while (i < lines.length) {
    if (!lines[i]) { i++; continue }

    const weight = parseInt(lines[i])
    // a weight class line: one of ours, or another weight followed by a bout summary
    if (!weightSet.has(weight) && !(isAnyWeight(weight) && /^\d{3}$/.test(lines[i]) && /\sover\s|Double\s*Forfeit/i.test(lines[i + 1] ?? ''))) { i++; continue }

    const summary = lines[i + 1] ?? ''
    const t1      = parseInt(lines[i + 2] ?? '')
    const t2      = parseInt(lines[i + 3] ?? '')

    if (!summary || isNaN(t1) || isNaN(t2)) { i++; continue }

    const pm = parseMatchSummary(summary, t1, t2, weight)
    if (pm) matches.push(pm)
    i += 4
  }

  return matches
}

// ── Team point deductions ──────────────────────────────────────────────────────
// Listed after the bouts, before "Team Score:": a label and the two sides' points,
// one of them negative (bout points never are). Cells come one per line (Format C),
// tab / multi-space separated (Format A), or jammed together (Format B).

const NUM = /^-?\d+(?:\.\d+)?$/

function parseDeductions(chunk: string): ParsedDeductionGirls[] {
  const scoreIdx = chunk.search(/Team\s+Score:/i)
  const body = scoreIdx > 0 ? chunk.slice(0, scoreIdx) : chunk
  const out: ParsedDeductionGirls[] = []
  if (body.includes('\n')) {
    const cells = body.split('\n').flatMap(l => l.split(/\t|\s{2,}/)).map(c => c.trim()).filter(Boolean)
    for (let i = 0; i + 2 < cells.length; i++) {
      const [label, a, b] = [cells[i], cells[i + 1], cells[i + 2]]
      if (/\sover\s/i.test(label) || !NUM.test(a) || !NUM.test(b)) continue
      const t1 = parseFloat(a), t2 = parseFloat(b)
      // an adjustment is written with a decimal ("-1.0", "18.0"; bout points never are) or is
      // negative; it can add points ("Steinert Wrestler Throwing Headgear  1.0  0", "kids not present
      // on track  0  18.0") and its label can be just a weight ("157  0  -1.0")
      const decimal = a.includes('.') || b.includes('.')
      if ((t1 >= 0 && t2 >= 0 && !decimal) || (t1 === 0 && t2 === 0)) continue
      // label: words, or (with a decimal amount) a weight ("157") or punctuation only (".")
      if (!/[A-Za-z]/.test(label) && !(decimal && (/^\d{3}$/.test(label) || !/\d/.test(label)))) continue
      out.push({ label, team1Points: t1, team2Points: t2 })
      i += 2
    }
    return out
  }
  // jammed text: deductions are the last entries before "Team Score:"
  const re = /([A-Za-z][A-Za-z ()@`'\/:.-]*?)\s*(0|-?\d+\.\d+)\s*(0|-?\d+\.\d+)$/
  let rest = body.trimEnd(), m: RegExpMatchArray | null
  while ((m = rest.match(re)) && (m[2].startsWith('-') || m[3].startsWith('-'))) {
    out.unshift({ label: m[1].trim(), team1Points: parseFloat(m[2]), team2Points: parseFloat(m[3]) })
    rest = rest.slice(0, m.index).trimEnd()
  }
  return out
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function parseDualMeetGirlsText(raw: string): ParsedMeetGirls[] {
  const chunks = splitIntoChunks(raw)
  const seen   = new Map<string, true>()
  const results: ParsedMeetGirls[] = []

  for (const chunk of chunks) {
    if (!chunk.trim()) continue

    const header = parseHeader(chunk)
    if (!header) continue

    const score   = parseTeamScore(chunk)
    const matches = mapToNjWeights(isFormatA(chunk) ? parseFormatA(chunk)
                  : isFormatC(chunk) ? parseFormatC(chunk)
                  : parseFormatB(chunk))

    const key         = `${header.team1}|${header.team2}|${header.date}`
    const isDuplicate = seen.has(key)
    seen.set(key, true)

    for (const match of matches) {
      if (match.isDoubleForfeit || match.isForfeitWin) continue
      if (!match.loserSchoolRaw && match.loserName && match.winnerSchoolRaw) {
        match.loserSchoolRaw =
          match.winnerSchoolRaw === header.team1 ? header.team2 :
          match.winnerSchoolRaw === header.team2 ? header.team1 : null
      }
      if (!match.winnerSchoolRaw && match.winnerName && match.loserSchoolRaw) {
        match.winnerSchoolRaw =
          match.loserSchoolRaw === header.team1 ? header.team2 :
          match.loserSchoolRaw === header.team2 ? header.team1 : null
      }
    }

    const meet: ParsedMeetGirls = {
      rawText:    chunk,
      date:       header.date,
      team1Name:  header.team1,
      team2Name:  header.team2,
      team1Score: score?.t1 ?? 0,
      team2Score: score?.t2 ?? 0,
      matches,
      deductions: parseDeductions(chunk),
    }
    if (isDuplicate) meet.isDuplicate = true

    results.push(meet)
  }

  return results
}
