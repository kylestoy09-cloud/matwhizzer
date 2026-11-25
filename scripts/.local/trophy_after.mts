import { trophyIndex } from '../../src/lib/trophyCase'
import { groupTrophyRows } from '../../src/lib/trophyRows'
for (const g of ['M', 'F'] as const) {
  const idx = await trophyIndex(g)
  let rows = 0, split = 0
  for (const [id, t] of Object.entries(idx)) {
    const gs = groupTrophyRows(t.individual); rows += gs.length
    const by = new Map<string, typeof gs>()
    for (const fs of gs) {
      if (/sc?heets/i.test(fs[0].name)) console.log('Scheets row:', id, fs.map(f => `${f.level} ${f.name}`).join(' + '))
      const k = `${fs[0].year}|${fs[0].weight.replace(/hwt/i, '285')}`; by.set(k, [...(by.get(k) ?? []), fs])
    }
    for (const [k, v] of by) if (v.length > 1) { split++; console.log('two at one weight:', g, id, k, v.map(fs => fs.map(f => `${f.name} (${f.level})`).join(' + ')).join('  ||  ')) }
  }
  console.log(g, 'rows', rows, 'year+weights still showing two wrestlers', split)
}
