import { readFileSync } from 'fs'
import * as H from '../../src/lib/hubFiles'
const t = H.rtfToText(readFileSync(`${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026/2026 NHSCA National Duals.rtf`, 'utf8'))
const { bouts, unresolved } = H.parseDualCopy(t)
const by = new Map<string, number>(); for (const b of bouts) by.set(b.division, (by.get(b.division) ?? 0) + 1)
console.log('bouts', bouts.length, JSON.stringify([...by]), '| names not found on the roster', unresolved.length, unresolved.slice(0, 8))
console.log(bouts.slice(0, 6).map(b => `${b.division} ${b.weight}: ${b.winner} (${b.winTeam}) over ${b.loser} (${b.loseTeam}) ${b.winType} ${b.result}`).join('\n'))
const types = new Map<string, number>(); for (const b of bouts) types.set(b.winType, (types.get(b.winType) ?? 0) + 1); console.log(JSON.stringify([...types]))
