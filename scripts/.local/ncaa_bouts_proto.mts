// dev prototype: bouts from an official-layout page by position
import { readFileSync } from 'fs'
import { getDocumentProxy } from 'unpdf'
import { parseNcaa, type Item } from '../../src/lib/ncaa/parse'
const [file, pageArg] = process.argv.slice(2)
const pdf = await getDocumentProxy(new Uint8Array(readFileSync(file)))
const items: Item[] = []
for (let p = 1; p <= pdf.numPages; p++) { const tc = await (await pdf.getPage(p)).getTextContent(); for (const it of tc.items as any[]) if (it.str?.trim()) items.push({ p, s: it.str.trim(), x: it.transform[4], y: it.transform[5], w: it.width }) }
const page = Number(pageArg)
const parsed = parseNcaa(items)
const pg = items.filter(i => i.p === page)
const weight = Number(pg.find(i => /CHAMPIONSHIP$/.test(i.s))!.s.slice(0, 3))
const W = parsed.weights.find(w => w.weight === weight)!
const NAME = /^(?:\((\d+)\)\s*)?([A-Z][^()\d]*?)\s*\(([A-Z&]{2,6})\)(?:\s*\d+-\d+)?$/
const RESULT = /^(Dec|MD|TF[-\d.]*|Fall|SV-\d|TB-\d|UTB|Inj\.?|M\. ?For\.?|For\.?|DQ|MFF|Def\.?)\b/
const names = pg.filter(i => NAME.test(i.s)), results = pg.filter(i => RESULT.test(i.s))
const who = (it: Item) => { const m = it.s.match(NAME)!; const last = m[2].trim().split(/\s+/).slice(-1)[0].toLowerCase(); return W.entrants.find(e => e.school === m[3] && (m[1] ? e.seed === Number(m[1]) : e.name.toLowerCase().endsWith(last))) }
const near = (pool: Item[], b: Item, dx0: number, dx1: number, dy0: number, dy1: number) => pool.filter(i => i.x - b.x >= dx0 && i.x - b.x <= dx1 && i.y - b.y >= dy0 && i.y - b.y <= dy1).sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y))
const nums = pg.filter(i => /^\d{1,3}$/.test(i.s) && Number(i.s) >= 1 && Number(i.s) !== weight && i.y < 740)
// columns of bout numbers (x within 12)
const cols: Item[][] = []
for (const n of [...nums].sort((a, c) => a.x - c.x)) { const c = cols.find(cc => Math.abs(cc[0].x - n.x) < 12); if (c) c.push(n); else cols.push([n]) }
const colOf = new Map<Item, Item[]>(); for (const c of cols) for (const n of c) colOf.set(n, c)
const spacing = (b: Item) => { const others = colOf.get(b)!.filter(o => o !== b).map(o => Math.abs(o.y - b.y)); return others.length ? Math.min(...others) : 120 }
const winnerItem = new Map<Item, Item | undefined>()
for (const b of nums) winnerItem.set(b, near(names, b, 3, 45, -2, 16)[0])
const lChamp = pg.find(i => i.s === 'CHAMPION'), lThird = pg.find(i => i.s === 'Third Place')
const champNum = lChamp && near(nums, lChamp, -40, 60, -40, 0)[0], thirdNum = lThird && near(nums, lThird, -40, 60, -30, 10)[0]
if (champNum && lChamp) winnerItem.set(champNum, near(names, lChamp, -45, 80, 4, 60)[0])
if (thirdNum && lThird) winnerItem.set(thirdNum, near(names, lThird, -45, 80, 4, 60)[0])
const bouts: any[] = []
for (const b of nums) {
  const win = winnerItem.get(b)
  if (!win) continue
  const res = near(results, win, -5, 45, -16, 0)[0]
  const sp = spacing(b)
  // feeding bouts: in the nearest column to the left, within this bout's box
  // the two going in: the names printed between the previous column of bout numbers and this number, inside this
  // bout's box (a final / 3rd place bout's box spans the whole side); championship and wrestleback sides kept apart
  const wbY = pg.find(i => i.s === 'WRESTLEBACKS')?.y ?? -Infinity
  const champSide = (n: Item) => n.y > wbY
  const sameSide = (n: Item) => (b === thirdNum ? !champSide(n) : champSide(n) === champSide(b))
  const prevX = Math.max(-Infinity, ...cols.map(c => c.filter(n => n !== b && sameSide(n))).filter(c => c.length && c[0].x < b.x - 10).map(c => c[0].x))
  const reach = b === champNum || b === thirdNum ? 260 : Math.max(12, sp * 0.6)
  const box = names.filter(i => i !== win && i.x > prevX - 2 && i.x < b.x - 2 && Math.abs(i.y - b.y) < reach && (b === thirdNum ? !champSide(i) : champSide(i) === champSide(b)))
    .sort((a, c) => Math.abs(a.y - b.y) - Math.abs(c.y - b.y))
  const ppl: any[] = []
  for (const i of box) { const e = who(i); if (e && !ppl.includes(e)) ppl.push(e); if (ppl.length >= 2) break }
  const w = who(win)
  const loser = ppl.find(x => x && x !== w)
  bouts.push({ n: b.s, winner: w?.name, loser: loser?.name, result: res?.s })
}
bouts.sort((a, b) => Number(a.n) - Number(b.n))
for (const b of bouts) console.log(b.n.padStart(3), (b.winner ?? '?').padEnd(22), 'over', (b.loser ?? '?').padEnd(22), b.result ?? '?')
const rec = new Map<string, [number, number]>()
for (const b of bouts) { if (b.winner) { const r = rec.get(b.winner) ?? [0, 0]; r[0]++; rec.set(b.winner, r) } if (b.loser) { const r = rec.get(b.loser) ?? [0, 0]; r[1]++; rec.set(b.loser, r) } }
console.log('bouts', bouts.length, '| missing loser', bouts.filter(b => !b.loser).length, '| missing result', bouts.filter(b => !b.result).length)
console.log('placers:', W.placers.map(p => `${p.place}.${p.name} ${rec.get(p.name)?.join('-')}`).join(' | '))
console.log('3+ losses (impossible):', [...rec].filter(([, r]) => r[1] > 2).map(([n, r]) => n + ' ' + r.join('-')))
