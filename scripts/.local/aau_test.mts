import { readFileSync } from 'fs'
import * as H from '../../src/lib/hubFiles'
const t = H.rtfToText(readFileSync(`${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026/2026 AAU Scholastic Duals Boys:Girls.rtfd/TXT.rtf`, 'utf8'))
console.log('date line:', (t.match(/AAU[^\n]*20\d\d[^\n]*/) ?? [''])[0].slice(0, 120))
const ros = H.parseRoster(t); console.log('roster', ros.length, 'team suffixes', JSON.stringify([...new Set(ros.map(r => / - ([A-Z]+)$/.exec(r.team)?.[1] ?? '(none)'))].slice(0, 10)), 'divisions', JSON.stringify([...new Set(ros.map(r => r.division))].slice(0, 10)))
const { bouts, unresolved } = H.parseDualCopy(t)
const by = new Map<string, number>(); for (const b of bouts) by.set(b.division, (by.get(b.division) ?? 0) + 1)
console.log('bouts', bouts.length, JSON.stringify([...by]), 'unresolved', unresolved.length)
const i = t.indexOf('\n - \n') > 0 ? t.indexOf('\n - \n') : t.search(/\n\s*-\s*\n/); console.log(JSON.stringify(t.slice(i - 200, i + 400)))
