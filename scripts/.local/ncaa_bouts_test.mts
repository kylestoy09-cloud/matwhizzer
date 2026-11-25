import { readFileSync, readdirSync } from 'fs'
import { getDocumentProxy } from 'unpdf'
import { parseNcaa, parseOfficialBouts, parseStatsBouts, checkBouts, type Item } from '../../src/lib/ncaa/parse'
const dir = `${process.env.HOME}/Desktop/wrestling_brackets/NCAA Tournament/Mens/NCAA DI`
for (const f of readdirSync(dir).filter(f => /^\d{4}\.pdf$/.test(f)).sort()) {
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(`${dir}/${f}`)))
  const items: Item[] = []
  for (let p = 1; p <= pdf.numPages; p++) { const tc = await (await pdf.getPage(p)).getTextContent(); for (const it of tc.items as any[]) if (it.str?.trim()) items.push({ p, s: it.str.trim(), x: it.transform[4], y: it.transform[5], w: it.width }) }
  const r = parseNcaa(items)
  if (process.argv[2] && !f.startsWith(process.argv[2])) continue
  const bouts = r.format === 'official' ? parseOfficialBouts(items, r.weights) : parseStatsBouts(items, r.weights)
  const probs = checkBouts(r.weights, bouts)
  const res = bouts.filter(b => b.result).length
  console.log(f, 'bouts', bouts.length, 'with result', res, '| problems', probs.length, probs.slice(0, 5).join('; '))
}
