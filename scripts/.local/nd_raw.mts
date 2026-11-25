import { readFileSync, writeFileSync } from 'fs'
import * as H from '../../src/lib/hubFiles'
const t = H.rtfToText(readFileSync(`${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026/2026 NHSCA National Duals.rtf`, 'utf8'))
writeFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/nd_rtf.txt', t)
const i = t.indexOf('MAT ASSASSINS - HSB'); console.log(JSON.stringify(t.slice(i - 300, i + 900)))
console.log('roster entries:', H.parseRoster(t).length)
