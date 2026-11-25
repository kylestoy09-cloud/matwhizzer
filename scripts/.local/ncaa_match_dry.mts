// dev: run matching over all D1 years without saving
import { readFileSync, readdirSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { getDocumentProxy } from 'unpdf'
import { parseNcaa, type Item } from '../../src/lib/ncaa/parse'
import { applyPlaceFixes } from '../../src/lib/ncaa/corrections'
import { matchPool, poolIndex, matchEntrant } from '../../src/lib/ncaa/match'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const dir = `${process.env.HOME}/Desktop/wrestling_brackets/NCAA Tournament/Mens/NCAA DI`
const t0 = Date.now(); const idx = poolIndex(await matchPool(db as never, 'M')); console.log('pool built', Date.now() - t0, 'ms')
const tally: Record<string, number> = { auto: 0, review: 0, none: 0 }
const autos: string[] = [], reviews: string[] = []
for (const f of readdirSync(dir).filter(f => /^\d{4}\.pdf$/.test(f)).sort()) {
  const y = Number(f.slice(0, 4))
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(`${dir}/${f}`)))
  const items: Item[] = []
  for (let p = 1; p <= pdf.numPages; p++) { const tc = await (await pdf.getPage(p)).getTextContent(); for (const it of tc.items as any[]) if (it.str?.trim()) items.push({ p, s: it.str.trim(), x: it.transform[4], y: it.transform[5], w: it.width }) }
  const r = applyPlaceFixes('NCAA DI', y, parseNcaa(items))
  for (const w of r.weights) for (const e of w.entrants) {
    const m = matchEntrant(idx, e.name, y); tally[m.status]++
    const place = w.placers.find(p => p.name === e.name && p.school === e.school)?.place
    if (m.status === 'auto') autos.push(`${y} ${w.weight} ${e.name} (${e.school})${place ? ' ' + place + 'th' : ''} → ${m.candidates[0].name} [${m.candidates[0].schools}] ${m.candidates[0].hs}, ${m.candidates[0].gap}`)
    if (m.status === 'review') reviews.push(`${y} ${w.weight} ${e.name} (${e.school}) → ${m.candidates.map(c => `${c.name} [${c.schools}] ${c.hs} ${c.gap} (${c.why})`).join(' | ')}`)
  }
}
console.log(tally); console.log('AUTO sample:'); autos.filter((_, i) => i % Math.max(1, Math.floor(autos.length / 25)) === 0).forEach(a => console.log('  ' + a))
console.log('REVIEW sample:'); reviews.slice(0, 20).forEach(a => console.log('  ' + a))
