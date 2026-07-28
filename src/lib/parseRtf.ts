/**
 * parseRtf.ts
 * TypeScript port of scripts/parse_tournament_rtf.py
 *
 * Handles two RTF formats:
 *   full_bracket    — Format A: by weight → round → bouts; all participants visible.
 *   school_tracking — Format B: by school → weight → bout + Yes/No flags; TW export.
 */

// ── Place/round constants ─────────────────────────────────────────────────────

const PLACE_ROUNDS: Record<string, [number, number]> = {
  '1st place match': [1, 2],
  '2nd place match': [1, 2],
  '3rd place match': [3, 4],
  '5th place match': [5, 6],
  '7th place match': [7, 8],
  'first place':     [1, 2],
  'third place':     [3, 4],
  'fifth place':     [5, 6],
  'seventh place':   [7, 8],
}

const PLACE_FROM_WIN: Record<string, number> = {
  '1st place match': 1, 'first place':   1,
  '3rd place match': 3, 'third place':   3,
  '5th place match': 5, 'fifth place':   5,
  '7th place match': 7, 'seventh place': 7,
}

const PLACE_FROM_LOSS: Record<string, number> = {
  '1st place match': 2, 'first place':   2,
  '3rd place match': 4, 'third place':   4,
  '5th place match': 6, 'fifth place':   6,
  '7th place match': 8, 'seventh place': 8,
}

const ROUND_PRIORITY: Record<string, number> = {
  'champ. round 1': 1, 'round 1': 1,
  'champ. round 2': 2, 'round 2': 2,
  'champ. round 3': 3,
  'cons. round 1': 4,  'cons. round 2': 5,  'cons. round 3': 6,
  'cons. round 4': 7,  'cons. round 5': 8,  'cons. round 6': 9,
  'cons. round 7': 10, 'cons. round 8': 11,
  'quarterfinals': 12, 'quarterfinal': 12,
  'cons. semis': 13, 'cons. semi': 13,
  'semifinals': 14,  'semifinal': 14,
  '7th place match': 15, 'seventh place': 15,
  '5th place match': 16, 'fifth place':   16,
  '3rd place match': 17, 'third place':   17,
  '1st place match': 18, 'first place':   18,
}

// ── Round normalization ───────────────────────────────────────────────────────

const ROUND_EXACT: Record<string, string> = {
  'quarterfinals': 'QF', 'quarterfinal': 'QF', 'quarters': 'QF',
  'semifinals':    'SF', 'semifinal':    'SF', 'semis':    'SF',
  '1st place match': 'F', 'final': 'F', 'finals': 'F',
  '3rd place match': '3rd_Place', '3rd place': '3rd_Place',
  '5th place match': '5th_Place', '5th place': '5th_Place',
  '7th place match': '7th_Place', '7th place': '7th_Place',
  'cons. semis': 'CSF', 'cons. semi': 'CSF',
  'cons. quarters': 'CQF', 'cons. quarter': 'CQF',
  'cons. 1st': 'CF', 'consolation 1st': 'CF',
  'prelim': 'PL',
  'varsity': 'V',
  'unknown': 'UNK',
}

export function normalizeRound(raw: string): string {
  const name = raw.replace(/\s*\([^)]*\)\s*$/, '').trim()
  const lower = name.toLowerCase()
  if (lower in ROUND_EXACT) return ROUND_EXACT[lower]
  let m: RegExpMatchArray | null
  m = lower.match(/^champ\.\s+round\s+(\d+)$/)
  if (m) return `R${m[1]}`
  m = lower.match(/^round\s+(\d+)$/)
  if (m) return `R${m[1]}`
  m = lower.match(/^cons\.\s+round\s+(\d+)$/)
  if (m) return `C${m[1]}`
  return name.replace(/\s+/g, '_').slice(0, 20)
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type ParsedBout = {
  round: string           // raw label from RTF (not yet normalized)
  wrestler1_name: string
  wrestler1_school: string
  wrestler2_name: string
  wrestler2_school: string
  winner: 1 | null        // 1 = wrestler1 won; null = DFF/unknown
  result_type: string
  result_detail: string | null
  weight_class: number
}

