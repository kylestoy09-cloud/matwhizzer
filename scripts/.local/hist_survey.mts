import { readYear } from '../../src/lib/playoffHistory/readFiles'
for (let y = 2013; y <= 2020; y++) {
  const { events, skipped, pdfs } = readYear(y)
  const d = events.filter(e => e.kind === 'district'), r = events.filter(e => e.kind === 'region'), s = events.filter(e => e.kind === 'state')
  const missD = Array.from({ length: 32 }, (_, i) => i + 1).filter(n => !d.some(e => e.num === n))
  const missR = Array.from({ length: 8 }, (_, i) => i + 1).filter(n => !r.some(e => e.num === n))
  const fileMismatch = events.filter(e => e.files.some(f => { const m = /(District|Region)(\d+)/i.exec(f); return m && Number(m[2]) !== e.num }))
  const multiFile = events.filter(e => e.files.length > 1)
  const weights = [...new Set(events.flatMap(e => e.rows.map(x => x.weight)))].sort((a, b) => +a - +b)
  const dates = (es: typeof events) => [...new Set(es.flatMap(e => e.rows.map(x => x.date)))].join(' ')
  const stateN = s[0] ? Object.values(s[0].rows.reduce((m: Record<string, Set<string>>, x) => { for (const n of [x.winner, x.loser]) if (n) (m[x.weight] ??= new Set()).add(n); return m }, {})).map(v => v.size) : []
  console.log(`== ${y}: districts ${d.length}${missD.length ? ` (missing ${missD})` : ''} | regions ${r.length}${missR.length ? ` (missing ${missR})` : ''} | state ${s.length ? 'yes' : 'NO'} | pdf ${pdfs.length}${skipped.length ? ` | skipped ${skipped}` : ''}`)
  console.log(`   weights ${weights.join(',')}`)
  console.log(`   dates: districts ${dates(d)} | regions ${dates(r)} | state ${dates(s)}`)
  if (s[0]) console.log(`   state entrants per weight: ${[...new Set(stateN)].join('/')} | state rounds: ${[...new Set(s[0].rows.map(x => x.round))].join(' · ')}`)
  console.log(`   region rounds: ${[...new Set(r.flatMap(e => e.rows.map(x => x.round)))].join(' · ')}`)
  console.log(`   district rounds: ${[...new Set(d.flatMap(e => e.rows.map(x => x.round)))].join(' · ')}`)
  console.log(`   win types: ${[...new Set(events.flatMap(e => e.rows.map(x => x.winType)))].join(',')}`)
  if (fileMismatch.length) console.log(`   FILE NAME ≠ EVENT: ${fileMismatch.map(e => `${e.files} holds ${e.event}`).join('; ')}`)
  if (multiFile.length) console.log(`   ONE EVENT IN SEVERAL FILES: ${multiFile.map(e => `${e.event}: ${e.files}`).join('; ')}`)
  const other = events.filter(e => !e.num && e.kind !== 'state'); if (other.length) console.log(`   UNKNOWN EVENTS: ${other.map(e => e.event)}`)
}
