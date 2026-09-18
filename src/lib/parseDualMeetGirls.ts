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
}

export type ParsedMeetGirls = {
  rawText: string
  date: string          // 'MM/DD/YYYY'
  team1Name: string
  team2Name: string
  team1Score: number
  team2Score: number
  matches: ParsedMatchGirls[]
  isDuplicate?: true
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WEIGHT_LIST = [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235] as const
const WEIGHT_ALT = WEIGHT_LIST.join('|')

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

  const loserIsUnknown = /^unknown$/i.test((loserNameRaw ?? '').trim())
  const isForfeitWin   = resultType === 'For'
  const isDoubleForfeit = resultType === 'Double Forfeit'

  return {
    weightClass: weight,
    winnerName:      isDoubleForfeit ? null : winnerName,
    winnerSchoolRaw: isDoubleForfeit ? null : winnerSchoolRaw,
    loserName:       (isForfeitWin || isDoubleForfeit) ? null : loserNameRaw,
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
  const weightM = t.match(new RegExp(`^(${WEIGHT_ALT})\\s+`))
  if (!weightM) return null

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
    if (!weightSet.has(weight)) { i++; continue }

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
    const matches = isFormatA(chunk) ? parseFormatA(chunk)
                  : isFormatC(chunk) ? parseFormatC(chunk)
                  : parseFormatB(chunk)

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
    }
    if (isDuplicate) meet.isDuplicate = true

    results.push(meet)
  }

  return results
}
