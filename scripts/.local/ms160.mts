import { readFileSync } from 'fs'
import * as H from '../../src/lib/hubFiles'
const MS = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/Middle School Championships`
const idx = H.rosterIndex(H.parseRoster(H.rtfToText(readFileSync(`${MS}/2023 New Jersey Scholastic State Championship.rtfd/TXT.rtf`, 'utf8'))))
for (const b of H.bracketsFrom(H.parseBoutExport(readFileSync(`${MS}/2023 Middle School Boys.csv`, 'utf8'))).filter(x => x.weight === '160')) {
  console.log('bracket', b.people.length, 'kids, finals:', b.bouts.filter(x => x.round === 'Finals' && x.loser).map(x => `${x.winner} v ${x.loser}`).join(' / '))
  for (const k of ['Kevin Rafferty', 'Anthony Cianfrocca']) { const p = b.people.find(p => p.name === k); if (p) console.log('  ', k, b.bouts.filter(x => x.winner === k || x.loser === k).map(x => `${x.round}: ${x.winner} v ${x.loser || 'bye'}`).join(' | '), (idx.get(k.toLowerCase()) ?? []).map(h => `${h.division}/${h.weight}`).join(';')) }
}
for (const b of H.bracketsFrom(H.parseBoutExport(readFileSync(`${MS}/2023 Middle School Boys.csv`, 'utf8'))).filter(x => x.weight === '160' && H.mergedBracket(x))) {
  for (const p of b.people) console.log('   ', p.name, '|', p.team, '=>', (idx.get(p.name.toLowerCase()) ?? []).map(h => `${h.division}/${h.weight}/${h.team}`).join('; '))
  console.log(b.bouts.filter(x => x.loser).map(x => `${x.round}: ${x.winner} v ${x.loser}`).join('\n'))
}
