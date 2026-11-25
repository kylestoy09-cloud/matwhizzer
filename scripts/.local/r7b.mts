import { readYear } from '../../src/lib/playoffHistory/readFiles'
import { buildBrackets } from '../../src/lib/playoffHistory/brackets'
const ev = readYear(2024).events.find(e => e.kind === 'region' && e.num === 7)!
for (const w of process.argv.slice(2).map(Number)) {
  const b = buildBrackets(ev).find(x => x.weight === w)!
  console.log('==', w, b.problems.join(' / '))
  for (const x of b.bouts) console.log('  ', String(x.order).padStart(2), x.round.padEnd(10), x.side.slice(0, 5), x.winner, 'over', x.loser, x.winType)
}
