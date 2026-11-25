import { readYear, HISTORY_DIR } from '../../src/lib/playoffHistory/readFiles'
import { floBoutOrder } from '../../src/lib/playoffHistory/floBoutOrder'
const w = Number(process.argv[2]), names = process.argv.slice(3)
const ev = readYear(2024).events.find(e => e.kind === 'region' && e.num === 7)!
for (const r of ev.rows.filter(r => Number(r.weight) === w && r.winType !== 'BYE' && names.some(n => r.winner.includes(n) || r.loser.includes(n)))) console.log('CSV', r.winType, r.winner, 'over', r.loser, r.result)
for (const b of floBoutOrder(`${HISTORY_DIR}/2024/NJSIAA Region 7 - Brackets - FloWrestling.pdf`, [w]).filter(b => names.some(n => (b.a + b.b).includes(n.toLowerCase())))) console.log('PDF', b.num, b.a, 'v', b.b, '|', b.result)
