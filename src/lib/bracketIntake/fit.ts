// Does every bout fit the draw? (bracket intake, 2026-11-26). With the blank bracket loaded first, each result is
// placed by its two wrestlers' lines: on the championship side two lines meet at exactly one round, so a bout fits
// when its wrestlers' lines meet at the round it says (or at any round when the label is blank). Consolation bouts:
// both wrestlers must be on the draw. Anything that doesn't fit is returned for review — never placed by guessing.
import type { WeightDraw } from './flo'
import { isPlaceholder, roundKind, type ResultRow, type RoundKind } from './results'

export type Placed = { row: ResultRow; side: 'champ' | 'cons'; lines: [number, number]; round: RoundKind }
// kind: what tripped the check (the review page explains each and offers its fixes)
export type FlagKind = 'bad-size' | 'not-on-bracket' | 'unknown-round' | 'wrong-round' | 'off-path'
export type Flag = { row: ResultRow; kind: FlagKind; reason: string; lines?: [number | null, number | null] }
export type WeightFit = { weight: number; placed: Placed[]; flags: Flag[]; skipped: number }

export const norm = (s: string) => s.replace(/`/g, "'").replace(/\([^)]*\)/g, ' ').normalize('NFD').toLowerCase().replace(/[^a-z]/g, '')

/** codeToSchool: Kyle's Flo code → school name list (before the season); until then the code is matched by its
 *  letters against the CSV's team name — only needed when two wrestlers share a name at one weight */
export function fitWeight(draw: WeightDraw, results: ResultRow[], codeToSchool?: Map<string, string>): WeightFit {
  const size = draw.lines.length, D = Math.log2(size)
  const placed: Placed[] = [], flags: Flag[] = []
  let skipped = 0
  if (!Number.isInteger(D)) return { weight: draw.weight, placed, flags: results.map(row => ({ row, kind: 'bad-size' as const, reason: `The bracket read as ${size} lines (should be 8, 16, 32 or 64) — reload this weight.` })), skipped }
  const byName = new Map<string, number[]>()
  draw.lines.forEach((l, i) => { if (l) { const k = norm(l.name); byName.set(k, [...(byName.get(k) ?? []), i]) } })
  const lineOf = (name: string, team: string): number | null => {
    const hit = byName.get(norm(name)) ?? []
    if (hit.length === 1) return hit[0]
    if (hit.length > 1) {
      // two wrestlers with this name at this weight: the school code decides
      const t = norm(team), initials = (team.match(/[A-Za-z]+/g) ?? []).map(w => w[0]).join('').toLowerCase()
      const fit = hit.filter(i => {
        const code = draw.lines[i]!.code, school = codeToSchool?.get(code.toUpperCase())
        if (school) return norm(school) === t
        const c = code.toLowerCase()
        return c.slice(0, 2) === initials.slice(0, 2) || c.slice(0, 2) === t.slice(0, 2) || initials.startsWith(c.slice(0, 3))
      })
      return fit.length === 1 ? fit[0] : null
    }
    return null
  }
  // every real bout, with its wrestlers' lines
  const bouts: { row: ResultRow; a: number; c: number; kind: RoundKind }[] = []
  for (const row of results) {
    // a bye, or a placeholder opponent (Forfeit Forfeit …), isn't a bout
    if (/^bye$/i.test(row.winType) || !row.loser.trim() || ((isPlaceholder(row.winner) || isPlaceholder(row.loser)) && (lineOf(row.winner, row.winnerTeam) == null || lineOf(row.loser, row.loserTeam) == null))) { skipped++; continue }
    const a = lineOf(row.winner, row.winnerTeam), c = lineOf(row.loser, row.loserTeam), kind = roundKind(row.round)
    if (a == null || c == null) { flags.push({ row, kind: 'not-on-bracket', reason: `${a == null ? row.winner : row.loser} isn't on the ${draw.weight} bracket.`, lines: [a, c] }); continue }
    if (kind === 'UNKNOWN') { flags.push({ row, kind: 'unknown-round', reason: `Round "${row.round}" isn't a round name the importer knows.`, lines: [a, c] }); continue }
    bouts.push({ row, a, c, kind })
  }
  // the championship side by its path: in each block, the bout between the two wrestlers who advanced into it (a bye
  // advances the lone wrestler); its winner advances. Round names only break ties (a rematch in the wrestlebacks)
  const champRow = new Set<ResultRow>()
  const used = new Set<number>()
  const advance = (lvl: number, block: number): number | null | undefined => {     // undefined = not decided yet
    const sides = lvl === 0 ? [2 * block, 2 * block + 1].map(i => (draw.lines[i] ? i : null)) : [advance(lvl - 1, 2 * block), advance(lvl - 1, 2 * block + 1)]
    const [x, y] = sides
    if (x === undefined || y === undefined) return undefined
    if (x == null || y == null) return x ?? y                                    // a bye
    const cand = bouts.map((b, i) => [b, i] as const).filter(([b, i]) => !used.has(i) && ((b.a === x && b.c === y) || (b.a === y && b.c === x)))
    if (!cand.length) return undefined                                         // not wrestled (yet)
    const [b, i] = cand.find(([b2]) => b2.kind !== 'CONS') ?? cand[0]
    used.add(i); champRow.add(b.row)
    return b.a
  }
  advance(D - 1, 0)
  const meet = (a: number, c: number) => 31 - Math.clz32(a ^ c)                  // the championship column where two lines meet
  const COL: Partial<Record<RoundKind, number>> = { F: D - 1, SF: D - 2, QF: D - 3, ...(D === 5 ? { EARLY1: 0, EARLY2: 1 } : { EARLY1: 0, EARLY2: 0 }) }
  const KIND = (lvl: number): RoundKind => (lvl === D - 1 ? 'F' : lvl === D - 2 ? 'SF' : lvl === D - 3 ? 'QF' : lvl === 0 ? 'EARLY1' : 'EARLY2')
  // wrestlers who lost on the championship path: a bout between two of them is a placement / wrestleback bout,
  // whatever its label says (2013: Flo's "Finals" round holds the 1st and the 3rd place bouts)
  const lostOnPath = new Set<number>()
  for (const b of bouts) if (champRow.has(b.row)) lostOnPath.add(b.c)
  for (const b of bouts) {
    const lvl = meet(b.a, b.c)
    if (champRow.has(b.row)) {
      if (b.kind !== 'BLANK' && b.kind !== 'CONS' && COL[b.kind] !== lvl) { flags.push({ row: b.row, kind: 'wrong-round', reason: `${b.row.winner} and ${b.row.loser} meet in the ${KIND(lvl)} on the bracket, not the ${b.row.round}.`, lines: [b.a, b.c] }); continue }
      placed.push({ row: b.row, side: 'champ', lines: [b.a, b.c], round: KIND(lvl) })
    } else if (b.kind === 'CONS' || b.kind === 'BLANK' || (lostOnPath.has(b.a) && lostOnPath.has(b.c))) {
      placed.push({ row: b.row, side: 'cons', lines: [b.a, b.c], round: 'CONS' })
    } else {
      // labeled championship, but not on the bracket's path: who won (or who advanced) doesn't add up
      flags.push({ row: b.row, kind: 'off-path', reason: `${b.row.round}: ${b.row.winner} over ${b.row.loser} isn't on the bracket's championship path (lines ${b.a + 1} and ${b.c + 1}) — check who won the earlier rounds.`, lines: [b.a, b.c] })
    }
  }
  return { weight: draw.weight, placed, flags, skipped }
}
