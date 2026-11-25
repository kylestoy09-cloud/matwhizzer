import { readYear } from '../../src/lib/playoffHistory/readFiles'
import { buildBrackets } from '../../src/lib/playoffHistory/brackets'
for (const e of readYear(2020).events.filter(e => e.kind === 'district')) for (const b of buildBrackets(e)) if (!b.bouts.some(x => x.round === '3rd_Place')) {
  console.log(e.event, b.weight, '| no 3rd-place bout; rows:'); for (const r of e.rows.filter(r => Number(r.weight) === b.weight && r.winType !== 'BYE')) console.log('   ', r.round, r.winType, r.winner, 'over', r.loser || '—', r.result)
}
