// Brackets built from the bouts (Kyle 2026-11-20: "we have tbd as if the tournament didn't happen yet … we should
// have access to brackets from year to year"). The bracket slot table was filled for one tournament, half-way; every
// tournament's bouts carry their round and both wrestlers, so the bracket comes from them: the championship side is a
// tree — the final, then each finalist's previous championship bout under them, and so on back to the first round —
// and the consolation side is each consolation round in the order wrestled (src/lib/boutOrder.ts roundStep).
import { roundStep } from '@/lib/boutOrder'

export type BracketPerson = { id: string | null; name: string; school: string | null; schoolId: number | null; nj?: boolean; seed?: number | null }   // nj: an NJSIAA school's wrestler; seed: the tournament's seed at that weight
export type BracketBout = {
  id: string
  round: string
  top: BracketPerson | null
  bottom: BracketPerson | null
  /** 'top' / 'bottom' won */
  winner: 'top' | 'bottom' | null
  result: string
}
/** One championship column: the round's label and its bouts by position (null = no bout there, e.g. a bye) */
export type ChampColumn = { label: string; cells: (BracketBout | null)[] }
export type ConsColumn = { label: string; bouts: BracketBout[] }
/** complete: a single final with the tree hung from it. other: championship bouts the tree doesn't reach (an odd
 *  round label), listed so nothing disappears */
export type WeightBracket = { champ: ChampColumn[]; cons: ConsColumn[]; other: BracketBout[]; complete: boolean; source?: 'slots' | 'bouts' }   // source: how a postseason bracket was placed (src/lib/postseasonBracket.ts)

const ROUND_LABEL: Record<string, string> = {
  F: 'Final', SF: 'Semis', QF: 'Quarters', R1: 'Round 1', R2: 'Round 2', R3: 'Round 3', R4: 'Round 4', R5: 'Round 5',
  R16: 'Round of 16', R32: 'Round of 32', R64: 'Round of 64', R128: 'Round of 128',
  CQF: 'Cons. Quarters', 'Cons. Quarters': 'Cons. Quarters', CSF: 'Cons. Semis', 'Cons. Semis': 'Cons. Semis', CF: 'Cons. Final',
  '3rd_Place': '3rd Place', '5th_Place': '5th Place', '7th_Place': '7th Place', 'Cons._3rd': '3rd Place', PL: 'Placement',
}
export const roundLabel = (r: string) => ROUND_LABEL[r] ?? (/^C(\d+)$/.test(r) ? `Cons. Round ${r.slice(1)}` : r.replace(/_/g, ' '))

/** A bout's result as text: "Fall 1:23", "Dec 5-2", "MD 12-3", "TF 18-3", "Forf" */
export function resultText(type: string | null, secs: number | null, ws: number | null, ls: number | null): string {
  const t = (type ?? '').trim()
  const clock = secs != null ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : ''
  const score = ws != null && ls != null ? `${ws}-${ls}` : ''
  if (/^fall$/i.test(t)) return `Fall${clock ? ' ' + clock : ''}`
  if (/^tf/i.test(t)) return `TF${score ? ' ' + score : ''}${clock ? ' (' + clock + ')' : ''}`
  if (/^(md|maj)/i.test(t)) return `MD${score ? ' ' + score : ''}`
  if (/^dec/i.test(t)) return `Dec${score ? ' ' + score : ''}`
  if (/^(sv|tb|utb|ot)/i.test(t) || /^\d-?ot$/i.test(t)) return `${t.toUpperCase()}${score ? ' ' + score : ''}`
  if (/^(for|ff)/i.test(t)) return 'Forf'
  if (/^(mffl|mff)/i.test(t)) return 'Med Forf'
  if (/^inj/i.test(t)) return 'Inj'
  if (/^dq/i.test(t)) return 'DQ'
  if (/^bye/i.test(t)) return 'Bye'
  return t
}

const isChamp = (r: string) => roundStep(r) < 100
const personKey = (p: BracketPerson | null) => (p ? p.id ?? `${p.name}|${p.school ?? ''}` : '')

