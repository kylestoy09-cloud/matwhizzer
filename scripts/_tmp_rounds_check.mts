import { readFileSync, readdirSync } from 'fs'
import { getDocumentProxy } from 'unpdf'
import { parseNcaa, mergeParses, parseOfficialBouts, parseStatsBouts, type Item, type NcaaBout } from '../src/lib/ncaa/parse'
const dir = `${process.env.HOME}/Desktop/wrestling_brackets/NCAA Tournament/Mens/NCAA DI`
const files = readdirSync(dir).filter(f => /(19|20)\d{2}/.test(f) && f.endsWith('.pdf'))
const only = process.argv[2]
const EXP: Record<string, number> = { r1: 16, r2: 8, qf: 4, sf: 2, f: 1, c1: 8, c2: 8, c3: 4, c4: 4, cqf: 2, csf: 2, '3rd': 1, '5th': 1, '7th': 1 }
for (const y of [...new Set(files.map(f => Number(f.match(/(19|20)\d{2}/)![0])))].sort()) {
  if (only && String(y) !== only) continue
  const bouts: NcaaBout[] = []; const parts = []
  for (const f of files.filter(f => f.includes(String(y)))) {
    const pdf = await getDocumentProxy(new Uint8Array(readFileSync(`${dir}/${f}`)))
    const items: Item[] = []
    for (let p = 1; p <= pdf.numPages; p++) { const tc = await (await pdf.getPage(p)).getTextContent(); for (const it of tc.items as any[]) if (it.str?.trim()) items.push({ p, s: it.str.trim(), x: it.transform[4], y: it.transform[5], w: it.width }) }
    const one = parseNcaa(items); parts.push(one)
    if (one.format === 'official') bouts.push(...parseOfficialBouts(items, one.weights))
    else if (one.format === 'stats') bouts.push(...parseStatsBouts(items, one.weights))
  }
  const tot = new Map<string, number>(); const off: string[] = []
  for (const w of [...new Set(bouts.map(b => b.weight))]) {
    const c = new Map<string, number>(); for (const b of bouts.filter(b => b.weight === w)) c.set(b.round ?? 'none', (c.get(b.round ?? 'none') ?? 0) + 1)
    for (const [k, v] of c) tot.set(k, (tot.get(k) ?? 0) + v)
    const bad = Object.entries(EXP).filter(([k, n]) => (c.get(k) ?? 0) > n).map(([k, n]) => `${k} ${c.get(k)}>${n}`)
    if (c.get('none')) bad.push(`none ${c.get('none')}`)
    if (bad.length) off.push(`${w}: ${bad.join(', ')}`)
  }
  console.log(y, bouts.length, JSON.stringify(Object.fromEntries([...tot].sort())), off.length ? '\n   OVER ' + off.join(' | ') : '')
}
