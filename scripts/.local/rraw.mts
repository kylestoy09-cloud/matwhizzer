import { readFileSync } from 'fs'
import * as H from '../../src/lib/hubFiles'
const B = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026`
for (const [f, n] of [['2026 New Jersey Freestyle & Greco State Championship.rtf', 'Castro, Jacob'], ['Journeymen Fall Classic.rtf', 'Soto, Victoria'], ['Journeymen Fall Classic.rtf', 'Abramson, Jack']]) {
  const t = H.rtfToText(readFileSync(`${B}/${f}`, 'utf8')); const i = t.indexOf(n)
  console.log(JSON.stringify(t.slice(i - 10, i + 120)))
}
