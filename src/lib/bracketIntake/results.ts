// Results from a FloWrestling CSV export (bracket intake, 2026-11-26). Columns: Date, Weight, Round, Winning
// Wrestler, Winning Team, Result, Win Type, Losing Wrestler, Losing Team, City, State, Event — each cell written as
// ="value". Row order is NOT bracket order (2013–2024: random), which doesn't matter once the draw is loaded.

export type ResultRow = {
  row: number               // 1-based data row in the file (for review)
  date: string; weight: number; round: string
  winner: string; winnerTeam: string; result: string; winType: string
  loser: string; loserTeam: string; event: string
}

/** CSV text → cells (quotes, doubled quotes, commas and newlines inside quotes) */
function parseCsv(text: string): string[][] {
  const out: string[][] = []; let row: string[] = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++ } else q = false } else cell += c; continue }
    if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); out.push(row); row = []; cell = '' }
    else cell += c
  }
  if (cell || row.length) { row.push(cell); out.push(row) }
  return out.filter(r => r.some(c => c.trim()))
}
// ="106" → 106 (Excel-safe wrapping)
const unwrap = (s: string) => s.replace(/^﻿/, '').replace(/^=?"?/, '').replace(/"?$/, '').trim()

export function readFloResults(text: string): { rows: ResultRow[]; problems: string[] } {
  const cells = parseCsv(text)
  if (!cells.length) return { rows: [], problems: ['The file is empty.'] }
  const hdr = cells[0].map(unwrap)
  const col = (name: string) => hdr.findIndex(h => h.toLowerCase() === name.toLowerCase())
  const need = ['Weight', 'Round', 'Winning Wrestler', 'Winning Team', 'Result', 'Win Type', 'Losing Wrestler', 'Losing Team']
  const missing = need.filter(n => col(n) < 0)
  if (missing.length) return { rows: [], problems: [`This isn't a FloWrestling results file (missing: ${missing.join(', ')}).`] }
  const get = (r: string[], n: string) => (col(n) >= 0 ? unwrap(r[col(n)] ?? '') : '')
  const rows: ResultRow[] = [], problems: string[] = []
  cells.slice(1).forEach((r, i) => {
    const weight = Number(get(r, 'Weight'))
    if (!weight) { problems.push(`Row ${i + 1}: no weight`); return }
    rows.push({
      row: i + 1, date: get(r, 'Date'), weight, round: get(r, 'Round'),
      winner: get(r, 'Winning Wrestler'), winnerTeam: get(r, 'Winning Team'), result: get(r, 'Result'), winType: get(r, 'Win Type'),
      loser: get(r, 'Losing Wrestler'), loserTeam: get(r, 'Losing Team'), event: get(r, 'Event'),
    })
  })
  return { rows, problems }
}

// ── rounds ───────────────────────────────────────────────────────────────────────────────────────────────────────
// ~50 names for the same rounds across 2013–2025 (quirks doc §4, §6). Championship rounds are counted back from the
// final; EARLY1/EARLY2 are the rounds before the quarterfinals. A blank label is fine: the draw gives the round.
export type RoundKind = 'F' | 'SF' | 'QF' | 'EARLY1' | 'EARLY2' | 'CONS' | 'BLANK' | 'UNKNOWN'
const CHAMP: [RegExp, RoundKind][] = [
  [/^(finals?|first place|championship( finals)?|1st place match)$/i, 'F'],
  [/^(semis|semifinals?|semi-finals|semis-finals|champ semis)$/i, 'SF'],
  [/^(quarters|quarterfinals?|quarter-finals)$/i, 'QF'],
  [/^(champ\.? round 2|pre-quart?erfinals|round 2|round of 16)$/i, 'EARLY2'],
  [/^(champ\.? round 1|round 1|preliminar(y round|ies)|prelims|perlim round 1|round of 32)$/i, 'EARLY1'],
]
const CONS = /^(cons|consi|consolation|wrestleback|placement|3rd|5th|7th|conso)/i
export function roundKind(label: string): RoundKind {
  const l = label.replace(/\s*\(\d+ Man\)$/i, '').trim()
  if (!l) return 'BLANK'
  for (const [rx, k] of CHAMP) if (rx.test(l)) return k
  return CONS.test(l) ? 'CONS' : 'UNKNOWN'
}

/** a placeholder wrestler, not a person: Forfeit Forfeit, A Forfeit, Joe Forfeit, forfeit o, Forefit, Foreit, Bye Bye */
export const isPlaceholder = (name: string) => !name.trim() || /\bfore?f?e?it\b/i.test(name) || /^bye( bye)?$/i.test(name.trim())
