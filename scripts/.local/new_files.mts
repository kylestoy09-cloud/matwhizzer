import { readFileSync, readdirSync } from 'fs'
import { getDocumentProxy } from 'unpdf'
import * as H from '../../src/lib/hubFiles'
const B = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026`
// Early Entry
const ros = H.rtfToText(readFileSync(`${B}/super 32 early qualifier.rtf`, 'utf8'))
console.log('early qualifier rtf kind:', H.detectKind('x.rtf', ros), '| first lines:', JSON.stringify(ros.split('\n').filter(Boolean).slice(0, 3)))
const roster = H.parseRoster(ros), idx = H.rosterIndex(roster)
const br = H.bracketsFrom(H.parseBoutExport(readFileSync(`${B}/2026NJSuper32EarlyEntry.csv`, 'utf8'))).filter(H.contested)
const divs = new Map<string, number>(); let un = 0
for (const b of br) { const d = H.divisionOf(b, idx).division; if (!d) un++; else divs.set(d, (divs.get(d) ?? 0) + H.placesFrom(b).length) }
console.log('Early Entry: roster', roster.length, '| brackets', br.length, '| unlabeled', un, '|', JSON.stringify([...divs]))
// NER
const ner = H.rtfToText(readFileSync(`${B}/2026 Phil Portuese Northeast Regional Championships.rtf`, 'utf8'))
const pl = [...H.parsePlacements(ner), ...H.parseFloPlacements(ner)]
const by = new Map<string, number>(); for (const r of pl) by.set(r.division, (by.get(r.division) ?? 0) + 1)
console.log('NER kind:', H.detectKind('x.rtf', ner), '| placements', pl.length, '| NJ', pl.filter(r => r.state === 'NJ').length, '|', JSON.stringify([...by]))
console.log('  unknown states:', [...new Set(pl.filter(r => !r.state).map(r => r.team))].slice(0, 10))
// Mobbin
for (const f of readdirSync(`${B}/Mobbin`).filter(f => f.endsWith('.pdf')).sort()) {
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(`${B}/Mobbin/${f}`)))
  const items: any[] = []
  for (let p = 1; p <= pdf.numPages; p++) { const tc = await (await pdf.getPage(p)).getTextContent(); for (const i of tc.items as any[]) if (i.str.trim()) items.push({ s: i.str.trim(), x: Math.round(i.transform[4]), y: Math.round(i.transform[5]) - p * 10000 }) }
  const heads = items.filter(i => /Finals|Semi-finals|Quarter-finals|Round of|Place/i.test(i.s)).map(i => i.s)
  console.log(`${f.slice(0, 12).padEnd(12)} ${JSON.stringify(H.mobbinFromName(f))} | ${H.mobbinPlaces(items).map(p => `${p.place}. ${p.name} (${p.team})`).join('; ')}`)
}
