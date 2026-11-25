import { readStateSeeds } from '../../src/lib/playoffHistory/stateSeeds'
import { HISTORY_DIR } from '../../src/lib/playoffHistory/readFiles'
const W = [106, 113, 120, 126, 132, 138, 145, 152, 160, 170, 182, 195, 220, 285]
const { seeds } = readStateSeeds(`${HISTORY_DIR}/2013/2013 NJSIAA State Championships - Brackets - FloWrestling.pdf`, W)
for (const w of W) { const s = seeds.filter(x => x.weight === w).map(x => x.seed).sort((a, b) => a - b); console.log(w, s.length, 'missing', Array.from({ length: 24 }, (_, i) => i + 1).filter(n => !s.includes(n)).join(',')) }
