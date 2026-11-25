import { readFileSync } from 'fs'
import * as H from '../../src/lib/hubFiles'
const MS = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/Middle School Championships`
const ros = H.parseRoster(H.rtfToText(readFileSync(`${MS}/2025 New Jersey Scholastic State Championship.rtf`, 'utf8')))
const by = new Map<string, Set<number>>(); for (const r of ros) (by.get(r.division) ?? by.set(r.division, new Set()).get(r.division)!).add(Number(r.weight))
for (const [d, w] of by) { const a = [...w].filter(Boolean).sort((x, y) => x - y); console.log(d.padEnd(32), a[0], '…', a[a.length - 1], '| grades', JSON.stringify([...new Set(ros.filter(r => r.division === d).map(r => r.grade))].slice(0, 6))) }
