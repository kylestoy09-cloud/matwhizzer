import { trophyIndex } from '../../src/lib/trophyCase'
for (const [id, g] of [[309, 'M'], [21, 'M'], [22, 'F']] as const) {
  const t = (await trophyIndex(g))[id] ?? { individual: [] }
  const d = t.individual.filter(f => f.level === 'district')
  console.log(`#${id} ${g}: rows ${t.individual.length} | district titles ${d.length}, seasons ${[...new Set(d.map(f => f.year))].sort().join(',')} | e.g. ${d.slice(0, 3).map(f => `${f.year} ${f.name} ${f.weight} ${f.region}`).join('; ')}`)
  const y = t.individual.filter(f => f.year === 2019).slice(0, 5); console.log('   2019:', y.map(f => `${f.name} ${f.weight} ${f.level} ${f.place}`).join(' | '))
}
