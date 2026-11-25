import { readFileSync } from 'fs'
import * as H from '../../src/lib/hubFiles'
const t = H.rtfToText(readFileSync(`${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026/2026 New Jersey Freestyle & Greco State Championship Placements.rtfd/TXT.rtf`, 'utf8'))
const i = t.indexOf('75 lbs'); console.log(i, JSON.stringify(t.slice(i - 80, i + 200)))
