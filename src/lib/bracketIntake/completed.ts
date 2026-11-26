// A completed FloWrestling bracket PDF → each championship bout as the bracket shows it (bracket intake, 2026-11-26).
// Asked for only when a results file doesn't fit the draw; then every championship bout in the file is checked
// against it, not just the ones that tripped.
//
// Layout (a weight's first page): column k holds the wrestlers in round k's boxes, two per box, top to bottom —
// column 0 is the draw ("1 Jonathan Fuller (SPPS)"), later columns print surnames ("1 Fuller (SPPS)"). Under each
// box: the result ("DEC 9-3", "F 1:36", "MD 12-1"); to its right, the bout number. The winner is printed in a heavier
// font (UniNeue Heavy over Bold); that is the only mark for the final's winner — no champion line is printed.
import { rows, type PageText, type Piece } from './rows'
import type { WeightDraw } from './flo'
import { norm } from './fit'

export type BracketBout = {
  level: number                      // 0 = first round … D-1 = final
  block: number                      // which box in that round, top to bottom
  lines: [number | null, number | null]   // the draw lines of the two wrestlers in the box (null: a bye / not known)
  names: [string, string]            // as printed in the box
  winner: number | null              // the winner's draw line (null: not wrestled / unreadable)
  result: string                     // "DEC 6-5", "F 1:36", '' if none printed
  bout: string                       // the bout number
  page: number                       // 1-based PDF page
  tops: [number, number]             // y of the two names (for the crop)
  x: number                          // the column's x
}
export type CompletedWeight = { weight: number; page: number; bouts: BracketBout[]; problem: string | null }

const ENTRY = /^(\d+)?\s*(\D.*?)\s*\(([^()]*)\)?$/
const EMPTY = /^(\d+\s*)?(BYE|Forfeit)$/i
const RESULT = /^(DEC|MD|TF|F|FALL|DEF|DQ|INJ|FF|FOR|MFF|M\.FF|SV|UTB|TB|NC|BYE)\b/i

