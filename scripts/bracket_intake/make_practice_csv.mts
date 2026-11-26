// Writes the practice results file: the 2024 State CSV with the mistakes in src/lib/bracketIntake/practice.ts.
// Only the changed rows are rewritten, in Flo's own cell format (="value").
// npx tsx --tsconfig tsconfig.json scripts/bracket_intake/make_practice_csv.mts
import fs from 'fs'
import { readFloResults } from '@/lib/bracketIntake/results'
import { PRACTICE } from '@/lib/bracketIntake/practice'
const SRC = 'data/bracket_intake/2024_state_flo.csv', OUT = 'data/bracket_intake/2024_state_flo_practice.csv'
const text = fs.readFileSync(SRC, 'utf8')
const eol = text.includes('\r\n') ? '\r\n' : '\n'
const lines = text.split(eol)
const rows = readFloResults(text).rows
const cell = (v: string) => `"=""${v.replace(/"/g, '""""')}"""`
for (const p of PRACTICE) {
  const r = p.apply(rows)
  if (!r) throw new Error(`${p.key}: no row to change`)
  const old = lines[r.row].split('","')
  const keep = (i: number) => old[i].replace(/^"?=""/, '').replace(/"""?$/, '')
  // Date, Weight, Round, Winning Wrestler, Winning Team, Result, Win Type, Losing Wrestler, Losing Team, City, State, Event
  lines[r.row] = [keep(0), String(r.weight), r.round, r.winner, r.winnerTeam, r.result, r.winType, r.loser, r.loserTeam, keep(9), keep(10), keep(11)].map(cell).join(',')
  console.log(`row ${r.row} · ${p.label}`)
}
fs.writeFileSync(OUT, lines.join(eol))
// the file must read back with exactly those changes
const back = readFloResults(fs.readFileSync(OUT, 'utf8')).rows, orig = readFloResults(text).rows
const diff = back.filter((r, i) => JSON.stringify(r) !== JSON.stringify(orig[i])).length
console.log(`${OUT}: ${back.length} rows, ${diff} changed`)
