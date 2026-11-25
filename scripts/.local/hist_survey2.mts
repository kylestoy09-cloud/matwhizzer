import { readYear } from '../../src/lib/playoffHistory/readFiles'
for (const y of [2021, 2022, 2023, 2024]) {
  const { events, skipped, pdfs } = readYear(y)
  const by: Record<string, string[]> = {}
  for (const e of events) (by[e.kind] ??= []).push(`${e.num ?? ''}`)
  console.log(`== ${y}: ${Object.entries(by).map(([k, v]) => `${k} ${v.length} [${v.sort((a, b) => +a - +b).join(',')}]`).join(' | ')} | pdf ${pdfs.length}${skipped.length ? ' | skipped ' + skipped.join('; ') : ''}`)
  const odd = events.filter(e => e.kind === 'district' && !e.num || (e.kind === 'region' && !e.num)); if (odd.length) console.log('   ODD', odd.map(e => e.event))
  console.log('   events:', [...new Set(events.map(e => e.event))].slice(0, 6).join(' | '))
  const st = events.find(e => e.kind === 'state'); if (st) console.log('   state rounds:', [...new Set(st.rows.map(r => r.round))].join(' · '), '| weights', [...new Set(st.rows.map(r => r.weight))].length)
  console.log('   region rounds:', [...new Set(events.filter(e => e.kind === 'region').flatMap(e => e.rows.map(r => r.round)))].join(' · '))
  console.log('   win types:', [...new Set(events.flatMap(e => e.rows.map(r => r.winType)))].join(','))
}
