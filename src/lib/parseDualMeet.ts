// ─────────────────────────────────────────────────────────────────────────────
// parseDualMeet.ts
// Parses raw TrackWrestling dual-meet text (copy-paste) into structured data.
//
// Two format variants are supported:
//   Format A — proper tab/multi-space separated lines with newlines
//   Format B — whitespace-collapsed jammed string (no tabs, possibly no \n)
//
// Usage:
//   import { parseDualMeetText } from '@/lib/parseDualMeet'
//   const meets = parseDualMeetText(rawPastedText)
// ─────────────────────────────────────────────────────────────────────────────

export type ParsedMatch = {
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

export type ParsedMeet = {
  rawText: string
  date: string          // 'MM/DD/YYYY'
  team1Name: string
  team2Name: string
  team1Score: number
  team2Score: number
  matches: ParsedMatch[]
  isDuplicate?: true
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WEIGHT_LIST = [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285] as const
const WEIGHT_ALT = WEIGHT_LIST.join('|')

// ── Header / score helpers ─────────────────────────────────────────────────────

function splitIntoChunks(raw: string): string[] {
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  // Find every "Team A vs. Team B (MM/DD/YYYY)" header and record the start of
  // its line. That line-start becomes the beginning of a new meet chunk.
  const headerRe = /(.+?)\s+vs\.\s+(.+?)\s+\(\d{2}\/\d{2}\/\d{4}\)/g
  const positions: number[] = []
  let m: RegExpExecArray | null
  while ((m = headerRe.exec(text)) !== null) {
    const lineStart = text.lastIndexOf('\n', m.index)
    positions.push(lineStart < 0 ? 0 : lineStart + 1)
  }
  if (positions.length === 0) return [text]
  // Deduplicate and sort (guard against edge cases)
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

// ── Match summary parser ───────────────────────────────────────────────────────
// summary: everything between the weight class and the trailing team points.
// e.g. "Joe Smith (Garfield) over John Doe (Clifton) (Dec 9-7)"
//      "Jane Roe (Garfield) over Unknown (For.)"
//      "Double Forfeit"

function parseMatchSummary(summary: string, t1Pts: number, t2Pts: number, weight: number): ParsedMatch {
  const s = summary.trim()

  // Double forfeit
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
    // Unparseable — store raw text as winnerName for debugging
    return {
      weightClass: weight,
      winnerName: s, winnerSchoolRaw: null,
      loserName: null, loserSchoolRaw: null,
      resultType: 'Unknown', resultDetail: null,
      team1Points: t1Pts, team2Points: t2Pts,
      isDoubleForfeit: false, isForfeitWin: false,
    }
  }

  const winnerPart = s.slice(0, overIdx).trim()
  const afterOver  = s.slice(overIdx + 6).trim()

  // Parse winner "First Last (School)"
  const winnerM = winnerPart.match(/^(.+?)\s+\(([^)]+)\)$/)
  const winnerName      = winnerM ? winnerM[1].trim() : winnerPart
  const winnerSchoolRaw = winnerM ? winnerM[2].trim() : null

  // Forfeit win: afterOver is exactly "Unknown (For.)"
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

  // Normal match: "Loser Name (School) (Result)"
  // The result is always the last (...) group.
  const lastOpen  = afterOver.lastIndexOf('(')
  const lastClose = afterOver.lastIndexOf(')')

  if (lastOpen === -1 || lastClose === -1 || lastClose < lastOpen) {
    return {
      weightClass: weight,
      winnerName, winnerSchoolRaw,
      loserName: afterOver || null, loserSchoolRaw: null,
      resultType: 'Unknown', resultDetail: null,
      team1Points: t1Pts, team2Points: t2Pts,
      isDoubleForfeit: false, isForfeitWin: false,
    }
  }

  const resultStr = afterOver.slice(lastOpen + 1, lastClose)
  const { resultType, resultDetail } = parseResult(resultStr)

  // Everything before the result group is "Loser Name (School)"
  const loserAndSchool = afterOver.slice(0, lastOpen).trim()
  const loserM = loserAndSchool.match(/^(.+?)\s+\(([^)]+)\)$/)
  const loserName      = loserM ? loserM[1].trim() : (loserAndSchool || null)
  const loserSchoolRaw = loserM ? loserM[2].trim() : null

  return {
    weightClass: weight,
    winnerName, winnerSchoolRaw,
    loserName, loserSchoolRaw,
    resultType, resultDetail,
    team1Points: t1Pts, team2Points: t2Pts,
    isDoubleForfeit: false, isForfeitWin: false,
  }
}

// ── Format detection ───────────────────────────────────────────────────────────

