// The review list for the bracket intake (2026-11-26). Step 2 (results): every bout must fit the draw; the ones that
// don't are listed and nothing is saved. Step 3 (completed brackets, asked for only then): every championship bout in
// the file is compared with the completed bracket — so a wrong winner or score is caught even where the draw alone
// can't see it (a final) — and each problem shows the bracket's own section beside it, with fixes that change the
// file's rows; the check then runs again. Used by the Aesthetic Tool's Import review tab (mock) and next by the hub.
import type { WeightDraw } from './flo'
import { fitWeight, norm, type FlagKind, type WeightFit } from './fit'
import { roundKind, type ResultRow } from './results'
import { sameResult, type BracketBout, type CompletedWeight } from './completed'

export type ReviewKind = FlagKind | 'disagree'
/** a box drawn on the PDF crop: the wrestlers' draw lines (red), the bracket's bout (green), a likely match (amber) */
export type Mark = { top: number; bottom: number; x0: number; x1: number; tone: 'red' | 'amber' | 'green'; label: string }
export type Fix = { label: string; apply: (rows: ResultRow[]) => void }
export type ReviewItem = {
  id: string
  weight: number                // the weight the file lists the bout under
  kind: ReviewKind
  title: string
  reason: string                // the importer's words
  row: ResultRow
  bracketShows: string | null   // the completed bracket's bout, when loaded
  show: { weight: number; page: number; top: number; bottom: number; source: 'bracket' | 'completed' } | null
  marks: Mark[]
  hint: string | null
  related: ResultRow[]
  fixes: Fix[]
  knockOn: string | null        // the id of the problem this one follows from (fix that and this fits)
}
export type IntakeReport = { fits: WeightFit[]; items: ReviewItem[]; placed: number; checked: number; noDraw: { weight: number; bouts: number }[] }

