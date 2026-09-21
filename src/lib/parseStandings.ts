// Parses pasted standings text (nj.com style) into structured blocks.
//
// Conference standings:
//   2025-2026 BCSL Standings
//   Freedom    OVERALL    PCT    DIV    PCT    HOME    AWAY    PF    PA
//   Maple Shade    12-15    .444    4-0    1.000    7-9    5-6    1096    935
//
// Power Points:
//   2025-2026 Wrestling Central Jersey, Group 1 Power Points
//   Rank / Team / W-L PCT / PP            (header lines, ignored)
//   1    Delaware Valley    24-0    1.000    43
//
// Several blocks may be pasted together; each starts at its own title line.

export type StandingsRow = {
  division: string
  team: string
  overallWins: number
  overallLosses: number
  divWins: number | null
  divLosses: number | null
  pf: number | null
  pa: number | null
}

export type PowerPointsRow = {
  rank: number
  team: string
  wins: number
  losses: number
  pp: number
}

export type StandingsBlock = {
  kind: 'standings'
  title: string
  endYear: number
  conference: string
  rows: StandingsRow[]
}

export type PowerPointsBlock = {
  kind: 'power_points'
  title: string
  endYear: number
  section: string
  group: string
  rows: PowerPointsRow[]
}

export type ParsedBlock = StandingsBlock | PowerPointsBlock
export type ParseResult = { blocks: ParsedBlock[]; warnings: string[] }

const TITLE_RE         = /^(\d{4})\s*[-–]\s*(\d{4})\s+(.+)$/
const HEADER_RE        = /^(.*?)\s*\bOVERALL\b(.*)$/i
const STANDINGS_ROW_RE = /^(.+?)\s+(\d+-\d+(?:-\d+)?)(?:\s+(.*))?$/
const PP_ROW_RE        = /^(\d+)\s+(.+?)\s+(\d+)-(\d+)(?:-\d+)?\s+[\d.]+\s+(\d+(?:\.\d+)?)$/
const PP_HEADER_RE     = /^(rank|team|w-l(\s+pct)?|pct|pp)$/i

// Column labels nj.com uses after OVERALL in standings headers
const STANDINGS_LABELS = new Set(['PCT', 'DIV', 'CONF', 'HOME', 'AWAY', 'NEUTRAL', 'PF', 'PA', 'STREAK', 'STRK', 'GB', 'L10'])
const RECORD_RE = /^\d+-\d+(?:-\d+)?$/
const PCT_RE    = /^\d*\.\d+$/
const NUM_RE    = /^\d+(?:\.\d+)?$/

// Some browsers copy nj.com tables one cell per line instead of one row per
// line. Rebuild each row as a single line (cells separated by 4 spaces) so the
// row parser below handles both layouts. Rows already on one line pass through.
function joinVerticalRows(lines: string[]): string[] {
  const out: string[] = []
  let mode: 'none' | 'standings' | 'power_points' = 'none'
  let rowWidth = 0                          // standings: values after the team name
  for (let i = 0; i < lines.length; ) {
    const line = lines[i]
    const title = line.match(TITLE_RE)
    if (title) {
      mode = /\bStandings$/i.test(title[3]) ? 'standings' : /\bPower Points$/i.test(title[3]) ? 'power_points' : 'none'
      rowWidth = 0
      out.push(line); i++; continue
    }

    if (mode === 'power_points') {
      const [team, rec, pct, pp] = lines.slice(i + 1, i + 5)
      if (/^\d+$/.test(line) && team && rec && RECORD_RE.test(rec) && PCT_RE.test(pct ?? '') && NUM_RE.test(pp ?? '')) {
        out.push([line, team, rec, pct, pp].join('    ')); i += 5; continue
      }
    }

    if (mode === 'standings') {
      // Division header: "Freedom" / "OVERALL" / "PCT" / "DIV" / … one per line
      if (/^overall$/i.test(lines[i + 1] ?? '') && !HEADER_RE.test(line)) {
        const labels: string[] = []
        let j = i + 2
        while (j < lines.length && STANDINGS_LABELS.has(lines[j].toUpperCase())) labels.push(lines[j++])
        out.push([line, 'OVERALL', ...labels].join('    '))
        rowWidth = 1 + labels.length
        i = j; continue
      }
      // Row: team name, then rowWidth single-value cells starting with a record
      const cells = lines.slice(i + 1, i + 1 + rowWidth)
      if (rowWidth > 0 && !RECORD_RE.test(line) && cells.length === rowWidth
          && RECORD_RE.test(cells[0]) && cells.every(c => !/\s/.test(c))) {
        out.push([line, ...cells].join('    ')); i += 1 + rowWidth; continue
      }
    }

    out.push(line); i++
  }
  return out
}

