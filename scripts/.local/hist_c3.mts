import { readYear } from '../../src/lib/playoffHistory/readFiles'
import { buildBrackets } from '../../src/lib/playoffHistory/brackets'
for (let y = 2013; y <= 2020; y++) for (const e of readYear(y).events.filter(e => e.kind === 'district')) for (const b of buildBrackets(e)) {
  const c = b.bouts.filter(x => x.round === 'C3' || x.round === 'C1')
  if (c.length) console.log(y, e.event, b.weight, c.map(x => `${x.round} "${x.label}" ${x.winner} over ${x.loser} ${x.winType}`).join(' | '), '|| 3rd:', b.bouts.filter(x => x.round === '3rd_Place').map(x => `"${x.label}" ${x.winner} over ${x.loser}`).join(' | '))
}
