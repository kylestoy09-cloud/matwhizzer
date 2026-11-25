import { readFileSync } from 'fs'
import { rtfToText, parseBoutExport, bracketsFrom, parseRoster, rosterIndex, divisionOf } from '../../src/lib/hubFiles'
const B = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026`
for (const [csv, ros] of [['2026WarattheShore.csv', 'war at the shore.rtf'], ['2026NewJerseyFreestyle&GrecoStateChampionship.csv', '2026 New Jersey Freestyle & Greco State Championship.rtf']]) {
  const roster = parseRoster(rtfToText(readFileSync(`${B}/${ros}`, 'utf8'))), idx = rosterIndex(roster)
  const un = bracketsFrom(parseBoutExport(readFileSync(`${B}/${csv}`, 'utf8'))).filter(b => !divisionOf(b, idx).division)
  console.log(csv, 'unlabeled', un.length)
  for (const b of un.slice(0, 5)) console.log('  ', b.weight, b.people.map(p => `${p.name} [${p.team}]`).join(', '), '| rounds', [...new Set(b.bouts.map(x => x.round))].join('/'), '| in roster by last name:', b.people.slice(0, 2).map(p => roster.filter(r => p.name.toLowerCase().endsWith(r.last.toLowerCase())).slice(0, 2).map(r => `${r.first} ${r.last}/${r.division}/${r.weight}`).join(';')).join(' || '))
}
