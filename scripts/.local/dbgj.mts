import { readFileSync } from 'fs'
import * as H from '../../src/lib/hubFiles'
const B = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026`
const idx = H.rosterIndex(H.parseRoster(H.rtfToText(readFileSync(`${B}/Journeymen Fall Classic.rtf`, 'utf8'))))
for (const b of H.bracketsFrom(H.parseBoutExport(readFileSync(`${B}/2026JourneymenFallClassic.csv`, 'utf8'))).filter(x => x.weight === process.argv[2] && H.mergedBracket(x))) {
  const parts = H.splitByRoster(b, idx) ?? [b]
  for (const p of parts) {
    const divs = new Map<string, number>(); for (const k of p.people) for (const h of (idx.get(k.name.toLowerCase()) ?? []).filter(h => h.weight === b.weight)) divs.set(h.division, (divs.get(h.division) ?? 0) + 1)
    const rest = p.bouts.filter(x => !/^RR /.test(x.round)), tiers = H.bracketsFrom(rest).filter(H.contested)
    console.log(p.division ?? '?', p.people.length, 'kids', JSON.stringify([...divs]), '| merged', H.mergedBracket(p), '| tiers', tiers.length, tiers.map(t => `${t.people.length}k finals ${t.bouts.filter(x => x.round === 'Finals').length}`).join(' '), '| tiered', !!H.tieredPlaces(p))
  }
}
