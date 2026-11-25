import { readFileSync } from 'fs'
import * as H from '../../src/lib/hubFiles'
const t = H.rtfToText(readFileSync(`${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026/2026 NHSCA National Duals.rtf`, 'utf8'))
const i = t.indexOf('MAT ASSASSINS - HSB')
console.log([...t.slice(i - 4, i + 60)].map(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) > 126 ? `<${c.charCodeAt(0)}>` : c).join(''))
