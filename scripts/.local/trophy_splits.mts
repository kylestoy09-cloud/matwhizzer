import { trophyIndex } from '../../src/lib/trophyCase'
for (const g of ['M', 'F'] as const) {
  const idx = await trophyIndex(g)
  for (const [id, t] of Object.entries(idx)) {
    const m = new Map<string, Set<string>>()
    for (const f of t.individual) {
      const wt = /^hwt$/i.test(f.weight) ? '285' : f.weight
      const k = `${f.year}|${wt}`
      m.set(k, (m.get(k) ?? new Set()).add(`${f.name} (${f.level})`))
    }
    for (const [k, s] of m) {
      const lasts = new Set([...s].map(x => x.replace(/ \(.*$/, '').trim().split(/\s+/).slice(-1)[0].toLowerCase().replace(/[^a-z]/g, '')))
      if (lasts.size > 1) console.log(g, id, k, [...s].join(' | '))
    }
  }
}