/** the completed PDF's pages + the draws (from the blank bracket) → each weight's championship bouts */
export function readFloCompleted(pages: PageText[], draws: WeightDraw[], completedDraws: WeightDraw[]): CompletedWeight[] {
  const out: CompletedWeight[] = []
  for (const cd of completedDraws) {
    const draw = draws.find(d => d.weight === cd.weight)
    if (!draw) continue
    const size = draw.lines.length, D = Math.log2(size)
    const fail = (problem: string) => out.push({ weight: cd.weight, page: cd.page, bouts: [], problem })
    if (!Number.isInteger(D)) { fail(`The ${cd.weight} bracket has ${size} lines.`); continue }
    if (cd.lines.length !== size) { fail(`The completed ${cd.weight} bracket has ${cd.lines.length} lines; the loaded bracket has ${size}.`); continue }
    const pg = pages[cd.page - 1]
    const pieces = rows(pg).filter(p => p.top > 40 && p.x < pg.width * 0.95)
    const entries = pieces.filter(p => EMPTY.test(p.text) || (p.text.includes('(') && ENTRY.test(p.text)))
    // column 0 is the draw (byes included); later columns: the names only — a bye box prints a second "BYE" between
    // the columns (Region 7 2024), which isn't anyone advancing. Grouped by x: a gap of more than 50pt starts a column
    const col0 = entries.filter(e => Math.abs(e.x - cd.x) <= 25).sort((a, b) => a.top - b.top)
    const later = entries.filter(e => e.x > cd.x + 60 && !EMPTY.test(e.text))
    const xs = [...new Set(later.map(e => Math.round(e.x)))].sort((a, b) => a - b)
    const cols: number[] = [cd.x]
    for (const x of xs) if (cols.length === 1 || x - cols[cols.length - 1] > 50) cols.push(x)
    const colOf = (x: number) => { let k = 0; cols.forEach((c, i) => { if (i && x >= c - 25) k = i }); return k }
    // a BYE inside a later round's box (Union County 2025 113: "1 Daly" v "BYE" in round 2) sits in the column itself;
    // the stray one sits ~40pt to its left
    const byes = entries.filter(e => e.x > cd.x + 60 && EMPTY.test(e.text))
    const byCol = cols.map((c, k) => (k === 0 ? col0 : [...later.filter(e => colOf(e.x) === k), ...byes.filter(e => Math.abs(e.x - c) <= 12)].sort((a, b) => a.top - b.top)))
    const bouts: BracketBout[] = []
    let problem: string | null = null
    for (let k = 0; k < D; k++) {
      const col = byCol[k] ?? []
      const want = size >> k
      if (col.length === 0) break                                        // not wrestled yet
      if (col.length !== want) { problem = `Round ${k + 1} of the completed ${cd.weight} bracket read as ${col.length} names (should be ${want}).`; break }
      for (let j = 0; j < want / 2; j++) {
        const e0 = col[2 * j], e1 = col[2 * j + 1]
        const span = 1 << k                                              // draw lines each half of the box covers
        const lineOf = (e: Piece, from: number): number | null => {
          if (EMPTY.test(e.text)) return null
          const m = ENTRY.exec(e.text); if (!m) return null
          if (k === 0) return draw.lines[from] ? from : null
          const sur = norm(m[2])
          const hits: number[] = []
          for (let i = from; i < from + span; i++) { const l = draw.lines[i]; if (l && (norm(l.name).endsWith(sur) || sur.endsWith(norm(l.name)))) hits.push(i) }
          if (hits.length === 1) return hits[0]
          const bySeed = hits.filter(i => m[1] && draw.lines[i]?.seed === Number(m[1]))
          return bySeed.length === 1 ? bySeed[0] : null
        }
        const la = lineOf(e0, 2 * j * span), lb = lineOf(e1, (2 * j + 1) * span)
        // the winner: the heavier name; if they print the same, whoever is in the next round's box
        let winner: number | null = null
        if (la != null && lb != null) {
          if (e0.w !== e1.w) winner = e0.w > e1.w ? la : lb
          else {
            const nxt = byCol[k + 1]?.[j]
            const m = nxt && ENTRY.exec(nxt.text)
            if (m) { const s = norm(m[2]); const hit = [la, lb].filter(i => norm(draw.lines[i]!.name).endsWith(s)); if (hit.length === 1) winner = hit[0] }
          }
        }
        const x = cols[k]
        const res = pieces.find(p => p.top > e1.top + 3 && p.top < e1.top + 18 && p.x > x + 30 && p.x < x + 160 && RESULT.test(p.text))
        const num = pieces.find(p => p.top > e0.top && p.top < e1.top && p.x > x + 50 && p.x < x + 140 && /^\d+$/.test(p.text))
        bouts.push({ level: k, block: j, lines: [la, lb], names: [e0.text, e1.text], winner, result: res?.text ?? '', bout: num?.text ?? '', page: cd.page, tops: [e0.top, e1.top], x })
      }
    }
    out.push({ weight: cd.weight, page: cd.page, bouts, problem })
  }
  return out
}

/** does a results-file score agree with the bracket's? Compares the win type and the score or the fall time */
export function sameResult(winType: string, result: string, bracket: string): boolean {
  if (!bracket) return true
  const t = (s: string) => s.toUpperCase().replace(/^(FALL|PIN)$/, 'F').replace(/^(FF|MFF|M\.FF|FOR)$/, 'FOR')
  const [bt] = bracket.split(/\s+/)
  if (winType && t(winType) !== t(bt)) return false
  const score = (s: string) => /(\d+)\s*-\s*(\d+)/.exec(s)?.slice(1, 3).map(Number).sort((a, b) => b - a).join('-') ?? null
  const time = (s: string) => /(\d+:\d\d)\s*$/.exec(s.trim())?.[1] ?? null
  if (/^(DEC|MD|TF)$/i.test(bt)) { const a = score(result), b = score(bracket); if (a && b && a !== b) return false }
  if (/^F$/i.test(t(bt))) { const a = time(result), b = time(bracket); if (a && b && a !== b) return false }
  return true
}
