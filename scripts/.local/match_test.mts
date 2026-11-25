import { readFileSync } from 'fs'
const { matchWeights } = await import('../../src/app/admin/[side]/content/daily-challenge/HistoryTabs')
const H = await import('../../src/app/api/admin/history/route')
const h = await (await H.GET()).json()
const m = matchWeights(h.finishes)
const yrs = new Set(m.map((f: any) => f.year))
console.log('matched finishes', m.length, '| years', Math.min(...yrs), '–', Math.max(...yrs), yrs.size, 'years | 1995 in:', yrs.has(1995))
const per = new Map<number, Set<string>>(); for (const f of m) (per.get(f.year) ?? per.set(f.year, new Set()).get(f.year)!).add(f.weight)
console.log('every year has all 14:', [...per.values()].every(s => s.size === 14))
for (const y of [1996, 2012, 2022]) console.log(y, m.filter((f: any) => f.year === y && f.level === 'state' && f.place === 1).sort((a: any, b: any) => (a.weight === 'Hwt' ? 999 : +a.weight) - (b.weight === 'Hwt' ? 999 : +b.weight)).map((f: any) => `${f.listed}→${f.weight}`).join(' '))
const top = (rows: any[], k: (r: any) => string) => { const c = new Map<string, number>(); rows.forEach(r => c.set(k(r), (c.get(k(r)) ?? 0) + 1)); return [...c].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([a, b]) => `${a} ${b}`).join('; ') }
console.log('157 slot state titles since 1996, by school:', top(m.filter((f: any) => f.level === 'state' && f.place === 1 && f.weight === '157'), f => f.school))
console.log('157 slot state podiums since 1996, by school:', top(m.filter((f: any) => f.level === 'state' && f.weight === '157'), f => f.school))