function parseRecord(s: string | undefined): { w: number; l: number } | null {
  const m = s?.match(/^(\d+)-(\d+)(?:-\d+)?$/)
  return m ? { w: parseInt(m[1], 10), l: parseInt(m[2], 10) } : null
}

function toInt(s: string | undefined): number | null {
  return s !== undefined && /^\d+$/.test(s) ? parseInt(s, 10) : null
}

export function parseStandingsText(text: string): ParseResult {
  const blocks: ParsedBlock[] = []
  const warnings: string[] = []
  let current: ParsedBlock | null = null
  let headers: string[] = []
  let division = ''
  let sawTitle = false

  const lines = joinVerticalRows(text.split(/\r?\n/).map(l => l.trim()).filter(Boolean))

  for (const line of lines) {
    const title = line.match(TITLE_RE)
    if (title) {
      sawTitle = true
      const endYear = parseInt(title[2], 10)
      const rest = title[3].trim()
      headers = []
      division = ''

      if (/\bStandings$/i.test(rest)) {
        const conference = rest.replace(/\s*Standings$/i, '').replace(/^Wrestling\s+/i, '').trim()
        current = { kind: 'standings', title: line, endYear, conference, rows: [] }
        blocks.push(current)
      } else if (/\bPower Points$/i.test(rest)) {
        const label = rest.replace(/\s*Power Points$/i, '').replace(/^Wrestling\s+/i, '').trim()
        const comma = label.lastIndexOf(',')
        const section = comma === -1 ? label : label.slice(0, comma).trim()
        const group   = comma === -1 ? '' : label.slice(comma + 1).trim()
        current = { kind: 'power_points', title: line, endYear, section, group, rows: [] }
        blocks.push(current)
      } else {
        current = null
        warnings.push(`Unrecognized title ignored: "${line}"`)
      }
      continue
    }

    if (!current) {
      if (sawTitle) continue
      warnings.push(`Line before any title ignored: "${line}"`)
      continue
    }

    if (current.kind === 'standings') {
      const header = line.match(HEADER_RE)
      if (header) {
        division = header[1].trim() || current.conference
        headers  = ['OVERALL', ...header[2].trim().split(/\s+/).filter(Boolean)].map(h => h.toUpperCase())
        continue
      }

      const row = line.match(STANDINGS_ROW_RE)
      if (!row || headers.length === 0) {
        warnings.push(`Could not read line: "${line}"`)
        continue
      }

      const tokens = [row[2], ...(row[3] ? row[3].trim().split(/\s+/) : [])]
      if (tokens.length !== headers.length) {
        warnings.push(`Column count mismatch (${tokens.length} vs ${headers.length}), skipped: "${line}"`)
        continue
      }

      const at      = (name: string) => tokens[headers.indexOf(name)]
      const overall = parseRecord(at('OVERALL'))
      if (!overall) {
        warnings.push(`Bad overall record, skipped: "${line}"`)
        continue
      }
      const div = headers.includes('DIV') ? parseRecord(at('DIV')) : null

      current.rows.push({
        division,
        team:          row[1].trim(),
        overallWins:   overall.w,
        overallLosses: overall.l,
        divWins:       div?.w ?? null,
        divLosses:     div?.l ?? null,
        pf:            headers.includes('PF') ? toInt(at('PF')) : null,
        pa:            headers.includes('PA') ? toInt(at('PA')) : null,
      })
      continue
    }

    if (PP_HEADER_RE.test(line)) continue
    const pp = line.match(PP_ROW_RE)
    if (!pp) {
      warnings.push(`Could not read line: "${line}"`)
      continue
    }
    current.rows.push({
      rank:   parseInt(pp[1], 10),
      team:   pp[2].trim(),
      wins:   parseInt(pp[3], 10),
      losses: parseInt(pp[4], 10),
      pp:     parseFloat(pp[5]),
    })
  }

  if (!sawTitle && lines.length > 0) {
    warnings.push('No title line found. Include the heading, e.g. "2025-2026 BCSL Standings".')
  }
  for (const b of blocks) {
    if (b.rows.length === 0) warnings.push(`No rows read for "${b.title}"`)
  }

  return { blocks, warnings }
}
