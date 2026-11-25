import { readFileSync } from 'fs'
import * as H from '../../src/lib/hubFiles'
const B = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026`
const idx = H.rosterIndex(H.parseRoster(H.rtfToText(readFileSync(`${B}/2026 New Jersey Freestyle & Greco State Championship.rtf`, 'utf8'))))
for (const b of H.bracketsFrom(H.parseBoutExport(readFileSync(`${B}/2026NewJerseyFreestyle&GrecoStateChampionship.csv`, 'utf8'))).filter(x => x.weight === process.argv[2] && H.mergedBracket(x))) {
  const parts = H.splitByRoster(b, idx)
  console.log('bracket', b.people.length, 'kids, finals', b.bouts.filter(x => x.round === 'Finals').map(x => `${x.winner} v ${x.loser}`).join(' / '), '=> split', parts ? parts.map(p => `${H.divisionOf(p, idx).division} (${p.bouts.length})`).join(', ') : 'NULL')
  if (!parts) for (const p of b.people) console.log('   ', p.name, '|', p.team, '=>', (idx.get(p.name.toLowerCase()) ?? []).filter(h => h.weight === b.weight).map(h => `${h.division}/${h.team}`).join('; '))
}
