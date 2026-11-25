import { readYear } from '../../src/lib/playoffHistory/readFiles'
import { buildBrackets } from '../../src/lib/playoffHistory/brackets'
const [y, num, w] = process.argv.slice(2).map(Number)
const e = readYear(y, 'F').events.find(x => x.kind === 'region' && x.num === num)!
const b = buildBrackets(e, 'F').find(x => x.weight === w)!
for (const x of b.bouts) console.log(x.round.padEnd(10), x.side.padEnd(12), `"${x.label}"`.padEnd(24), x.winner, 'over', x.loser, x.winType)
console.log(b.problems, [...b.places])