function isFormatA(chunk: string): boolean {
  // Format A has at least one line that starts (after whitespace) with a
  // weight-class number followed by more content on the same line.
  const lineStartRe = new RegExp(`^\\s*(${WEIGHT_ALT})\\s+\\S`, 'm')
  return lineStartRe.test(chunk)
}

function isFormatC(chunk: string): boolean {
  // Format C has weight classes alone on their own lines (one field per line).
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

  // Trailing: two space-separated integers at end of line
  const trailM = rest.match(/\s+(\d+)\s+(\d+)\s*$/)
  if (!trailM) return null

  return {
    weight,
    summary: rest.slice(0, trailM.index!).trim(),
    t1: parseInt(trailM[1]),
    t2: parseInt(trailM[2]),
  }
}

function parseFormatA(chunk: string): ParsedMatch[] {
  return chunk.split('\n')
    .map(parseMatchLine)
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .map(({ weight, summary, t1, t2 }) => parseMatchSummary(summary, t1, t2, weight))
}

// ── Format B parser ────────────────────────────────────────────────────────────
// Works on jammed/continuous text.
//
// Key insight: per-match team points are always a single digit 0–6.
// That lets us use ([0-6])([0-6]) to cap each entry, which naturally
// separates "...Fall 2:14) 6 0113Double..." into:
//   • entry 106 → team pts 6, 0  → next entry starts at 113
// Even when team2_pts and the next weight class have no space between them,
// the single-digit captures consume only one digit each, leaving the
// 3-digit weight class for the next iteration.

function parseFormatB(chunk: string): ParsedMatch[] {
  // Scan after the "•" separator to skip nav-bar text.
  const bulletIdx = chunk.indexOf('•')
  const bodyRaw   = bulletIdx >= 0 ? chunk.slice(bulletIdx + 1) : chunk

  // Stop before "Team Score:" (colon required to avoid "Team Scores" in nav).
  const scoreIdx = bodyRaw.search(/Team\s+Score:/i)
  const body     = scoreIdx > 0 ? bodyRaw.slice(0, scoreIdx) : bodyRaw

  // One regex matches a complete match entry:
  //   (weight_class)
  //   (summary: "Double Forfeit"  OR  anything ending with "(result)")
  //   (team1_pts: single digit 0-6)
  //   (team2_pts: single digit 0-6)
  //
  // The lazy .+? in the summary group backtracks until the two trailing
  // single-digit captures succeed — which only happens at the real result paren.
  const entryRe = new RegExp(
    `(${WEIGHT_ALT})` +
    `((?:Double\\s*Forfeit|.+?\\([^)]+\\)))` +
    `\\s*([0-6])\\s*([0-6])`,
    'gs',   // s = dotAll so . matches newlines in multi-line jammed text
  )

  const matches: ParsedMatch[] = []
  let m: RegExpExecArray | null
  while ((m = entryRe.exec(body)) !== null) {
    const weight  = parseInt(m[1])
    const summary = m[2].trim()
    const t1      = parseInt(m[3])
    const t2      = parseInt(m[4])
    matches.push(parseMatchSummary(summary, t1, t2, weight))
  }
  return matches
}

// ── Format C parser ────────────────────────────────────────────────────────────
// One field per line, blank lines between match blocks:
//   Line 1: weight class alone  ("106")
//   Line 2: summary text        ("Name (School) over Name (School) (Result)")
//   Line 3: team1 points
//   Line 4: team2 points
//   (one or more blank lines, then next block)
//
// This is what browsers produce when copy-pasting from TrackWrestling tables —
// each cell lands on its own line instead of being tab-separated.

function parseFormatC(chunk: string): ParsedMatch[] {
  const lines    = chunk.split('\n').map(l => l.trim())
  const weightSet = new Set<number>(WEIGHT_LIST as unknown as number[])
  const matches: ParsedMatch[] = []

  let i = 0
  while (i < lines.length) {
    if (!lines[i]) { i++; continue }   // skip blank lines between blocks

    const weight = parseInt(lines[i])
    if (!weightSet.has(weight)) { i++; continue }  // not a weight class line

    const summary = lines[i + 1] ?? ''
    const t1      = parseInt(lines[i + 2] ?? '')
    const t2      = parseInt(lines[i + 3] ?? '')

    if (!summary || isNaN(t1) || isNaN(t2)) { i++; continue }

    matches.push(parseMatchSummary(summary, t1, t2, weight))
    i += 4
  }

  return matches
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function parseDualMeetText(raw: string): ParsedMeet[] {
  const chunks = splitIntoChunks(raw)
  const seen   = new Map<string, true>()
  const results: ParsedMeet[] = []

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

    const meet: ParsedMeet = {
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
