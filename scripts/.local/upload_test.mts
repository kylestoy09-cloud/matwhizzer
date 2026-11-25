import { readFileSync } from 'fs'
import { getDocumentProxy } from 'unpdf'
import { contested, rtfToText, detectKind, parseBoutExport, bracketsFrom, placesFrom, parseRoster, rosterIndex, divisionOf, parsePlacements, mobbinPlaces, styleOf, destinationOf } from '../../src/lib/hubFiles'
const B = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff`
const read = (f: string) => rtfToText(readFileSync(`${B}/${f}`, 'utf8'))
function summarize(label: string, csv: string, rosterFiles: string[]) {
  const roster = rosterFiles.flatMap(f => parseRoster(read(f)))
  const idx = rosterIndex(roster)
  const brackets = bracketsFrom(parseBoutExport(readFileSync(`${B}/${csv}`, 'utf8'))).filter(contested)
  const divs = new Map<string, { brackets: number; places: number; nj: number; deepest: number; unl: number }>()
  for (const b of brackets) {
    const { division } = divisionOf(b, idx)
    const d = division ?? 'UNLABELED'
    const ps = placesFrom(b)
    const x = divs.get(d) ?? divs.set(d, { brackets: 0, places: 0, nj: 0, deepest: 0, unl: 0 }).get(d)!
    x.brackets++; x.places += ps.length; x.nj += ps.filter(p => p.person.team === 'NJ').length; x.deepest = Math.max(x.deepest, ...ps.map(p => p.place_to ?? p.place))
    // sanity: each bracket's places cover its people exactly once
    if (ps.length !== b.people.length) x.unl++
  }
  console.log(`\n== ${label}: ${brackets.length} brackets, roster ${roster.length} entries`)
  for (const [d, x] of [...divs].sort()) console.log(`   ${d.padEnd(34)} ${styleOf(d).padEnd(9)} → ${destinationOf(d)} | brackets ${x.brackets} places ${x.places} deepest ${x.deepest} NJ-state ${x.nj}${x.unl ? ` | ${x.unl} brackets with places ≠ people` : ''}`)
}
// detect kinds
for (const f of ['2026/2026DefenseSoapSuper32Challenge.csv', '2026/Super 32 Roster.rtf', '2026/Fargo/Fargo Podiums.rtfd/TXT.rtf', '2026/war at the shore.rtf']) console.log('kind', f, '→', detectKind(f, read(f)))
summarize('Super 32', '2026/2026DefenseSoapSuper32Challenge.csv', ['2026/Super 32 Roster.rtf'])
summarize('NHSCA HS Nationals', '2026/2026NHSCAHighSchoolNationals.csv', ['2026/NHSCA High School Nationals.rtf'])
summarize('War at the Shore', '2026/2026WarattheShore.csv', ['2026/war at the shore.rtf'])
summarize('Journeymen', '2026/2026JourneymenFallClassic.csv', ['2026/Journeymen Fall Classic.rtf'])
summarize('NJ Freestyle & Greco States', '2026/2026NewJerseyFreestyle&GrecoStateChampionship.csv', ['2026/2026 New Jersey Freestyle & Greco State Championship.rtf'])
summarize('NJ Super 32 Early Entry (no roster)', '2026/2026NJSuper32EarlyEntry.csv', [])
summarize('NJ Scholastic States 2026', 'Middle School Championships/2026 Middle School Boys.csv', ['2026/2026 New Jersey Scholastic State Championship.rtf'])
const pl = parsePlacements(read('2026/Fargo/Fargo Podiums.rtfd/TXT.rtf'))
console.log('\n== Fargo placements:', pl.length, 'rows,', new Set(pl.map(r => r.division)).size, 'divisions, NJ', pl.filter(r => r.state === 'NJ').length, '| styles', [...new Set(pl.map(r => `${r.division}:${r.style}:${destinationOf(r.division)}`))].join(' '))
const pdf = await getDocumentProxy(new Uint8Array(readFileSync(`${B}/2026/2026 Mobbin Classic — Toms River, New Jersey.pdf`)))
const tc = await (await pdf.getPage(1)).getTextContent()
const items = (tc.items as any[]).filter(i => i.str.trim()).map(i => ({ s: i.str.trim(), x: Math.round(i.transform[4]), y: Math.round(i.transform[5]) }))
console.log('\n== Mobbin PDF:', mobbinPlaces(items))
