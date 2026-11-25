import { readStateSeeds } from '../../src/lib/playoffHistory/stateSeeds'
import { readYear, HISTORY_DIR } from '../../src/lib/playoffHistory/readFiles'
import { buildBrackets } from '../../src/lib/playoffHistory/brackets'
const W = [106, 113, 120, 126, 132, 138, 145, 152, 160, 170, 182, 195, 220, 285]
const { seeds } = readStateSeeds(`${HISTORY_DIR}/2021/NJSIAA State Championships - Brackets - FloWrestling.pdf`, W)
for (const n of ['Santaniello', 'Mougalian', 'Cangro', 'Zaleski']) console.log(n, '→ PDF weight', seeds.filter(s => s.name.includes(n)).map(s => `${s.weight} #${s.seed}`).join(', '), '| file weight', [...new Set(readYear(2021).events.find(e => e.kind === 'state')!.rows.filter(r => r.winner.includes(n) || r.loser.includes(n)).map(r => r.weight))].join(','))
const b = buildBrackets(readYear(2021).events.find(e => e.kind === 'state')!)
console.log('file 120 places', [...b.find(x => x.weight === 120)!.places].map(([p, n]) => `${p} ${n}`).join('; '))
console.log('file 126 places', [...b.find(x => x.weight === 126)!.places].map(([p, n]) => `${p} ${n}`).join('; '))
