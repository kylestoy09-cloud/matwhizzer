import { readFileSync } from 'fs'
import * as H from '../../src/lib/hubFiles'
const MS = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/Middle School Championships`
const text = H.rtfToText(readFileSync(`${MS}/2023 New Jersey Scholastic State Championship.rtfd/TXT.rtf`, 'utf8'))
const ros = H.parseRoster(text), idx = H.rosterIndex(ros)
console.log('roster', ros.length, 'divisions', JSON.stringify([...new Set(ros.map(r => r.division))]))
for (const b of H.bracketsFrom(H.parseBoutExport(readFileSync(`${MS}/2023 Middle School Boys.csv`, 'utf8'))).filter(H.contested)) {
  if (H.divisionOf(b, idx).division) continue
  console.log(b.weight, b.people.map(p => `${p.name} [${(idx.get(p.name.toLowerCase()) ?? []).map(h => h.division + '/' + h.weight).join(';') || 'not on roster'}] (${p.team})`).slice(0, 4).join(' | '))
}
const i = text.indexOf('Cadet'); console.log(JSON.stringify(text.slice(i - 200, i + 200)))