export type ParsedPlacement = {
  weight_class: number
  place: number
  wrestler_name: string
  school_name: string
}

export type ParsedTournament = {
  name: string
  date_raw: string
  source_format: 'full_bracket' | 'school_tracking'
  bout_count: number
  placement_count: number
  bouts: ParsedBout[]
  placements: ParsedPlacement[]
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const WL_SUFFIX_RE = /\s+\d+-\d+$/

function cleanLine(raw: string): string {
  return raw
    .replace(/\u00a0/g, ' ')  // non-breaking space
    .replace(/\u2028/g, ' ')  // line separator
    .replace(/\u2029/g, ' ')  // paragraph separator
    .trim()
}

function stripWl(s: string): string {
  return s.replace(WL_SUFFIX_RE, '').trim()
}

function normalizeSchool(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().replace(/\s*-\s*$/, '').trim()
}

function looksLikeBye(name: string, school: string): boolean {
  const combined = `${name} ${school}`.toLowerCase()
  return /\bbye\b/.test(combined) || /^\s*\)\s*\(/.test(name)
}

function parseResult(raw: string): [string, string | null] {
  const r = raw.trim()
  if (!r || r.toLowerCase() === 'bye') return ['BYE', null]
  if (r.toLowerCase().startsWith('fall')) {
    const parts = r.split(/\s+/, 2)
    return ['Fall', parts[1] ?? null]
  }
  if (['for.', 'for', 'forfeit', 'm. for.', 'm. for', 'medical forfeit'].includes(r.toLowerCase())) {
    return ['Forfeit', null]
  }
  if (['dff', 'double forfeit'].includes(r.toLowerCase())) {
    return ['DFF', null]
  }
  // "TF-1.5 3:15 (17-1)" or "TF 5:00 19-3" → Technical Fall
  if (/^tf/i.test(r)) return ['TF', null]
  const parts = r.split(/\s+/, 2)
  return [parts[0], parts[1] ?? null]
}

// Finds the outermost trailing (...) at the end of a string, handling one level
// of nesting — e.g. "(TF-1.5 3:15 (17-1))" or "(Fall 0:55)".
function extractTrailingResult(rest: string): { resultRaw: string; rest2: string } | null {
  if (!rest.endsWith(')')) return null
  let depth = 0
  for (let i = rest.length - 1; i >= 0; i--) {
    if (rest[i] === ')') depth++
    else if (rest[i] === '(') {
      depth--
      if (depth === 0) {
        return {
          resultRaw: rest.slice(i + 1, rest.length - 1),
          rest2:     rest.slice(0, i).trim(),
        }
      }
    }
  }
  return null
}

function extractNameSchool(s: string): [string, string] {
  s = s.trim()
  // Strip trailing W-L record first so it doesn't interfere with paren search.
  s = s.replace(WL_SUFFIX_RE, '').trim()
  // Use LAST (...) pair as the school — handles nicknames like "Charles (CJ) Palmisano (Whippany Park)".
  // extractTrailingResult has already stripped the result parens before this is called, so this is safe.
  const pstart = s.lastIndexOf('(')
  if (pstart >= 0) {
    const pend = s.indexOf(')', pstart)
    if (pend >= 0) {
      // Strip any remaining nickname parens from the name portion, e.g. "Charles (CJ) Palmisano" → "Charles Palmisano"
      const namePart = s.slice(0, pstart).trim().replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
      return [namePart, normalizeSchool(s.slice(pstart + 1, pend))]
    }
  }
  return [s, '']
}

function looksLikeSchool(line: string): boolean {
  if (!line || line.length > 80) return false
  if (/^\d/.test(line.slice(0, 3))) return false
  if (['yes', 'no', 'weight', 'summary', 'stats', 'tw event'].includes(line.toLowerCase())) return false
  if (/ - /.test(line) && /\d{1,2}\/\d{1,2}/.test(line)) return false
  if (line.includes('(') && line.includes(')')) return false
  return /^[A-Za-z'\. &/\-,]+\s*-?\s*$/.test(line)
}

// ── Format detection ──────────────────────────────────────────────────────────

const ROUND_GROUP_RE = /\(\d+\s*(?:Man|Mats)\)/i
const TW_META_RE = /Teams.*Divisions.*Weights|Team:.*team|Show:.*of \d+|Event Team|Season Team/i
const WEIGHT_RE = /^\d{2,3}$/
const TOURNEY_HEADER_RE = /^(.+?) - (\d{1,2}\/\d{1,2}(?:\/\d{2,4})?(?:\s*-\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)?)$/

function detectFormat(lines: string[], lookahead = 200): 'full_bracket' | 'school_tracking' {
  for (const raw of lines.slice(0, lookahead)) {
    const l = cleanLine(raw)
    if (['Yes', 'No', 'Weight', 'Summary', 'Stats', 'TW Event'].includes(l)) return 'school_tracking'
    if (ROUND_GROUP_RE.test(l)) return 'full_bracket'
    if (['consolation semifinals', 'consolation quarterfinals', 'championship semifinals', 'round results'].includes(l.toLowerCase())) {
      return 'full_bracket'
    }
  }
  return 'full_bracket'
}

// ── Format A parser ───────────────────────────────────────────────────────────

function parseBoutA(line: string): Omit<ParsedBout, 'weight_class'> | null {
  const dash = line.indexOf(' - ')
  if (dash < 0) return null
  const roundLabel = line.slice(0, dash).trim()
  const rest = line.slice(dash + 3).trim()

  if (/received a bye/i.test(rest)) {
    const m = rest.match(/^(.+?) \((.+?)\)/)
    if (!m) return null
    return { round: roundLabel, wrestler1_name: stripWl(m[1]), wrestler1_school: normalizeSchool(m[2]), wrestler2_name: '', wrestler2_school: '', winner: null, result_type: 'BYE', result_detail: null }
  }

  if (!/\bover\b/i.test(rest)) return null

  const extracted = extractTrailingResult(rest)
  if (!extracted) return null
  const { resultRaw, rest2 } = extracted

  const trans = rest2.match(/\bwon (?:by|in) .+? over\b/i)
  if (!trans) return null

  const [name1, school1] = extractNameSchool(rest2.slice(0, trans.index))
  const [name2, school2] = extractNameSchool(rest2.slice(trans.index! + trans[0].length))
  if (looksLikeBye(name2, school2)) {
    return { round: roundLabel, wrestler1_name: name1, wrestler1_school: school1, wrestler2_name: '', wrestler2_school: '', winner: null, result_type: 'BYE', result_detail: null }
  }
  const [rt, rd] = parseResult(resultRaw)

  return { round: roundLabel, wrestler1_name: name1, wrestler1_school: school1, wrestler2_name: name2, wrestler2_school: school2, winner: 1, result_type: rt, result_detail: rd }
}

function parseFormatA(lines: string[]): [ParsedBout[], ParsedPlacement[]] {
  const bouts: ParsedBout[] = []
  const placements: ParsedPlacement[] = []
  let currentWeight: number | null = null

  const SKIP_LOWER = new Set([
    'consolation semifinals', 'consolation quarterfinals',
    'championship semifinals', 'round results',
    'seventh place', 'fifth place', 'third place', 'first place',
  ])

  for (const raw of lines) {
    const line = cleanLine(raw)
    if (!line) continue
    if (WEIGHT_RE.test(line)) { currentWeight = parseInt(line, 10); continue }
    if (currentWeight === null) continue
    if (ROUND_GROUP_RE.test(line) || SKIP_LOWER.has(line.toLowerCase())) continue

    const b = parseBoutA(line)
    if (!b) continue
    const bout: ParsedBout = { ...b, weight_class: currentWeight }
    bouts.push(bout)

    const rn = bout.round.toLowerCase().trim()
    if (rn in PLACE_ROUNDS) {
      const [w1, w2] = PLACE_ROUNDS[rn]
      if (bout.winner === 1 && bout.wrestler1_name) {
        placements.push({ weight_class: currentWeight, place: w1, wrestler_name: bout.wrestler1_name, school_name: bout.wrestler1_school })
      }
      if (bout.wrestler2_name) {
        placements.push({ weight_class: currentWeight, place: w2, wrestler_name: bout.wrestler2_name, school_name: bout.wrestler2_school })
      }
    }
  }
  return [bouts, placements]
}

// ── Format B parser ───────────────────────────────────────────────────────────

function parseBoutB(line: string): Omit<ParsedBout, 'weight_class'> | null {
  const dash = line.indexOf(' - ')
  if (dash < 0) return null
  let roundLabel = line.slice(0, dash).trim()
  let rest = line.slice(dash + 3).trim()

  // "Varsity - Quarterfinals - Wrestler..." — strip division prefix, use inner round label.
  if (/^varsity$/i.test(roundLabel) && rest.includes(' - ')) {
    const inner = rest.indexOf(' - ')
    roundLabel = rest.slice(0, inner).trim()
    rest = rest.slice(inner + 3).trim()
  }

  if (/received a bye/i.test(rest)) {
    const m = rest.match(/^(.+?) \((.+?)\)/)
    if (!m) return null
    return { round: roundLabel, wrestler1_name: m[1].trim(), wrestler1_school: normalizeSchool(m[2]), wrestler2_name: '', wrestler2_school: '', winner: null, result_type: 'BYE', result_detail: null }
  }

  if (!/\bover\b/i.test(rest)) return null

  const extracted = extractTrailingResult(rest)
  const resultRaw = extracted ? extracted.resultRaw : ''
  const rest2     = extracted ? extracted.rest2     : rest

  const overIdx = rest2.toLowerCase().lastIndexOf(' over ')
  if (overIdx < 0) return null

  const [name1, school1] = extractNameSchool(rest2.slice(0, overIdx))
  const [name2, school2] = extractNameSchool(rest2.slice(overIdx + 6))
  if (looksLikeBye(name2, school2)) {
    return { round: roundLabel, wrestler1_name: name1, wrestler1_school: school1, wrestler2_name: '', wrestler2_school: '', winner: null, result_type: 'BYE', result_detail: null }
  }
  const [rt, rd] = parseResult(resultRaw)

  return { round: roundLabel, wrestler1_name: name1, wrestler1_school: school1, wrestler2_name: name2, wrestler2_school: school2, winner: 1, result_type: rt, result_detail: rd }
}

function parseBoutBNoRound(line: string): Omit<ParsedBout, 'weight_class'> | null {
  if (!/\bover\b/i.test(line) || / - /.test(line)) return null
  if (!line.includes('(') || !line.includes(')')) return null

  const extracted = extractTrailingResult(line)
  const resultRaw = extracted ? extracted.resultRaw : ''
  const rest      = extracted ? extracted.rest2     : line

  const overIdx = rest.toLowerCase().lastIndexOf(' over ')
  if (overIdx < 0) return null

  const [name1, school1] = extractNameSchool(rest.slice(0, overIdx))
  const [name2, school2] = extractNameSchool(rest.slice(overIdx + 6))
  if (!name1 || !name2) return null
  if (looksLikeBye(name2, school2)) {
    return { round: 'Unknown', wrestler1_name: name1, wrestler1_school: school1, wrestler2_name: '', wrestler2_school: '', winner: null, result_type: 'BYE', result_detail: null }
  }
  const [rt, rd] = parseResult(resultRaw)

  return { round: 'Unknown', wrestler1_name: name1, wrestler1_school: school1, wrestler2_name: name2, wrestler2_school: school2, winner: 1, result_type: rt, result_detail: rd }
}

function readFlags(cleaned: string[], idx: number): [string | null, string | null, number] {
  let flag1: string | null = null
  let flag2: string | null = null
  let la = 0
  while (la < 6 && idx < cleaned.length) {
    const fl = cleaned[idx++]
    la++
    if (fl === 'Yes' || fl === 'No') {
      if (!flag1) { flag1 = fl }
      else if (!flag2) { flag2 = fl; break }
    } else if (fl) {
      idx--; break
    }
  }
  return [flag1, flag2, idx]
}

function parseFormatB(lines: string[]): [ParsedBout[], ParsedPlacement[]] {
  const cleaned = lines.map(cleanLine)
  const rawWithWeight: Array<[Omit<ParsedBout, 'weight_class'>, number | null, string | null, string | null]> = []
  let currentWeight: number | null = null
  let currentSchool: string | null = null

  let i = 0
  while (i < cleaned.length) {
    const line = cleaned[i++]
    if (!line) continue
    if (TW_META_RE.test(line)) continue
    if (['Weight', 'Summary', 'Stats', 'TW Event'].includes(line)) continue
    if (WEIGHT_RE.test(line)) { currentWeight = parseInt(line, 10); continue }

    let bout = parseBoutB(line)
    if (!bout && currentWeight !== null) bout = parseBoutBNoRound(line)

    if (!bout) {
      if (looksLikeSchool(line)) {
        currentSchool = normalizeSchool(line)
        if (currentWeight !== null && !/\bover\b/i.test(line)) currentWeight = null
      }
      continue
    }

    const [, flag2, newI] = readFlags(cleaned, i)
    i = newI
    rawWithWeight.push([bout, currentWeight, flag2, currentSchool])
  }

  const anyYes2 = rawWithWeight.some(([, , f]) => f === 'Yes')

  const bouts: ParsedBout[] = []
  const schoolWeightBouts = new Map<string, Map<number, Omit<ParsedBout, 'weight_class'>[]>>()

  for (const [bout, wc, flag2, school] of rawWithWeight) {
    if (anyYes2 && flag2 !== 'Yes') continue
    if (!wc) continue
    const full: ParsedBout = { ...bout, weight_class: wc }
    bouts.push(full)
    if (school) {
      if (!schoolWeightBouts.has(school)) schoolWeightBouts.set(school, new Map())
      const wmap = schoolWeightBouts.get(school)!
      if (!wmap.has(wc)) wmap.set(wc, [])
      wmap.get(wc)!.push(bout)
    }
  }

  // Infer placements from last round reached per school per weight.
  //
  // The section header name (e.g. "Christian Brother Academy") may not exactly
  // match the school name in the bout lines ("Christian Brothers Academy") or
  // the header may be a short abbreviation ("Delbarton" vs "Delbarton School").
  // Exact comparison against the header fails, causing trackedSide to default
  // to wrestler1 (the winner), so OOS champions get credited.
  //
  // Fix: identify the tracked school by frequency. The NJ school appears in
  // every bout in the section; each opponent appears only once.
  const placements: ParsedPlacement[] = []
  for (const [school, weightMap] of schoolWeightBouts) {
    // Count every school name that appears across all bouts in this section.
    const freq = new Map<string, number>()
    for (const wbouts of weightMap.values()) {
      for (const b of wbouts) {
        const inc = (n: string) => { if (n) freq.set(n, (freq.get(n) ?? 0) + 1) }
        inc(normalizeSchool(b.wrestler1_school))
        inc(normalizeSchool(b.wrestler2_school))
      }
    }
    // Most-frequent normalized name = the tracked school.
    const trackedNorm = freq.size > 0
      ? [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : normalizeSchool(school)

    // Recover the original (non-normalized) spelling for the placement record.
    let trackedRaw = school
    for (const wbouts of weightMap.values()) {
      let found = false
      for (const b of wbouts) {
        if (normalizeSchool(b.wrestler1_school) === trackedNorm) { trackedRaw = b.wrestler1_school; found = true; break }
        if (normalizeSchool(b.wrestler2_school) === trackedNorm) { trackedRaw = b.wrestler2_school; found = true; break }
      }
      if (found) break
    }

    for (const [weight, wbouts] of weightMap) {
      if (!wbouts.length) continue
      const s_w1 = wbouts.filter(b => normalizeSchool(b.wrestler1_school) === trackedNorm).length
      const s_w2 = wbouts.filter(b => normalizeSchool(b.wrestler2_school) === trackedNorm).length
      const trackedSide = s_w1 >= s_w2 ? 1 : 2

      const best = wbouts.reduce((a, b) =>
        (ROUND_PRIORITY[b.round.toLowerCase().trim()] ?? 0) > (ROUND_PRIORITY[a.round.toLowerCase().trim()] ?? 0) ? b : a
      )
      const rn = best.round.toLowerCase().trim()
      const won = best.winner === trackedSide
      const name = trackedSide === 1 ? best.wrestler1_name : best.wrestler2_name

      if (rn in PLACE_FROM_WIN && won) {
        placements.push({ weight_class: weight, place: PLACE_FROM_WIN[rn], wrestler_name: name, school_name: trackedRaw })
      } else if (rn in PLACE_FROM_LOSS && !won) {
        placements.push({ weight_class: weight, place: PLACE_FROM_LOSS[rn], wrestler_name: name, school_name: trackedRaw })
      }
    }
  }

  return [bouts, placements]
}

// ── Top-level ─────────────────────────────────────────────────────────────────

export function parseRtfText(text: string, only?: string): ParsedTournament[] {
  const lines = text.split('\n')
  const cleaned = lines.map(cleanLine)
  const starts: Array<[number, string, string]> = []

  for (let i = 0; i < cleaned.length; i++) {
    const line = cleaned[i]

    // Explicit "Name - Date" header
    const m = line.match(TOURNEY_HEADER_RE)
    if (m) { starts.push([i, m[1].trim(), m[2].trim()]); continue }

    // Plain name header: no date, but immediately followed by TW navigation block.
    // Handles TrackWrestling copy-paste where the title line has no " - date" suffix.
    if (line && line.length >= 5 && line.length <= 120 &&
        !TW_META_RE.test(line) && !WEIGHT_RE.test(line) &&
        !line.includes('(') && !/\bover\b/i.test(line)) {
      for (let j = i + 1; j < Math.min(i + 5, cleaned.length); j++) {
        const next = cleaned[j]
        if (!next) continue
        if (TW_META_RE.test(next)) starts.push([i, line, ''])
        break
      }
    }
  }

  const results: ParsedTournament[] = []
  for (let idx = 0; idx < starts.length; idx++) {
    const [lineIdx, name, dateRaw] = starts[idx]
    if (only && !name.toLowerCase().includes(only.toLowerCase())) continue

    const nextStart = idx + 1 < starts.length ? starts[idx + 1][0] : lines.length
    const section = lines.slice(lineIdx + 1, nextStart)
    const fmt = detectFormat(section)
    const [bouts, placements] = fmt === 'full_bracket' ? parseFormatA(section) : parseFormatB(section)

    results.push({
      name,
      date_raw: dateRaw,
      source_format: fmt,
      bout_count: bouts.length,
      placement_count: placements.length,
      bouts,
      placements,
    })
  }
  return results
}

// ── Date parsing ──────────────────────────────────────────────────────────────

export function parseDateRange(dateRaw: string, year: number): [string, string | null] {
  const m = dateRaw.match(/(\d{1,2})\/(\d{1,2})(?:\s*[-–]\s*(\d{1,2})\/(\d{1,2}))?/)
  if (!m) return [`${year}-01-01`, null]
  const [, m1, d1, m2, d2] = m
  const start = `${year}-${m1.padStart(2, '0')}-${d1.padStart(2, '0')}`
  const end = m2 ? `${year}-${m2.padStart(2, '0')}-${d2.padStart(2, '0')}` : null
  return [start, end]
}

// ── Fall time → seconds ───────────────────────────────────────────────────────

export function parseTime(s: string): number | null {
  const m = s.trim().match(/^(\d+):(\d{2})$/)
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null
}

export function boutResultToDb(resultType: string, resultDetail: string | null): {
  db_type: string | null
  db_detail: string | null
  fall_time_seconds: number | null
  winner: 1 | null
} {
  const rt = (resultType ?? '').trim()
  if (!rt || rt.toUpperCase() === 'BYE') return { db_type: null, db_detail: null, fall_time_seconds: null, winner: null }
  if (rt.toUpperCase() === 'DFF') return { db_type: 'DFF', db_detail: null, fall_time_seconds: null, winner: null }
  if (rt.toLowerCase() === 'fall' && resultDetail) {
    const secs = parseTime(resultDetail)
    return { db_type: 'Fall', db_detail: null, fall_time_seconds: secs, winner: 1 }
  }
  return { db_type: rt, db_detail: resultDetail, fall_time_seconds: null, winner: 1 }
}
