// The review list for the bracket intake (2026-11-26): each bout that doesn't fit the draw, turned into an item a
// worker can settle, with the PDF section to show beside it (which page, which lines to box) and what the file
// says elsewhere that explains it. Used by the Aesthetic Tool's Import review tab (mock) and, next, by Load results.
import type { WeightDraw } from './flo'
import { fitWeight, norm, type FlagKind, type WeightFit } from './fit'
import { roundKind, type ResultRow } from './results'

export type Mark = { line: number; top: number; tone: 'red' | 'amber'; label: string }
export type ReviewItem = {
  id: string
  weight: number                // the weight the file lists the bout under
  kind: FlagKind
  title: string                 // short: what's wrong
  reason: string                // the importer's words
  row: ResultRow
  show: { weight: number; page: number; top: number; bottom: number; x: number } | null   // the PDF section beside it
  marks: Mark[]
  hint: string | null           // what the rest of the file says
  related: ResultRow[]          // other bouts in the file that bear on it
  fixes: string[]               // what the worker can do (the real page turns these into buttons)
  knockOn: string | null        // the id of the earlier problem this one follows from (fix that and this fits)
}

const TITLE: Record<FlagKind, string> = {
  'bad-size': 'Bracket didn’t read cleanly',
  'not-on-bracket': 'Name not on the bracket',
  'unknown-round': 'Unknown round name',
  'wrong-round': 'Round label doesn’t match the bracket',
  'off-path': 'Result doesn’t follow the bracket',
}

function lev(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}
const similar = (a: string, b: string) => { const x = norm(a), y = norm(b); return 1 - lev(x, y) / Math.max(x.length, y.length, 1) }

const linesOf = (draw: WeightDraw, name: string) => draw.lines.flatMap((l, i) => (l && norm(l.name) === norm(name) ? [i] : []))
const RANK: Record<string, number> = { EARLY1: 0, EARLY2: 1, QF: 2, SF: 3, F: 4 }
const rank = (r: ResultRow) => RANK[roundKind(r.round)] ?? -1           // -1: not a championship round / no label
const isChamp = (r: ResultRow) => rank(r) >= 0
const hasWrestler = (r: ResultRow, n: string) => norm(r.winner) === norm(n) || norm(r.loser) === norm(n)
const desc = (r: ResultRow) => `${r.round || '(no round)'}: ${r.winner} over ${r.loser}${r.result ? ` (${r.result})` : ''}`

export type IntakeReport = { fits: WeightFit[]; items: ReviewItem[]; noDraw: { weight: number; bouts: number }[] }

