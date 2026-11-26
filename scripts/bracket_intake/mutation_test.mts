// Does the fit check catch mistakes? Break the 2024 state results on purpose; each break must be flagged.
import fs from 'fs'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { pdfPages } from '@/lib/bracketIntake/pdfText'
import { readFloDraws } from '@/lib/bracketIntake/flo'
import { readFloResults, type ResultRow } from '@/lib/bracketIntake/results'
import { fitWeight } from '@/lib/bracketIntake/fit'
const H = '/Users/thebrain/Desktop/wrestling_brackets/History/2024'
const draws = readFloDraws(await pdfPages(pdfjs as never, new Uint8Array(fs.readFileSync(`${H}/NJSIAA State Championships - Brackets - FloWrestling.pdf`))))
const base = readFloResults(fs.readFileSync(`${H}/NJSIAAStateChampionships.csv`, 'utf8')).rows
const flagsFor = (rows: ResultRow[], w: number) => fitWeight(draws.find(d => d.weight === w)!, rows.filter(r => r.weight === w)).flags
const clone = () => base.map(r => ({ ...r }))
const tests: [string, () => { rows: ResultRow[]; w: number }][] = [
  ['quarterfinal winner/loser swapped', () => { const rows = clone(); const r = rows.find(x => x.weight === 132 && /^quarter/i.test(x.round))!; [r.winner, r.loser] = [r.loser, r.winner]; [r.winnerTeam, r.loserTeam] = [r.loserTeam, r.winnerTeam]; return { rows, w: 132 } }],
  ['misspelled name', () => { const rows = clone(); const r = rows.find(x => x.weight === 150 && /^semi/i.test(x.round))!; r.loser = r.loser.replace(/[aeiou]/, 'x'); return { rows, w: 150 } }],
  ['bout under the wrong weight', () => { const rows = clone(); const r = rows.find(x => x.weight === 165 && /^quarter/i.test(x.round))!; r.weight = 175; return { rows, w: 175 } }],
  ['wrong round label (a quarterfinal called a semifinal)', () => { const rows = clone(); const r = rows.find(x => x.weight === 215 && /^quarter/i.test(x.round))!; r.round = 'Semifinal'; return { rows, w: 215 } }],
  ['final with the wrong winner', () => { const rows = clone(); const r = rows.find(x => x.weight === 285 && /^(1st|final|first)/i.test(x.round))!; [r.winner, r.loser] = [r.loser, r.winner]; return { rows, w: 285 } }],
]
for (const [name, make] of tests) {
  const { rows, w } = make(); const f = flagsFor(rows, w)
  console.log(`${f.length ? 'CAUGHT' : 'MISSED'} — ${name}${f.length ? `: ${f[0].reason}` : ''}`)
}
