import { readYear } from '../../src/lib/playoffHistory/readFiles'
import { buildBrackets } from '../../src/lib/playoffHistory/brackets'
const [y, ev, w] = process.argv.slice(2)
const e = readYear(Number(y)).events.find(x => x.event.endsWith(` ${ev}`) || x.event === ev)!
for (const r of e.rows.filter(r => r.weight === w)) console.log(r.round.padEnd(28), r.winType.padEnd(4), `${r.winner} (${r.winnerTeam})`.padEnd(40), 'over', `${r.loser} (${r.loserTeam})`, r.result)
const b = buildBrackets(e).find(x => x.weight === Number(w))!
console.log('built:', b.bouts.map(x => `${x.round}:${x.winner.split(' ').pop()}>${x.loser?.split(' ').pop()}`).join('  '), '| places', [...b.places])
