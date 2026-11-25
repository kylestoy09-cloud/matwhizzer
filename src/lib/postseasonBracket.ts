// Postseason brackets (districts, regions, state) in the site's standard bracket format (Kyle 2026-11-25: "convert
// every bracket to this and have this be the standard format moving forward"). The in-season builder hangs the tree
// from the final (src/lib/boutBracket.ts), so it can't draw a bracket that is still being wrestled. NJSIAA brackets are
// fixed by seed slot (src/lib/bracketOrder.ts), so here each bout sits by its wrestlers' slots: a round-k bout (k = 0
// for the first column) holding slot s is cell floor(s / 2^(k+1)). Bouts not wrestled yet leave empty cells, which the
// bracket draws as empty cards. If a weight's slots can't place every bout (a missing seed, two bouts in one cell) the
// bracket falls back to the in-season builder, so nothing goes missing.
import { resultText, roundLabel, type BracketBout, type BracketPerson, type WeightBracket } from '@/lib/boutBracket'
import { orderChampMatchesBySeed } from '@/lib/bracketOrder'
import { roundStep } from '@/lib/boutOrder'

export type PostseasonMatch = {
  match_id: string
  round: string
  bracket_side?: string | null
  win_type: string | null
  winner_score: number | null
  loser_score: number | null
  fall_time_seconds: number | null
  winner_entry_id: string | null
  winner_wrestler_id: string | null
  winner_name: string | null
  winner_school_name: string | null
  winner_school_id?: number | null
  winner_seed: number | null
  loser_entry_id: string | null
  loser_wrestler_id: string | null
  loser_name: string | null
  loser_school_name: string | null
  loser_school_id?: number | null
  loser_seed: number | null
}

// a side with an entry but no name (no profile matched) still wrestled: "Unknown"; an unresolved school is 'TBD'
// (raw imported names never show on the site)
const person = (m: PostseasonMatch, side: 'winner' | 'loser'): BracketPerson | null => {
  const w = side === 'winner'
  const name = w ? m.winner_name : m.loser_name, entry = w ? m.winner_entry_id : m.loser_entry_id
  if (!name && !entry) return null
  const schoolId = (w ? m.winner_school_id : m.loser_school_id) ?? null
  return {
    id: w ? m.winner_wrestler_id : m.loser_wrestler_id, name: name ?? 'Unknown',
    school: schoolId != null ? (w ? m.winner_school_name : m.loser_school_name) ?? 'TBD' : 'TBD', schoolId,
    nj: true, seed: w ? m.winner_seed : m.loser_seed,
  }
}

/** a stored bout as a bracket bout; top = the wrestler from the lower slot (else the winner) */
const toBout = (m: PostseasonMatch, slot?: (entry: string | null) => number): BracketBout => {
  const w = person(m, 'winner'), l = person(m, 'loser')
  const winnerTop = !slot || slot(m.winner_entry_id) <= slot(m.loser_entry_id)
  return {
    id: m.match_id, round: m.round,
    top: winnerTop ? w : l, bottom: winnerTop ? l : w,
    winner: m.win_type && /^bye/i.test(m.win_type) ? null : winnerTop ? 'top' : 'bottom',
    result: resultText(m.win_type, m.fall_time_seconds, m.winner_score, m.loser_score),
  }
}

const FROM_END: Record<string, number> = { F: 1, SF: 2, QF: 3 }

/** One postseason weight's bracket. size: the bracket's slots (32 for boys state, 16 for the rest). prelims: the
 *  first round is a prelim round (districts, regions), labeled "Prelims". */
