// The bracket as the import fills it (Kyle 2026-11-26: "empty bracket fills the names in, csv moves those names along
// as the record shows and with each step, if there is an issue, it will be in red and we can fix"). One weight:
// the draw's names in the first round; each result that fits moves its winner into the next box; a box with a problem
// is red (amber when it only follows from another one); a box set by hand is blue; two known wrestlers with no bout in
// the file is a dashed box. The result is the site's own bracket shape (WeightBracket → SplitBracket).
import type { BracketBout as SiteBout, BracketPerson, WeightBracket } from '@/lib/boutBracket'
import { roundLabel } from '@/lib/boutBracket'
import type { BoutMark } from '@/components/bracket/SplitBracket'
import type { WeightDraw } from './flo'
import type { WeightFit } from './fit'
import type { ResultRow } from './results'
import type { BracketBout as PdfBout, CompletedWeight } from './completed'
import { levelName, meet, type ReviewItem } from './review'

export type Cell = {
  id: string
  weight: number
  level: number
  block: number
  sides: [number | null, number | null]   // the draw lines of the two wrestlers in the box (top, bottom), when known
  row: ResultRow | null                    // the file's bout for this box
  items: ReviewItem[]                      // problems in this box
  box: PdfBout | null                      // the completed bracket's bout here
}
export type IntakeBracket = { bracket: WeightBracket; status: Record<string, BoutMark>; cells: Map<string, Cell>; consRows: Map<string, ResultRow> }

/** a Flo consolation label → the site's round code (src/lib/boutOrder.ts), so the consolation tree can be drawn */
export function consCode(label: string): string {
  if (/3rd/i.test(label)) return '3rd_Place'
  if (/5th/i.test(label)) return '5th_Place'
  if (/7th/i.test(label)) return '7th_Place'
  if (/semi/i.test(label)) return 'CSF'
  if (/quarter/i.test(label)) return 'CQF'
  const n = /(\d+)/.exec(label)
  return n ? `C${n[1]}` : 'C9'
}

