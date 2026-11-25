// dev: run the NCAA readers over every year and summarize
import { readFileSync, readdirSync } from 'fs'
import { getDocumentProxy } from 'unpdf'
import { parseNcaa, type Item } from '../../src/lib/ncaa/parse'
import { applyPlaceFixes } from '../../src/lib/ncaa/corrections'
const dir = process.argv[2]
const only = process.argv[3]
for (const f of readdirSync(dir).filter(f => /^\d{4}\.pdf$/.test(f)).sort()) {
  if (only && !f.startsWith(only)) continue
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(`${dir}/${f}`)))
  const items: Item[] = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const tc = await (await pdf.getPage(p)).getTextContent()
    for (const it of tc.items as { str: string; transform: number[]; width: number }[]) if (it.str?.trim()) items.push({ p, s: it.str.trim(), x: it.transform[4], y: it.transform[5], w: it.width })
  }
  const r = applyPlaceFixes('NCAA DI', Number(f.slice(0, 4)), parseNcaa(items))
  const ent = r.weights.reduce((n, w) => n + w.entrants.length, 0), pl = r.weights.reduce((n, w) => n + w.placers.length, 0)
  const probs = r.weights.flatMap(w => w.problems)
  console.log(`${f} ${r.format.padEnd(13)} weights ${r.weights.length} entrants ${ent} placers ${pl}${probs.length ? ' | ' + probs.slice(0, 4).join('; ') + (probs.length > 4 ? ` (+${probs.length - 4})` : '') : ''}`)
  if (only) for (const w of r.weights) console.log(' ', w.weight, w.placers.map(p => `${p.place}.${p.name} (${p.school})`).join(' | '))
}