export function buildPostseasonBracket(matches: PostseasonMatch[], size: 32 | 16, opts: { prelims?: boolean } = {}): WeightBracket {
  // a bye (round BYE, a BYE result, or no opponent at all — a forfeit to an empty side) is not a bout
  const isBye = (m: PostseasonMatch) => m.round === 'BYE' || /^bye/i.test(m.win_type ?? '') || (!m.loser_name && !m.loser_entry_id) || (!m.winner_name && !m.winner_entry_id)
  // the same bout stored twice is one bout
  const seen = new Set<string>()
  const real = matches.filter(m => {
    if (isBye(m)) return false
    const k = `${m.round}|${[m.winner_entry_id ?? m.winner_name, m.loser_entry_id ?? m.loser_name].sort().join('|')}`
    if (seen.has(k)) return false
    seen.add(k); return true
  })
  // championship vs consolation: the stored side; the round label only when no side is stored. A 2nd place bout is a
  // consolation-side bout here (it isn't part of the championship tree)
  const isChamp = (m: PostseasonMatch) => m.round !== '2nd_Place_Match' && (m.bracket_side ? m.bracket_side === 'championship' : roundStep(m.round) < 100)
  const champ = real.filter(isChamp)
  const cons = real.filter(m => !isChamp(m))
  const { entrySlot } = orderChampMatchesBySeed(champ as (PostseasonMatch & { [k: string]: unknown })[], size)
  const slot = (e: string | null) => (e != null ? entrySlot.get(e) ?? 999 : 999)

  // the last numbered consolation round before a 3rd place bout is the consolation semifinal (C3 in regions and girls
  // districts, C4 girls state, C6 boys state)
  const lastC = Math.max(-1, ...cons.map(m => /^C(\d+)$/.exec(m.round)).filter(Boolean).map(x => Number(x![1])))
  const consLabel = (r: string) => (lastC > 0 && r === `C${lastC}` && cons.some(m => m.round === '3rd_Place') ? 'Cons. Semis' : roundLabel(r))
  const consCols = [...new Set(cons.map(m => m.round))]
    .sort((a, b) => roundStep(a) - roundStep(b))
    .map(r => ({ label: consLabel(r), bouts: cons.filter(m => m.round === r).map(m => toBout(m)) }))
  const champLabel = (r: string) => (opts.prelims && (r === 'R1' || r === 'R2') ? 'Prelims' : roundLabel(r))
  const fallback = () => ({ ...treeFromBouts(champ.map(m => toBout(m)), size, consCols, champLabel), source: 'bouts' as const })

  // columns: F, SF, QF from the end; before them R1 → R2 in a 32-slot bracket, and R1 or R2 (the prelims) in a
  // 16-slot one (girls state stores R1, districts and regions R2). Any other round label → the in-season builder.
  const D = Math.log2(size)
  const EARLY: Record<string, number> = size === 32 ? { R1: 0, R2: 1 } : { R1: 0, R2: 0 }
  const rounds = new Set(champ.map(m => m.round))
  if ([...rounds].some(r => !(r in FROM_END) && !(r in EARLY)) || (size === 16 && rounds.has('R1') && rounds.has('R2'))) return fallback()
  const colOf = (r: string) => (r in FROM_END ? D - FROM_END[r] : EARLY[r])
  const cols: (BracketBout | null)[][] = Array.from({ length: D }, (_, k) => new Array(size / 2 ** (k + 1)).fill(null))
  const labels: string[] = Array.from({ length: D }, () => '')
  for (const m of champ) {
    const k = colOf(m.round), sw = slot(m.winner_entry_id), sl = slot(m.loser_entry_id), s = Math.min(sw, sl)
    if (Math.max(sw, sl) >= size) return fallback()
    const i = Math.floor(s / 2 ** (k + 1))
    // both wrestlers' slots must lead to this bout (else the bracket isn't drawn by these seed slots)
    if (Math.floor(Math.max(sw, sl) / 2 ** (k + 1)) !== i) return fallback()
    if (cols[k][i]) return fallback()
    cols[k][i] = toBout(m, slot)
    labels[k] = champLabel(m.round)
  }
  // the slots must agree with who wrestled whom: a wrestler's previous championship bout sits right under this one
  const where = new Map<string, [number, number]>()
  cols.forEach((c, k) => c.forEach((b, i) => { if (b) where.set(b.id, [k, i]) }))
  const byEntry = new Map<string, PostseasonMatch[]>()
  for (const m of champ) for (const e of [m.winner_entry_id, m.loser_entry_id]) if (e) (byEntry.get(e) ?? byEntry.set(e, []).get(e)!).push(m)
  for (const m of champ) {
    const [k, i] = where.get(m.match_id)!
    for (const e of [m.winner_entry_id, m.loser_entry_id]) {
      const before = (e ? byEntry.get(e) ?? [] : []).filter(x => roundStep(x.round) < roundStep(m.round)).sort((x, y) => roundStep(x.round) - roundStep(y.round)).pop()
      if (!before) continue
      const [pk, pi] = where.get(before.match_id)!
      if (pk >= k || Math.floor(pi / 2 ** (k - pk)) !== i) return fallback()
    }
  }
  // a column for each round that has bouts, from the first one on (an 8-man district starts at the quarterfinals)
  const first = cols.findIndex(c => c.some(Boolean))
  if (first < 0) return { champ: [], cons: consCols, other: [], complete: false }
  const fallbackLabel = (k: number) => ['Final', 'Semis', 'Quarters'][D - 1 - k] ?? ''
  return {
    champ: cols.slice(first).map((cells, j) => ({ label: labels[first + j] || fallbackLabel(first + j), cells })),
    cons: consCols, other: [], complete: true, source: 'slots',
  }
}

