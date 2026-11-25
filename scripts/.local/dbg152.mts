import { readFileSync } from 'fs'
import * as H from '../../src/lib/hubFiles'
const B = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026`
const roster = H.parseRoster(H.rtfToText(readFileSync(`${B}/NHSCA High School Nationals.rtf`, 'utf8')))
const idx = H.rosterIndex(roster)
console.log('roster entries', roster.length, 'at 152:', roster.filter(r => r.weight === '152').length, 'sample', JSON.stringify(roster.filter(r => r.weight === '152').slice(0, 2)))
const b = H.bracketsFrom(H.parseBoutExport(readFileSync(`${B}/2026NHSCAHighSchoolNationals.csv`, 'utf8'))).filter(x => x.weight === '152' && H.mergedBracket(x))[0]
const known = b.people.filter(p => idx.has(p.name.toLowerCase()))
console.log('people', b.people.length, 'on roster', known.length, 'missing e.g.', b.people.filter(p => !idx.has(p.name.toLowerCase())).slice(0, 5).map(p => p.name))
const all = [...idx.keys()].filter(k => /polofsky|baughman|connick/.test(k)); console.log('roster has', all, (all.map(k => JSON.stringify(idx.get(k)))))
const kid = (n: string, t: string) => `${n}|${t}`
const divs = new Map<string, Set<string>>()
for (const p of b.people) { const hits = (idx.get(p.name.toLowerCase()) ?? []).filter(h => h.weight === '152'); if (hits.length) divs.set(kid(p.name, p.team), new Set(hits.map(h => h.division))) }
const of = new Map<any, string>()
for (let ch = true; ch;) { ch = false; for (const x of b.bouts) { if (of.has(x)) continue; const w = divs.get(kid(x.winner, x.winTeam)), l = x.loser ? divs.get(kid(x.loser, x.loseTeam)) : undefined; const c = w && l ? [...w].filter(d => l.has(d)) : w ? [...w] : l ? [...l] : []; if (c.length !== 1) continue; of.set(x, c[0]); ch = true; for (const [n, t] of [[x.winner, x.winTeam], [x.loser, x.loseTeam]]) if (n && !divs.has(kid(n, t))) divs.set(kid(n, t), new Set(c)) } }
const left = b.bouts.filter(x => !of.has(x))
console.log('unassigned', left.length); for (const x of left.slice(0, 10)) console.log(x.round, x.winner, [...(divs.get(kid(x.winner, x.winTeam)) ?? [])], 'v', x.loser, [...(divs.get(kid(x.loser, x.loseTeam)) ?? [])])
