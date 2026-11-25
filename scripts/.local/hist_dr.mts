import { readYear } from '../../src/lib/playoffHistory/readFiles'
for (let y = 2013; y <= 2020; y++) {
  const { events, skipped } = readYear(y)
  const d = events.filter(e => e.kind === 'district'), r = events.filter(e => e.kind === 'region'), s = events.filter(e => e.kind === 'state')
  // where each district's wrestlers show up at regions (name+team+weight)
  const at = new Map<string, number>()
  for (const e of r) for (const x of e.rows) for (const [n, t] of [[x.winner, x.winnerTeam], [x.loser, x.loserTeam]]) if (n) at.set(`${x.weight}|${n}|${t}`, e.num!)
  const map: string[] = [], odd: string[] = []
  for (const e of d.sort((a, b) => a.num! - b.num!)) {
    const c: Record<number, number> = {}
    for (const x of e.rows) for (const [n, t] of [[x.winner, x.winnerTeam], [x.loser, x.loserTeam]]) { const g = at.get(`${x.weight}|${n}|${t}`); if (g) c[g] = (c[g] ?? 0) + 1 }
    const best = Object.entries(c).sort((a, b) => b[1] - a[1])[0]
    const reg = best ? Number(best[0]) : null
    map.push(`${e.num}→${reg}`)
    if (reg !== Math.ceil(e.num! / 4)) odd.push(`D${e.num}→R${reg} (${JSON.stringify(c)})`)
  }
  const stN = s[0] ? new Set(Object.values(s[0].rows.reduce((m: Record<string, Set<string>>, x) => { for (const n of [x.winner, x.loser]) if (n) (m[x.weight] ??= new Set()).add(n); return m }, {})).map(v => v.size)) : null
  console.log(`${y}: districts ${d.length} regions ${r.length} state ${s.length ? `yes (${[...stN!].join('/')} per weight)` : 'NO'}${skipped.length ? ` skipped ${skipped}` : ''} | district→region off the 1-4/5-8 rule: ${odd.length ? odd.join('; ') : 'none'}`)
}
