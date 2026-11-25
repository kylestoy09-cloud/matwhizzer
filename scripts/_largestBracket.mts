// Each weight's high school bracket, for event files that mix youth / junior high brackets in with it (Powerade
// 2015–2017). A bracket is traced back from its final: the champion, everyone they beat on the championship side,
// everyone those wrestlers beat in earlier championship rounds, and so on — every entrant, since each one's
// championship-side loss leads up to the champion. Only earlier rounds are followed, so a name + team standing for
// two people ("Zach McCann, Franklin Regional" in both the junior high and the varsity 106 bracket, 2015) doesn't join
// the two. The bracket with the most entrants is kept, with every bout between two of its wrestlers. A weight with no
// final falls back to the largest group of wrestlers linked by bouts.
import { parseRound } from '../src/lib/historyRounds'

type Row = Record<string, string>
const base = (n: string, t: string) => `${n}|${t}`.toLowerCase()

export function largestBrackets(rows: Row[]): Row[] {
  const out: Row[] = []
  const byW = new Map<string, Row[]>()
  for (const r of rows) (byW.get(r['Weight']) ?? byW.set(r['Weight'], []).get(r['Weight'])!).push(r)
  for (const list of byW.values()) out.push(...bracketOf(list))
  return out
}

function bracketOf(list: Row[]): Row[] {
  const bouts = list.filter(r => r['Losing Wrestler']).map(r => ({ r, w: base(r['Winning Wrestler'], r['Winning Team']), l: base(r['Losing Wrestler'], r['Losing Team']), p: parseRound(r['Round'] ?? '') }))
  const finals = bouts.filter(b => b.p.side === 'place' && b.p.place === 1)
  if (!finals.length) return largestGroup(list)
  const champWins = new Map<string, { l: string; order: number }[]>()
  for (const b of bouts) if (b.p.side === 'champ') (champWins.get(b.w) ?? champWins.set(b.w, []).get(b.w)!).push({ l: b.l, order: b.p.order })
  let best: Set<string> | null = null, bestFinal: Row | null = null
  for (const f of finals) {
    const below = new Map<string, number>([[f.w, 100], [f.l, 100]])   // wrestler → the round order they were reached at
    const q = [f.w, f.l]
    while (q.length) {
      const x = q.shift()!
      for (const c of champWins.get(x) ?? []) if (c.order < below.get(x)! && !below.has(c.l)) { below.set(c.l, c.order); q.push(c.l) }
    }
    if (!best || below.size > best.size) { best = new Set(below.keys()); bestFinal = f.r }
  }
  const keep = best!
  // its one final: another bracket's final between two names it shares is left out
  const otherFinals = new Set(finals.map(f => f.r).filter(r => r !== bestFinal))
  return list.filter(r => !otherFinals.has(r) && keep.has(base(r['Winning Wrestler'], r['Winning Team'])) && (!r['Losing Wrestler'] || keep.has(base(r['Losing Wrestler'], r['Losing Team']))))
}

/** wrestlers linked by bouts form a group; the one with the most wrestlers is kept */
function largestGroup(list: Row[]): Row[] {
  const parent = new Map<string, string>()
  const find = (x: string): string => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x)!)!); x = parent.get(x)! } return x }
  for (const r of list) for (const k of [base(r['Winning Wrestler'], r['Winning Team']), r['Losing Wrestler'] ? base(r['Losing Wrestler'], r['Losing Team']) : null]) if (k && !parent.has(k)) parent.set(k, k)
  for (const r of list) if (r['Losing Wrestler']) { const a = find(base(r['Winning Wrestler'], r['Winning Team'])), b = find(base(r['Losing Wrestler'], r['Losing Team'])); if (a !== b) parent.set(a, b) }
  const size = new Map<string, number>(); for (const k of parent.keys()) size.set(find(k), (size.get(find(k)) ?? 0) + 1)
  const best = [...size].sort((a, b) => b[1] - a[1])[0]?.[0]
  return list.filter(r => find(base(r['Winning Wrestler'], r['Winning Team'])) === best)
}
