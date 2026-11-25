import { readFileSync } from 'fs'
import * as H from '../../src/lib/hubFiles'
const B = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026`
const idx = H.rosterIndex(H.parseRoster(H.rtfToText(readFileSync(`${B}/NHSCA High School Nationals.rtf`, 'utf8'))))
const b = H.bracketsFrom(H.parseBoutExport(readFileSync(`${B}/2026NHSCAHighSchoolNationals.csv`, 'utf8'))).filter(x => x.weight === '152' && H.mergedBracket(x))[0]
const parts = H.splitByRoster(b, idx)
console.log(parts ? parts.map(p => `${H.divisionOf(p, idx).division}: ${p.bouts.length} bouts, merged ${H.mergedBracket(p)}`) : 'null')
const kid = (n: string, t: string) => `${n}|${t}`
const sw = (h: any) => h.weight === b.weight
const divs = new Map<string, Set<string>>()
for (const p of b.people) { const hits = idx.get(p.name.toLowerCase()) ?? []; const st = hits.filter(h => h.team.toLowerCase() === p.team.toLowerCase()); let pick = st.length ? st : hits; if (pick.some(sw)) pick = pick.filter(sw); if (pick.length) divs.set(kid(p.name, p.team), new Set(pick.map(h => h.division))) }
const of = new Map<any, string>()
for (let ch = true; ch;) { ch = false; for (const x of b.bouts) { if (of.has(x)) continue; const w = divs.get(kid(x.winner, x.winTeam)), l = x.loser ? divs.get(kid(x.loser, x.loseTeam)) : undefined; const c = w && l ? [...w].filter(d => l.has(d)) : w ? [...w] : l ? [...l] : []; if (c.length !== 1) continue; of.set(x, c[0]); ch = true; for (const [n, t] of [[x.winner, x.winTeam], [x.loser, x.loseTeam]]) if (n && !divs.has(kid(n, t))) divs.set(kid(n, t), new Set(c)) } }
for (const x of b.bouts.filter(x => !of.has(x) && x.loser)) console.log('UNPLACED', x.round, x.winner, x.winTeam, [...(divs.get(kid(x.winner, x.winTeam)) ?? [])], 'v', x.loser, x.loseTeam, [...(divs.get(kid(x.loser, x.loseTeam)) ?? [])])