/** draws from the PDF + the results file → every weight's fit and the review list */
export function reviewIntake(draws: WeightDraw[], rows: ResultRow[]): IntakeReport {
  const byWeight = new Map(draws.map(d => [d.weight, d]))
  const fits = draws.map(d => fitWeight(d, rows.filter(r => r.weight === d.weight)))
  const items: ReviewItem[] = []
  // results at a weight the PDF has no bracket for: each one is a review item (usually the wrong weight)
  const noDraw = [...new Set(rows.map(r => r.weight))].filter(w => !byWeight.has(w)).map(w => ({ weight: w, bouts: rows.filter(r => r.weight === w).length }))
  const flagged = [
    ...fits.flatMap(f => f.flags.map(fl => ({ ...fl, weight: f.weight }))),
    ...rows.filter(r => !byWeight.has(r.weight)).map(row => ({ row, weight: row.weight, kind: 'not-on-bracket' as const, reason: `There's no ${row.weight} bracket in the PDF.`, lines: [null, null] as [number | null, number | null] })),
  ]
  for (const fl of flagged) {
    const { row } = fl
    const draw = byWeight.get(fl.weight)
    const marks: Mark[] = []
    const related: ResultRow[] = []
    let hint: string | null = null
    let showDraw = draw ?? null
    const fixes: string[] = []
    const mark = (d: WeightDraw, line: number, tone: Mark['tone'], label: string) => marks.push({ line, top: d.tops[line] ?? 0, tone, label })
    if (fl.kind === 'not-on-bracket') {
      const [a, c] = fl.lines ?? [null, null]
      // both wrestlers on another weight's bracket: the bout is under the wrong weight
      const elsewhere = draws.find(d => d.weight !== fl.weight && linesOf(d, row.winner).length === 1 && linesOf(d, row.loser).length === 1)
      if (elsewhere) {
        showDraw = elsewhere
        mark(elsewhere, linesOf(elsewhere, row.winner)[0], 'amber', row.winner)
        mark(elsewhere, linesOf(elsewhere, row.loser)[0], 'amber', row.loser)
        hint = `Both wrestlers are on the ${elsewhere.weight} bracket. The file probably lists this bout under the wrong weight.`
        fixes.push(`Move this bout to ${elsewhere.weight}`)
      } else if (draw) {
        if (a != null) mark(draw, a, 'red', row.winner)
        if (c != null) mark(draw, c, 'red', row.loser)
        for (const missing of [a == null ? row.winner : null, c == null ? row.loser : null].filter((x): x is string => !!x)) {
          const best = draw.lines.map((l, i) => ({ i, l, s: l ? similar(l.name, missing) : 0 })).sort((x, y) => y.s - x.s)[0]
          if (best?.l && best.s >= 0.6) {
            mark(draw, best.i, 'amber', `${best.l.name}?`)
            hint = `${hint ? `${hint} ` : ''}“${missing}” is closest to ${best.l.name} (${best.l.code}) on line ${best.i + 1}.`
            fixes.push(`“${missing}” is ${best.l.name}`)
          } else hint = `${hint ? `${hint} ` : ''}No one on the ${fl.weight} bracket is close to “${missing}”.`
        }
        fixes.push('Pick a different wrestler from the bracket')
      }
    } else if (draw && fl.lines && fl.lines[0] != null && fl.lines[1] != null) {
      const [a, c] = fl.lines as [number, number]
      mark(draw, a, 'red', row.winner)
      mark(draw, c, 'red', row.loser)
      if (fl.kind === 'off-path') {
        // what else the file says about these two on the championship side
        const same = rows.filter(r => r !== row && r.weight === row.weight && isChamp(r) && [row.winner, row.loser].some(n => norm(n) === norm(r.winner) || norm(n) === norm(r.loser)))
        related.push(...same)
        const lostBefore = [row.winner, row.loser].map(n => ({ n, r: same.find(r => norm(r.loser) === norm(n) && rank(r) >= 0 && rank(r) < rank(row)) })).filter(x => x.r)
        if (lostBefore.length) hint = lostBefore.map(x => `The file also says ${x.n} lost earlier on the championship side (${desc(x.r!)}), yet ${x.n} wrestles this ${row.round || 'bout'}. One of the two results is wrong.`).join(' ')
        else hint = 'The two wrestlers don’t both reach this round by the results before it. Check who won the earlier rounds.'
        fixes.push('Fix the earlier result', 'Fix this result')
      } else if (fl.kind === 'wrong-round') {
        hint = `By their lines (${a + 1} and ${c + 1}), these two can only meet in one round. The bout is placed there whatever the label says once you confirm.`
        fixes.push('Use the bracket’s round')
      } else if (fl.kind === 'unknown-round') {
        fixes.push('Tell the importer which round this is')
      }
    }
    if (!fixes.includes('Load the completed bracket')) fixes.push('Load the completed bracket for this weight')
    const tops = marks.map(m => m.top)
    const show = showDraw
      ? { weight: showDraw.weight, page: showDraw.page, x: showDraw.x, top: Math.max(0, (tops.length ? Math.min(...tops) : showDraw.tops[0] ?? 0) - 36), bottom: (tops.length ? Math.max(...tops) : (showDraw.tops[showDraw.tops.length - 1] ?? 400)) + 48 }
      : null
    items.push({ id: `${fl.weight}-${row.row}`, weight: fl.weight, kind: fl.kind, title: TITLE[fl.kind], reason: fl.reason, row, show, marks, hint, related, fixes, knockOn: null })
  }
  // knock-ons: a bout off the path because an earlier bout of one of its wrestlers is itself a problem (that
  // problem may sit under another weight, e.g. a quarterfinal listed under the wrong weight)
  for (const it of items) {
    if (it.kind !== 'off-path') continue
    const bracketWeight = it.show?.weight ?? it.weight
    const root = items.find(o => o !== it && (o.show?.weight ?? o.weight) === bracketWeight && rank(o.row) >= 0 && rank(o.row) < rank(it.row)
      && [it.row.winner, it.row.loser].some(n => hasWrestler(o.row, n)))
    if (root) {
      it.knockOn = root.id
      it.hint = `This follows from the ${root.row.round || 'earlier'} problem (row ${root.row.row}). Fix that one and this bout fits.`
      it.fixes = ['Nothing to do here once the earlier problem is fixed']
    }
  }
  items.sort((x, y) => x.weight - y.weight || x.row.row - y.row.row)
  return { fits, items, noDraw }
}