export function buildIntakeBracket(
  draw: WeightDraw, fit: WeightFit | null, items: ReviewItem[], completed: CompletedWeight | null, manual: Set<number>,
): IntakeBracket {
  const D = Math.log2(draw.lines.length)
  const cells = new Map<string, Cell>()
  const status: Record<string, BoutMark> = {}
  const person = (l: number | null): BracketPerson | null => {
    const x = l == null ? null : draw.lines[l]
    return x ? { id: null, name: x.name, school: x.code, schoolId: null, seed: x.seed } : null
  }
  // the file's championship bouts, by box
  const rowAt = new Map<string, { row: ResultRow; win: number; lose: number }>()
  for (const p of fit?.placed ?? []) if (p.side === 'champ') {
    const [a, c] = p.lines, lvl = meet(a, c)
    rowAt.set(`${lvl}:${a >> (lvl + 1)}`, { row: p.row, win: a, lose: c })
  }
  const itemsAt = new Map<string, ReviewItem[]>()
  for (const it of items) if (it.slot && it.slot.weight === draw.weight) {
    const k = `${it.slot.level}:${it.slot.block}`
    itemsAt.set(k, [...(itemsAt.get(k) ?? []), it])
  }
  // who advances out of each box: the winner of its bout, or the lone wrestler past a bye
  const adv = new Map<string, number | null | undefined>()
  const advance = (lvl: number, block: number): number | null | undefined => {
    const k = `${lvl}:${block}`
    if (adv.has(k)) return adv.get(k)
    const [x, y] = sidesOf(lvl, block)
    let r: number | null | undefined
    if (x === null && y === null) r = null
    else if (x === null || y === null) r = (x ?? y) === undefined ? undefined : (x ?? y)         // a bye
    else r = rowAt.get(k)?.win
    adv.set(k, r)
    return r
  }
  const sidesOf = (lvl: number, block: number): [number | null | undefined, number | null | undefined] =>
    lvl === 0 ? [draw.lines[2 * block] ? 2 * block : null, draw.lines[2 * block + 1] ? 2 * block + 1 : null] : [advance(lvl - 1, 2 * block), advance(lvl - 1, 2 * block + 1)]
  const topHalf = (line: number, lvl: number) => ((line >> lvl) & 1) === 0

  const champ = Array.from({ length: D }, (_, lvl) => ({ label: lvl === D - 1 ? 'Final' : roundLabel(levelName(lvl, D) === 'Semifinal' ? 'SF' : levelName(lvl, D) === 'Quarterfinal' ? 'QF' : `R${lvl + 1}`), cells: new Array<SiteBout | null>(2 ** (D - 1 - lvl)).fill(null) }))
  for (let lvl = 0; lvl < D; lvl++) for (let block = 0; block < 2 ** (D - 1 - lvl); block++) {
    const k = `${lvl}:${block}`, id = `c-${draw.weight}-${k}`
    const here = itemsAt.get(k) ?? []
    let [top, bottom] = sidesOf(lvl, block)
    // the file's bout, or a problem, names the box's wrestlers even where the bouts before it can't (one of them is red)
    const placed0 = rowAt.get(k)
    for (const l of [...(placed0 ? [placed0.win, placed0.lose] : []), ...here.flatMap(it => it.slotLines)]) if (l != null) { if (topHalf(l, lvl)) top ??= l; else bottom ??= l }
    if (lvl === 0 && (top == null || bottom == null)) continue                                    // a bye: no bout
    const placed = rowAt.get(k)
    // of the problems in this box, the bout filed under this weight comes first; a misfiled one only when there's no other
    const lead = here.find(i => i.row.weight === draw.weight) ?? here[0] ?? null
    const row = placed?.row ?? lead?.row ?? null
    const box = completed?.bouts.find(b => b.level === lvl && b.block === block) ?? null
    if (top == null || bottom == null) { if (!here.length) continue }
    const t = top ?? null, b = bottom ?? null
    cells.set(id, { id, weight: draw.weight, level: lvl, block, sides: [t, b], row, items: here, box })
    // a bout the file has under another weight isn't in this weight's results: the box shows who should wrestle here,
    // never that bout's winner or score (Kyle 2026-11-26: "if it was in the 175, than the 165 result for that bout
    // wouldn't even show")
    const filedHere = !row || row.weight === draw.weight
    const winLine = placed ? placed.win : filedHere ? lead?.slotLines[0] ?? null : null
    champ[lvl].cells[block] = {
      id, round: lvl === D - 1 ? 'F' : `R${lvl + 1}`, top: person(t), bottom: person(b),
      winner: winLine != null && winLine === t ? 'top' : winLine != null && winLine === b ? 'bottom' : null,
      result: row && filedHere ? `${row.winType} ${row.result}`.trim() : '',
    }
    if (here.some(i => !i.knockOn)) status[id] = 'problem'
    else if (here.length) status[id] = 'follows'
    else if (placed) status[id] = manual.has(placed.row.row) ? 'manual' : 'ok'
    else if (fit) status[id] = 'missing'
  }
  // consolation bouts that fit, by round
  const consRows = new Map<string, ResultRow>()
  const consBouts: SiteBout[] = []
  for (const p of fit?.placed ?? []) if (p.side === 'cons') {
    const id = `r-${draw.weight}-${p.row.row}`
    consRows.set(id, p.row)
    consBouts.push({ id, round: consCode(p.row.round), top: person(p.lines[0]), bottom: person(p.lines[1]), winner: 'top', result: `${p.row.winType} ${p.row.result}`.trim() })
    status[id] = manual.has(p.row.row) ? 'manual' : 'ok'
  }
  const codes = [...new Set(consBouts.map(b => b.round))]
  const order = (c: string) => (/^C(\d+)$/.test(c) ? Number(c.slice(1)) : c === 'CQF' ? 20 : c === 'CSF' ? 21 : 30)
  const cons = codes.sort((a, b) => order(a) - order(b)).map(c => ({ label: roundLabel(c), bouts: consBouts.filter(b => b.round === c) }))
  return { bracket: { champ, cons, other: [], complete: true }, status, cells, consRows }
}
