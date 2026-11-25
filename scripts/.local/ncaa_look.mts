import { readFileSync } from 'fs'
import { getDocumentProxy } from 'unpdf'
import { parseNcaa, type Item } from '../../src/lib/ncaa/parse'
const dir = `${process.env.HOME}/Desktop/wrestling_brackets/NCAA Tournament/Mens/NCAA DI`
for (const [y, wt, re] of [['2016', 141, /ward/i], ['2017', 184, /boyd|martin/i], ['2018', 133, /pletcher|wilson|delvecchio|brock/i]] as const) {
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(`${dir}/${y}.pdf`)))
  const items: Item[] = []
  for (let p = 1; p <= pdf.numPages; p++) { const tc = await (await pdf.getPage(p)).getTextContent(); for (const it of tc.items as any[]) if (it.str?.trim()) items.push({ p, s: it.str.trim(), x: it.transform[4], y: it.transform[5], w: it.width }) }
  const w = parseNcaa(items).weights.find(x => x.weight === wt)!
  console.log(y, wt, 'entrants:', w.entrants.filter(e => re.test(e.name)).map(e => `${e.name} (${e.school}) [${e.seed}]`).join('; '))
  console.log('   places:', w.placers.map(p => `${p.place}.${p.name} (${p.school})`).join(' | '))
}
