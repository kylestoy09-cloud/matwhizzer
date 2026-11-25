import { readFileSync } from 'fs'
import * as H from '../../src/lib/hubFiles'
const B = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026`
const idx = H.rosterIndex(H.parseRoster(H.rtfToText(readFileSync(`${B}/2026 New Jersey Freestyle & Greco State Championship.rtf`, 'utf8'))))
const b = H.bracketsFrom(H.parseBoutExport(readFileSync(`${B}/2026NewJerseyFreestyle&GrecoStateChampionship.csv`, 'utf8'))).filter(x => x.weight === (process.argv[2] ?? '80') && H.mergedBracket(x))[0]
for (const p of b.people) console.log(p.name, '|', p.team, '=>', (idx.get(p.name.toLowerCase()) ?? []).map(h => `${h.division}/${h.weight}/${h.team}`).join('; '))