const TITLE: Record<ReviewKind, string> = {
  'bad-size': 'Bracket didn’t read cleanly',
  'not-on-bracket': 'Name not on the bracket',
  'unknown-round': 'Unknown round name',
  'wrong-round': 'Round name doesn’t match the bracket',
  'off-path': 'Result doesn’t follow the bracket',
  'rematch': 'Same two wrestlers twice: which was the championship bout?',
  'disagree': 'The completed bracket shows a different result',
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
const rank = (r: ResultRow) => RANK[roundKind(r.round)] ?? -1
const isChamp = (r: ResultRow) => rank(r) >= 0
const hasWrestler = (r: ResultRow, n: string) => norm(r.winner) === norm(n) || norm(r.loser) === norm(n)
const meet = (a: number, c: number) => 31 - Math.clz32(a ^ c)
/** the round's name for a championship level of a bracket with 2^D lines */
export function levelName(lvl: number, D: number) {
  return lvl === D - 1 ? 'Final' : lvl === D - 2 ? 'Semifinal' : lvl === D - 3 ? 'Quarterfinal' : lvl === 0 ? 'Champ. Round 1' : 'Champ. Round 2'
}
/** a labeled championship round → its level on a bracket with 2^D lines (null: not a championship label) */
function labelLevel(r: ResultRow, D: number): number | null {
  const k = roundKind(r.round)
  return k === 'F' ? D - 1 : k === 'SF' ? D - 2 : k === 'QF' ? D - 3 : k === 'EARLY2' ? (D === 5 ? 1 : 0) : k === 'EARLY1' ? 0 : null
}
const sameRow = (a: ResultRow, b: ResultRow) => a.row === b.row
const byRow = (rows: ResultRow[], r: ResultRow) => rows.find(x => sameRow(x, r))!
/** "DEC 6-5" → { winType: DEC, result: 6-5 } */
const splitResult = (s: string) => { const [t, ...rest] = s.trim().split(/\s+/); return { winType: (t ?? '').toUpperCase(), result: rest.join(' ') } }

export function reviewIntake(draws: WeightDraw[], rows: ResultRow[], completed?: { weights: CompletedWeight[]; draws: WeightDraw[] }): IntakeReport {
  const byWeight = new Map(draws.map(d => [d.weight, d]))
  const fits = draws.map(d => fitWeight(d, rows.filter(r => r.weight === d.weight)))
  const items: ReviewItem[] = []
  const noDraw = [...new Set(rows.map(r => r.weight))].filter(w => !byWeight.has(w)).map(w => ({ weight: w, bouts: rows.filter(r => r.weight === w).length }))
  const compOf = (w: number) => completed?.weights.find(c => c.weight === w)
  const compDrawOf = (w: number) => completed?.draws.find(d => d.weight === w)
  const boxFor = (w: number, a: number, c: number): BracketBout | undefined => {
    const lvl = meet(a, c)
    return compOf(w)?.bouts.find(b => b.level === lvl && b.block === a >> (lvl + 1))
  }
  const boxText = (d: WeightDraw, b: BracketBout) => {
    if (b.winner == null) return `${b.names.join(' v ')}: no winner readable${b.result ? ` (${b.result})` : ''}`
    const loser = b.lines[0] === b.winner ? b.lines[1] : b.lines[0]
    return `${d.lines[b.winner]!.name} over ${loser != null ? d.lines[loser]!.name : '?'}${b.result ? ` · ${b.result}` : ''}`
  }
  let checked = 0

  type Base = { row: ResultRow; weight: number; kind: ReviewKind; reason: string; lines?: [number | null, number | null] }
  const flagged: Base[] = [
    ...fits.flatMap(f => f.flags.map(fl => ({ ...fl, weight: f.weight }))),
    ...rows.filter(r => !byWeight.has(r.weight)).map(row => ({ row, weight: row.weight, kind: 'not-on-bracket' as const, reason: `There's no ${row.weight} bracket in the PDF.`, lines: [null, null] as [number | null, number | null] })),
  ]
  // step 3: every championship bout that fit is checked against the completed bracket
  if (completed) for (const f of fits) {
    const d = byWeight.get(f.weight)!
    for (const p of f.placed.filter(p => p.side === 'champ')) {
      const [a, c] = p.lines, box = boxFor(f.weight, a, c)
      if (!box || box.winner == null) continue
      checked++
      if (box.winner !== a) flagged.push({ row: p.row, weight: f.weight, kind: 'disagree', reason: `The file has ${p.row.winner} winning. The completed bracket has ${d.lines[box.winner]!.name} winning (${box.result || 'no result printed'}).`, lines: [a, c] })
      else if (!sameResult(p.row.winType, p.row.result, box.result)) flagged.push({ row: p.row, weight: f.weight, kind: 'disagree', reason: `The file has ${p.row.winType} ${p.row.result}. The completed bracket has ${box.result}.`, lines: [a, c] })
    }
  }
  const seenRematch = new Set<string>()
  for (const fl of flagged) {
    const { row } = fl
    const draw = byWeight.get(fl.weight)
    const cdraw = compDrawOf(fl.weight)
    const marks: Mark[] = []
    const related: ResultRow[] = []
    let hint: string | null = null, bracketShows: string | null = null, reason = fl.reason
    let showDraw: WeightDraw | null = draw ?? null
    const fixes: Fix[] = []
    // marks go on the completed bracket when it's loaded (its first column is the same draw), else on the blank one
    const markLine = (w: number, line: number, tone: Mark['tone'], label: string) => {
      const d = compDrawOf(w) ?? byWeight.get(w)
      if (!d) return
      const top = d.tops[line] ?? 0
      marks.push({ top: top - 3, bottom: top + 11, x0: d.x - 5, x1: d.x + 122, tone, label: `line ${line + 1} · ${label}` })
    }
    const markBox = (b: BracketBout, label: string) => marks.push({ top: b.tops[0] - 3, bottom: b.tops[1] + 22, x0: b.x - 5, x1: b.x + 118, tone: 'green', label })
    const D = draw ? Math.log2(draw.lines.length) : 0

    if (fl.kind === 'not-on-bracket') {
      const [a, c] = fl.lines ?? [null, null]
      const elsewhere = draws.find(d => d.weight !== fl.weight && linesOf(d, row.winner).length === 1 && linesOf(d, row.loser).length === 1)
      if (elsewhere) {
        showDraw = elsewhere
        const la = linesOf(elsewhere, row.winner)[0], lc = linesOf(elsewhere, row.loser)[0]
        markLine(elsewhere.weight, la, 'amber', row.winner)
        markLine(elsewhere.weight, lc, 'amber', row.loser)
        const box = completed ? boxFor(elsewhere.weight, la, lc) : undefined
        if (box) { markBox(box, 'the completed bracket'); bracketShows = boxText(compDrawOf(elsewhere.weight) ?? elsewhere, box) }
        hint = `Both wrestlers are on the ${elsewhere.weight} bracket${box ? ', and the completed bracket shows this bout there' : ''}. The file lists it under the wrong weight.`
        fixes.push({ label: `Move this bout to ${elsewhere.weight}`, apply: rs => { byRow(rs, row).weight = elsewhere.weight } })
      } else if (draw) {
        const known = a ?? c, missing = a == null ? row.winner : row.loser
        if (a != null) markLine(fl.weight, a, 'red', row.winner)
        if (c != null) markLine(fl.weight, c, 'red', row.loser)
        if (a == null && c == null) hint = `Neither ${row.winner} nor ${row.loser} is on the ${fl.weight} bracket.`
        else {
          // who the bracket has there: the completed bracket's bout for the known wrestler with this result, else the
          // closest spelling on the draw
          let pickLine: number | null = null, why = ''
          const comp = compOf(fl.weight)
          if (comp && known != null) {
            const lvlWant = labelLevel(row, D)
            const cands = comp.bouts.filter(b => b.lines.includes(known) && b.winner != null && (lvlWant == null || b.level === lvlWant)
              && (b.winner === known) === (a === known) && sameResult(row.winType, row.result, b.result))
            if (cands.length === 1) {
              const b = cands[0], o = b.lines[0] === known ? b.lines[1] : b.lines[0]
              if (o != null) { pickLine = o; why = 'the completed bracket has them in this bout, with this result'; markBox(b, 'the completed bracket'); bracketShows = boxText(cdraw ?? draw, b) }
            }
          }
          if (pickLine == null) {
            const best = draw.lines.map((l, i) => ({ i, l, s: l ? similar(l.name, missing) : 0 })).sort((x, y) => y.s - x.s)[0]
            if (best?.l && best.s >= 0.6) { pickLine = best.i; why = 'the closest spelling on the bracket' }
          }
          if (pickLine != null) {
            const name = draw.lines[pickLine]!.name
            markLine(fl.weight, pickLine, 'amber', `${name}?`)
            hint = `“${missing}” is most likely ${name} (${draw.lines[pickLine]!.code}, line ${pickLine + 1}): ${why}.`
            fixes.push({ label: `“${missing}” is ${name}`, apply: rs => { for (const r of rs) if (r.weight === fl.weight) { if (norm(r.winner) === norm(missing)) r.winner = name; if (norm(r.loser) === norm(missing)) r.loser = name } } })
          } else hint = `No one on the ${fl.weight} bracket is close to “${missing}”.`
        }
      }
    } else if (draw && fl.lines && fl.lines[0] != null && fl.lines[1] != null) {
      const [a, c] = fl.lines as [number, number]
      const lvl = meet(a, c)
      markLine(fl.weight, a, 'red', row.winner)
      markLine(fl.weight, c, 'red', row.loser)
      const box = completed ? boxFor(fl.weight, a, c) : undefined
      const boxHasPair = !!box && box.lines.includes(a) && box.lines.includes(c)
      if (box) { markBox(box, 'the completed bracket'); bracketShows = boxText(cdraw ?? draw, box) }
      if (fl.kind === 'disagree' && box && box.winner != null) {
        const { winType, result } = splitResult(box.result)
        hint = 'The completed bracket is the record of what was wrestled. Use its result unless you know it’s wrong.'
        fixes.push({ label: 'Use the bracket’s result', apply: rs => {
          // change only what disagrees: a swapped winner keeps the file's fuller score ("6-5 TB1" where the bracket
          // prints "DEC TB1") unless the score itself disagrees too
          const r = byRow(rs, row)
          if (box.winner !== a) { [r.winner, r.loser] = [r.loser, r.winner]; [r.winnerTeam, r.loserTeam] = [r.loserTeam, r.winnerTeam] }
          if (winType && !sameResult(r.winType, r.result, box.result)) { r.winType = winType; r.result = result }
        } })
      } else if (fl.kind === 'rematch') {
        const pairKey = (r: ResultRow) => [r.winner, r.loser].map(norm).sort().join('|')
        const key = `${fl.weight}|${pairKey(row)}`
        if (seenRematch.has(key)) continue                                  // one item per pair
        seenRematch.add(key)
        const pair = rows.filter(r => r.weight === fl.weight && pairKey(r) === pairKey(row))
        related.push(...pair.filter(r => !sameRow(r, row)))
        const champName = levelName(lvl, D)
        reason = `${row.winner} and ${row.loser} wrestled each other ${pair.length} times, and the file doesn’t name the rounds. It can’t tell which result was the ${champName.toLowerCase()} and which was the wrestleback.`
        const setChamp = (champ: ResultRow) => (rs: ResultRow[]) => { for (const p of pair) byRow(rs, p).round = sameRow(p, champ) ? champName : 'Cons.' }
        const match = box && box.winner != null ? pair.filter(p => sameResult(p.winType, p.result, box.result) && linesOf(draw, p.winner)[0] === box.winner) : []
        if (match.length === 1) {
          hint = `The completed bracket’s ${champName.toLowerCase()} is ${box!.result}, so that bout was the ${champName.toLowerCase()} and the other was the wrestleback.`
          fixes.push({ label: `The ${match[0].winType} ${match[0].result} bout was the ${champName.toLowerCase()}`, apply: setChamp(match[0]) })
        } else {
          hint = completed ? 'The completed bracket doesn’t settle it. Pick the bout that was the championship bout.' : 'The completed bracket will settle this.'
          if (completed) for (const p of pair) fixes.push({ label: `The ${p.winType} ${p.result} bout was the ${champName.toLowerCase()}`, apply: setChamp(p) })
        }
      } else if (fl.kind === 'off-path') {
        const same = rows.filter(r => !sameRow(r, row) && r.weight === row.weight && isChamp(r) && [row.winner, row.loser].some(n => hasWrestler(r, n)))
        related.push(...same)
        const lostBefore = [row.winner, row.loser].map(n => ({ n, r: same.find(r => norm(r.loser) === norm(n) && rank(r) >= 0 && rank(r) < rank(row)) })).filter(x => x.r)
        if (boxHasPair && box!.winner === a && sameResult(row.winType, row.result, box!.result)) hint = 'The completed bracket agrees with this bout. The problem is in an earlier round.'
        else if (lostBefore.length) hint = lostBefore.map(x => `The file also says ${x.n} lost earlier on the championship side (${x.r!.round}: ${x.r!.winner} over ${x.r!.loser}), yet ${x.n} wrestles this ${row.round || 'bout'}. One of the two results is wrong.`).join(' ')
        else hint = 'The two wrestlers don’t both reach this round by the results before it.'
      } else if (fl.kind === 'wrong-round' || fl.kind === 'unknown-round') {
        const name = levelName(lvl, D)
        hint = `By their lines (${a + 1} and ${c + 1}), these two can only meet in the ${name.toLowerCase()} on the championship side${boxHasPair ? ', and the completed bracket has them there' : ''}.`
        fixes.push({ label: `It was the ${name.toLowerCase()}`, apply: rs => { byRow(rs, row).round = name } })
        if (fl.kind === 'unknown-round') fixes.push({ label: 'It was a wrestleback', apply: rs => { byRow(rs, row).round = 'Cons.' } })
      }
    }
    const tops = marks.map(m => m.top), bottoms = marks.map(m => m.bottom)
    const src = showDraw ? (compDrawOf(showDraw.weight) ?? showDraw) : null
    const show = src && showDraw
      ? { weight: showDraw.weight, page: src.page, source: (compDrawOf(showDraw.weight) ? 'completed' : 'bracket') as 'completed' | 'bracket', top: Math.max(0, (tops.length ? Math.min(...tops) : src.tops[0] ?? 0) - 30), bottom: (bottoms.length ? Math.max(...bottoms) : (src.tops[src.tops.length - 1] ?? 400)) + 30 }
      : null
    items.push({ id: `${fl.kind}-${fl.weight}-${row.row}`, weight: fl.weight, kind: fl.kind, title: TITLE[fl.kind], reason, row, bracketShows, show, marks, hint, related, fixes, knockOn: null })
  }
  // knock-ons: a bout off the path because another problem involves one of its wrestlers earlier (that problem may
  // sit under another weight, e.g. a quarterfinal listed under the wrong weight)
  for (const it of items) {
    if (it.kind !== 'off-path') continue
    const w = it.show?.weight ?? it.weight
    const involves = (o: ReviewItem) => o !== it && (o.show?.weight ?? o.weight) === w && [it.row.winner, it.row.loser].some(n => hasWrestler(o.row, n))
    const root = items.find(o => involves(o) && o.kind !== 'off-path') ?? items.find(o => involves(o) && rank(o.row) >= 0 && rank(o.row) < rank(it.row))
    if (root) {
      it.knockOn = root.id
      it.hint = `This follows from the problem with row ${root.row.row} (${root.row.round || 'no round'}: ${root.row.winner} over ${root.row.loser}). Fix that one and this bout fits.`
      it.fixes = []
    }
  }
  // chains: point every knock-on at the first problem in its chain
  for (const it of items) {
    let r = it.knockOn
    const seen = new Set<string>()
    while (r && !seen.has(r)) { seen.add(r); const nx = items.find(o => o.id === r)?.knockOn; if (!nx) break; r = nx }
    if (it.knockOn && r) it.knockOn = r
  }
  items.sort((x, y) => x.weight - y.weight || x.row.row - y.row.row)
  const placed = fits.reduce((n, f) => n + f.placed.length, 0)
  return { fits, items, placed, checked, noDraw }
}
