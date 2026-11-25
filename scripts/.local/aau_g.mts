import { readFileSync } from 'fs'
import * as H from '../../src/lib/hubFiles'
const t = H.rtfToText(readFileSync(`${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026/2026 AAU Scholastic Duals Boys:Girls.rtfd/TXT.rtf`, 'utf8'))
for (const m of t.matchAll(/[^\n]*(Girls|Women|Boys)[^\n]*/g)) if (m[0].length < 120 && !/,/.test(m[0])) console.log(m.index, JSON.stringify(m[0]))
console.log('length', t.length)
const heads = [...t.matchAll(/\n([^\n\t]{2,80})\n\s*-\s*\n([^\n\t]{2,80})\n\d+\n\s*-\s*\n\d+\n/g)].map(m => m.index!)
console.log('duals', heads.length, 'first', heads[0], 'last', heads[heads.length - 1], '| before 409459:', heads.filter(x => x < 409459).length, '| 441386-610179:', heads.filter(x => x > 441386 && x < 610179).length, '| after 610179:', heads.filter(x => x > 610179).length)
