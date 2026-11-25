import { readFileSync } from 'fs'
import * as H from '../../src/lib/hubFiles'
const B = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026`
const roster = H.parseRoster(H.rtfToText(readFileSync(`${B}/super 32 early qualifier.rtf`, 'utf8')))
const idx = H.rosterIndex(roster)
const raw = H.parseBoutExport(readFileSync(`${B}/2026NJSuper32EarlyEntry.csv`, 'utf8'))
for (const b of H.bracketsFrom(raw).filter(H.contested)) {
  if (H.divisionOf(b, idx).division !== 'High School Girls FS') continue
  console.log(b.weight, (b as any).bouts?.slice(0, 4).map((x: any) => `${x.win_type ?? ''} ${x.score ?? x.result ?? ''}`).join(' | ') ?? JSON.stringify(Object.keys(b)))
}