/** One weight's bracket from its bouts */
export function buildWeightBracket(bouts: BracketBout[]): WeightBracket {
  // the same bout stored twice (once per team's file) is one bout
  const seen = new Set<string>()
  const list = bouts.filter(b => {
    const k = `${b.round}|${[personKey(b.top), personKey(b.bottom)].sort().join('|')}`
    if (seen.has(k)) return false
    seen.add(k); return true
  })
  const champ = list.filter(b => isChamp(b.round) && b.round !== '2nd_Place_Match')
  const cons = list.filter(b => !isChamp(b.round))

  // each wrestler's championship bouts, earliest first
  const byPerson = new Map<string, BracketBout[]>()
  for (const b of champ) for (const p of [b.top, b.bottom]) if (p) { const k = personKey(p); (byPerson.get(k) ?? byPerson.set(k, []).get(k)!).push(b) }
  for (const v of byPerson.values()) v.sort((x, y) => roundStep(x.round) - roundStep(y.round))
  const previous = (p: BracketPerson | null, b: BracketBout): BracketBout | null => {
    if (!p) return null
    const mine = byPerson.get(personKey(p)) ?? []
    const before = mine.filter(x => roundStep(x.round) < roundStep(b.round))
    return before.length ? before[before.length - 1] : null
  }

  // the root: the final (else the latest championship round)
  const top = champ.length ? Math.max(...champ.map(b => roundStep(b.round))) : -1
  const roots = champ.filter(b => roundStep(b.round) === top)
  const champCols: ChampColumn[] = []
  if (roots.length === 1) {
    // depth: the longest path back from the final
    const depthOf = (b: BracketBout | null): number => (b ? 1 + Math.max(depthOf(previous(b.top, b)), depthOf(previous(b.bottom, b))) : 0)
    const depth = Math.min(depthOf(roots[0]), 7)
    const cols: (BracketBout | null)[][] = Array.from({ length: depth }, (_, c) => new Array(2 ** (depth - 1 - c)).fill(null))
    const place = (b: BracketBout | null, col: number, i: number) => {
      if (!b || col < 0) return
      cols[col][i] = b
      place(previous(b.top, b), col - 1, 2 * i)
      place(previous(b.bottom, b), col - 1, 2 * i + 1)
    }
    place(roots[0], depth - 1, 0)
    for (let c = 0; c < depth; c++) {
      const rounds = cols[c].filter(Boolean).map(b => b!.round)
      const common = rounds.sort((a, b2) => rounds.filter(x => x === b2).length - rounds.filter(x => x === a).length)[0]
      champCols.push({ label: common ? roundLabel(common) : '', cells: cols[c] })
    }
  } else if (champ.length) {
    // no single final to hang the tree from: each championship round as a column
    for (const r of [...new Set(champ.map(b => b.round))].sort((a, b) => roundStep(a) - roundStep(b))) {
      champCols.push({ label: roundLabel(r), cells: champ.filter(b => b.round === r) })
    }
  }
  const consCols: ConsColumn[] = [...new Set(cons.map(b => b.round))]
    .sort((a, b) => roundStep(a) - roundStep(b))
    .map(r => ({ label: roundLabel(r), bouts: cons.filter(b => b.round === r) }))
  const placed = new Set(champCols.flatMap(c => c.cells.filter(Boolean).map(b => b!.id)))
  const other = roots.length === 1 ? champ.filter(b => !placed.has(b.id)) : []
  return { champ: champCols, cons: consCols, other, complete: roots.length === 1 }
}

/** Whether a tournament's bouts make full brackets (Kyle 2026-11-21: "some tournaments have the brackets, some don't
 *  but if we have the brackets, we should be creating those to view"). An event loaded from NJ teams' results holds
 *  only our wrestlers' bouts: a weight falls apart into pieces, or is one of ours and the opponents they met once. A
 *  full bracket's weight is one connected group of wrestlers with championship-round bouts, most of them (40%+)
 *  wrestling more than once; most weights (three in four) must be. Finals aren't required — many NJ events' files
 *  leave rounds unlabeled. Only an out-of-state event is ever loaded that way; an NJ tournament's bouts are all loaded,
 *  so any championship-round bout gives it its bracket (small girls brackets of two or four wouldn't pass the test). */
export function fullBracket(bouts: { weight_class: string | number | null; round: string | null; wrestler1_id: string | null; wrestler2_id: string | null }[], outOfState: boolean): boolean {
  if (!outOfState) return bouts.some(b => /^(F|SF|QF|R\d+)$/.test((b.round ?? '').trim()))
  const byW = new Map<string, typeof bouts>()
  for (const b of bouts) { const w = String(b.weight_class ?? ''); if (w) (byW.get(w) ?? byW.set(w, []).get(w)!).push(b) }
  if (!byW.size) return false
  let ok = 0
  for (const list of byW.values()) {
    if (!list.some(b => /^(F|SF|QF|R\d+)$/.test((b.round ?? '').trim()))) continue
    const parent = new Map<string, string>(), n = new Map<string, number>()
    const find = (x: string): string => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x)!)!); x = parent.get(x)! } return x }
    for (const b of list) for (const id of [b.wrestler1_id, b.wrestler2_id]) if (id) { if (!parent.has(id)) parent.set(id, id); n.set(id, (n.get(id) ?? 0) + 1) }
    for (const b of list) if (b.wrestler1_id && b.wrestler2_id) { const a = find(b.wrestler1_id), c = find(b.wrestler2_id); if (a !== c) parent.set(a, c) }
    const again = [...n.values()].filter(v => v >= 2).length
    if (new Set([...parent.keys()].map(find)).size === 1 && again >= n.size * 0.4) ok++
  }
  return ok >= byW.size * 0.75
}
