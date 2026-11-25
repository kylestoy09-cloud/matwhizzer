import { readFileSync } from 'fs'
import { getDocumentProxy } from 'unpdf'
import { parseNcaa, parseOfficialBouts, type Item } from '../../src/lib/ncaa/parse'
const [y, wt, filter] = process.argv.slice(2)
const pdf = await getDocumentProxy(new Uint8Array(readFileSync(`${process.env.HOME}/Desktop/wrestling_brackets/NCAA Tournament/Mens/NCAA DI/${y}.pdf`)))
const items: Item[] = []
for (let p = 1; p <= pdf.numPages; p++) { const tc = await (await pdf.getPage(p)).getTextContent(); for (const it of tc.items as any[]) if (it.str?.trim()) items.push({ p, s: it.str.trim(), x: it.transform[4], y: it.transform[5], w: it.width }) }
const r = parseNcaa(items)
const W = r.weights.find(w => w.weight === Number(wt))!
console.log('entrants', W.entrants.length, W.entrants.filter(e => !e.seed).map(e => `${e.name}(${e.school})`).join(', ').slice(0, 400))
const bouts = parseOfficialBouts(items, r.weights).filter(b => b.weight === Number(wt)).sort((a, b) => a.bout - b.bout)
for (const b of bouts) if (!filter || new RegExp(filter, 'i').test(`${b.winner.name} ${b.loser?.name}`) || !b.loser) console.log(String(b.bout).padStart(3), b.winner.name.padEnd(22), 'over', (b.loser?.name ?? '?').padEnd(22), b.result ?? '?')
