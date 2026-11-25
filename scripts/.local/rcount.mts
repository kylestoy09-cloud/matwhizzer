import { readFileSync } from 'fs'
import * as H from '../../src/lib/hubFiles'
const B = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026`
for (const [r, c] of [['2026 New Jersey Freestyle & Greco State Championship.rtf', '2026NewJerseyFreestyle&GrecoStateChampionship.csv'], ['Journeymen Fall Classic.rtf', '2026JourneymenFallClassic.csv']]) {
  const roster = H.parseRoster(H.rtfToText(readFileSync(`${B}/${r}`, 'utf8')))
  const idx = H.rosterIndex(roster)
  const bouts = H.parseBoutExport(readFileSync(`${B}/${c}`, 'utf8'))
  const kids = new Set(bouts.flatMap(b => [b.winner, b.loser]).filter(Boolean))
  const missing = [...kids].filter(k => !idx.has(k.toLowerCase()))
  const raw = H.rtfToText(readFileSync(`${B}/${r}`, 'utf8'))
  console.log(r, '| roster entries', roster.length, '| kids in bouts', kids.size, '| not on roster', missing.length, missing.slice(0, 6), '| last roster names', roster.slice(-2).map(x => x.last))
  for (const m of missing.slice(0, 3)) { const last = m.split(' ').pop()!; console.log('   text has', last, raw.includes(last)) }
}
