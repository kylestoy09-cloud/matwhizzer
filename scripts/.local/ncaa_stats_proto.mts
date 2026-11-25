import { readFileSync } from 'fs'
import { getDocumentProxy } from 'unpdf'
import { type Item } from '../../src/lib/ncaa/parse'
const [y, page] = process.argv.slice(2)
const wantWeight = process.argv[4]
const pdf = await getDocumentProxy(new Uint8Array(readFileSync(`${process.env.HOME}/Desktop/wrestling_brackets/NCAA Tournament/Mens/NCAA DI/${y}.pdf`)))
const items: Item[] = []
for (let p = 1; p <= pdf.numPages; p++) { const tc = await (await pdf.getPage(p)).getTextContent(); for (const it of tc.items as any[]) if (it.str?.trim()) items.push({ p, s: it.str.trim(), x: it.transform[4], y: it.transform[5], w: it.width }) }
for (const p of page.split(',').map(Number)) {
  const pg = items.filter(i => i.p === p && !/Wrestling Championship|Page \d|Compiled by|\d+\/\d+\/\d{4}|Weight Class|Consolation Bracket/.test(i.s))
  // orientation: entrants (with a comma) mostly share an x (normal) or a y (sideways)
  const ent = pg.filter(i => /,/.test(i.s) && !/\d/.test(i.s.replace(/\[\d+\]/, '')))
  const xs = new Set(ent.map(i => Math.round(i.x))), ys = new Set(ent.map(i => Math.round(i.y)))
  const sideways = ys.size < xs.size
  const col = (i: Item) => (sideways ? i.y : i.x), ord = (i: Item) => (sideways ? i.x : -i.y)
  const cols: Item[][] = []
  for (const i of [...pg].sort((a, b) => col(a) - col(b))) { const c = cols.find(cc => Math.abs(col(cc[0]) - col(i)) < 8); if (c) c.push(i); else cols.push([i]) }
  for (const c of cols) c.sort((a, b) => ord(a) - ord(b))
  console.log(`page ${p} sideways=${sideways} columns:`, cols.map(c => `${Math.round(col(c[0]))}:${c.length}`).join(' '))
  cols.forEach((c, k) => console.log(`  col${k} @${Math.round(col(c[0]))}:`, c.map(i => i.s).join(' | ').slice(0, 260)))
}
