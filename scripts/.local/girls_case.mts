import { readYear } from '../../src/lib/playoffHistory/readFiles'
const [y, num, w] = process.argv.slice(2).map(Number)
const e = readYear(y, 'F').events.find(x => x.kind === 'region' && x.num === num)!
const rounds = [...new Set(e.rows.filter(r => Number(r.weight) === w).map(r => r.round))]
console.log(e.event, w, 'rounds in order:', rounds.join(' · '))
for (const r of e.rows.filter(r => Number(r.weight) === w && r.winType !== 'BYE' && /place|5th|wb|qtf|cons/i.test(r.round))) console.log('  ', r.round.padEnd(22), r.winner, 'over', r.loser, r.winType, r.result)
