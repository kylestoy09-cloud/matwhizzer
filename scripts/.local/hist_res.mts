import { readYear } from '../../src/lib/playoffHistory/readFiles'
const shapes: Record<string, { n: number; ex: string }> = {}
for (let y = 2013; y <= 2020; y++) for (const e of readYear(y).events) for (const r of e.rows) {
  const k = `${r.winType} | ${r.result.replace(/\d+/g, 'n')}`
  shapes[k] ??= { n: 0, ex: `${y} ${e.event} ${r.weight} ${r.round}: ${r.winner} over ${r.loser} ${r.result}` }; shapes[k].n++
}
for (const [k, v] of Object.entries(shapes).sort((a, b) => b[1].n - a[1].n)) console.log(String(v.n).padStart(6), k.padEnd(30), v.ex)