/** A bracket whose bouts don't sit in the standard seed slots (boys regions place by district finish; older seasons
 *  have no seeds): the tree comes from who wrestled whom — each bout's two wrestlers' previous championship bouts under
 *  it. At each bout the side holding the better seed goes on top. Bouts still to be wrestled (no final yet) become
 *  empty places: the latest bouts are paired in seed order up to the final. */
function treeFromBouts(champ: BracketBout[], size: 32 | 16, cons: WeightBracket['cons'], champLabel: (r: string) => string = roundLabel): WeightBracket {
  // no tree possible: every championship bout listed (none dropped)
  const empty: WeightBracket = { champ: [], cons, other: champ, complete: false }
  if (!champ.length) return empty
  const key = (p: BracketPerson | null) => (p ? p.id ?? `${p.name}|${p.school ?? ''}` : '')
  const mine = new Map<string, BracketBout[]>()
  for (const b of champ) for (const p of [b.top, b.bottom]) if (p) (mine.get(key(p)) ?? mine.set(key(p), []).get(key(p))!).push(b)
  const prev = (p: BracketPerson | null, b: BracketBout) => {
    const xs = (p ? mine.get(key(p)) ?? [] : []).filter(x => roundStep(x.round) < roundStep(b.round)).sort((x, y) => roundStep(x.round) - roundStep(y.round))
    return xs.length ? xs[xs.length - 1] : null
  }
  const next = (p: BracketPerson | null, b: BracketBout) => (p ? (mine.get(key(p)) ?? []).some(x => roundStep(x.round) > roundStep(b.round)) : false)
  // columns by round: the rounds wrestled, earliest first, then the ones still to come (… QF, SF, F)
  const wrestled = [...new Set(champ.map(b => b.round))].sort((a, b) => roundStep(a) - roundStep(b))
  const toCome = ['QF', 'SF', 'F'].filter(r => !wrestled.includes(r) && roundStep(r) > roundStep(wrestled[wrestled.length - 1]))
  const order = [...wrestled, ...toCome]
  // as many columns as the bracket's slots need, or more when more rounds were wrestled (2024-25 girls regions:
  // prelims, then a round of 16)
  const D = Math.max(Math.log2(size), order.length)
  const colOf = (r: string) => order.indexOf(r) + (D - order.length)
  type N = { b: BracketBout | null; col: number; kids: (N | null)[]; best: number }
  const seedOf = (p: BracketPerson | null) => p?.seed ?? 99
  const build = (b: BracketBout, depth = 0): N => {
    const kids = [b.top, b.bottom].map(p => { const x = depth < 8 ? prev(p, b) : null; return x ? build(x, depth + 1) : null })
    const sideBest = [0, 1].map(j => Math.min(kids[j]?.best ?? 99, seedOf(j ? b.bottom : b.top)))
    let bout = b
    if (sideBest[1] < sideBest[0]) { bout = { ...b, top: b.bottom, bottom: b.top, winner: b.winner === 'top' ? 'bottom' : b.winner === 'bottom' ? 'top' : null }; kids.reverse() }
    return { b: bout, col: colOf(b.round), kids, best: Math.min(...sideBest) }
  }
  // the latest bouts: the ones whose winner has no later championship bout (the final, or the last round wrestled)
  let roots: N[] = champ.filter(b => !next(b.winner === 'bottom' ? b.bottom : b.top, b)).map(b => build(b))
  // with a final wrestled, the final's tree is the bracket; bouts that don't link into it (a name spelled two ways
  // across rounds) are listed under the bracket instead of being dropped
  let other: BracketBout[] = []
  const finals = roots.filter(r => r.b && r.b.round === 'F')
  if (finals.length === 1) {
    const inTree = new Set<string>()
    const walk = (n: N | null) => { if (!n) return; if (n.b) inTree.add(n.b.id); n.kids.forEach(walk) }
    walk(finals[0])
    other = champ.filter(b => !inTree.has(b.id))
    roots = finals
  }
  // still being wrestled: pair the latest bouts in seed order, an empty place above each pair, up to the final
  const merge = (rs: N[]): N | null => {
    for (let guard = 0; guard < 12 && !(rs.length === 1 && rs[0].col === D - 1); guard++) {
      const low = Math.min(...rs.map(r => r.col))
      if (low >= D - 1) return null
      const at = rs.filter(r => r.col === low).sort((a, b) => a.best - b.best), rest = rs.filter(r => r.col !== low)
      const ups: N[] = []
      // best against worst, as a bracket draws them (1 v 4, 2 v 3 in the semis): the outside pairs first
      for (let j = 0, z = at.length - 1; j <= z; j++, z--) ups.push({ b: null, col: low + 1, kids: [at[j], j < z ? at[z] : null], best: at[j].best })
      rs = [...rest, ...ups]
    }
    return rs.length === 1 && rs[0].col === D - 1 ? rs[0] : null
  }
  let root = merge(roots)
  if (!root) {
    // a stray piece (a name spelled two ways) can't fit: the bracket is the furthest-along bouts, the rest listed
    const top = Math.max(...roots.map(r => r.col))
    const keep = roots.filter(r => r.col === top)
    const inKeep = new Set<string>()
    const walk = (n: N | null) => { if (!n) return; if (n.b) inKeep.add(n.b.id); n.kids.forEach(walk) }
    keep.forEach(walk)
    other = [...other, ...champ.filter(b => !inKeep.has(b.id) && !other.includes(b))]
    root = merge(keep)
  }
  if (!root) return empty
  const cols: (BracketBout | null)[][] = Array.from({ length: D }, (_, k) => new Array(2 ** (D - 1 - k)).fill(null))
  const place = (n: N | null, i: number) => {
    if (!n) return
    cols[n.col][i] = n.b
    n.kids.forEach((k, j) => { if (k) place(k, (2 * i + j) * 2 ** (n.col - 1 - k.col)) })
  }
  place(root, 0)
  const first = cols.findIndex(c => c.some(Boolean))
  const label = (k: number) => champLabel(order[k - (D - order.length)] ?? '')
  return { champ: cols.slice(first).map((cells, j) => ({ label: label(first + j), cells })), cons, other, complete: true }
}
