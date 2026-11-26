// The import on a broken results file, start to finish, as a worker would run it (2026-11-26):
//   step 2: the practice CSV (data/bracket_intake/2024_state_flo_practice.csv, mistakes in practice.ts) against the
//           bracket — what doesn't fit?
//   step 3: the completed bracket loaded — every championship bout compared with it
//   fixes:  each problem's first suggested fix applied until nothing is left; the file must then match the real
//           2024 results (winner, loser, weight, score) row for row.
// Also: 2024 Region 7 (no round names; five pairs met twice) must be settled by the completed bracket.
// npx tsx --tsconfig tsconfig.json scripts/bracket_intake/mutation_test.mts
import fs from 'fs'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { pdfPages } from '@/lib/bracketIntake/pdfText'
import { readFloDraws } from '@/lib/bracketIntake/flo'
import { readFloResults, type ResultRow } from '@/lib/bracketIntake/results'
import { readFloCompleted } from '@/lib/bracketIntake/completed'
import { reviewIntake } from '@/lib/bracketIntake/review'

async function run(label: string, pdf: string, csv: string, truth: string) {
  const pages = await pdfPages(pdfjs as never, new Uint8Array(fs.readFileSync(pdf)), { weights: true })
  const draws = readFloDraws(pages)
  let rows = readFloResults(fs.readFileSync(csv, 'utf8')).rows
  const s2 = reviewIntake(draws, rows)
  console.log(`\n${label}\nstep 2 (results): ${s2.placed} bouts fit · ${s2.items.length} don't (${s2.items.filter(i => !i.knockOn).length} problems)`)
  for (const it of s2.items.filter(i => !i.knockOn)) console.log(`   ${it.weight} row ${it.row.row} · ${it.title}`)
  const completed = { weights: readFloCompleted(pages, draws, draws), draws }
  let s3 = reviewIntake(draws, rows, completed)
  console.log(`step 3 (completed bracket): ${s3.checked} championship bouts compared · ${s3.items.filter(i => !i.knockOn).length} problems`)
  for (const it of s3.items.filter(i => !i.knockOn)) console.log(`   ${it.weight} row ${it.row.row} · ${it.title}\n      file: ${it.row.round}: ${it.row.winner} over ${it.row.loser} ${it.row.winType} ${it.row.result}\n      bracket: ${it.bracketShows ?? '—'}\n      ${it.hint}\n      fixes: ${it.fixes.map(f => f.label).join(' | ') || '(none)'}`)
  for (let pass = 0; pass < 20 && s3.items.length; pass++) {
    const roots = s3.items.filter(i => !i.knockOn && i.fixes.length)
    if (!roots.length) break
    const next = rows.map(r => ({ ...r }))
    roots[0].fixes[0].apply(next)
    rows = next
    s3 = reviewIntake(draws, rows, completed)
  }
  const orig = readFloResults(fs.readFileSync(truth, 'utf8')).rows
  const k = (r: ResultRow) => [r.weight, r.winner, r.loser, r.winType, r.result].join('|')
  const off = rows.filter((r, i) => k(r) !== k(orig[i]))
  console.log(`after the fixes: ${s3.items.length} left · ${off.length} rows differ from the real results${off.length ? ': ' + off.map(r => r.row).join(', ') : ''}`)
  return s3.items.length === 0 && off.length === 0
}
const H = '/Users/thebrain/Desktop/wrestling_brackets/History/2024'
const a = await run('2024 State practice file', 'data/bracket_intake/2024_state_flo.pdf', 'data/bracket_intake/2024_state_flo_practice.csv', 'data/bracket_intake/2024_state_flo.csv')
const b = await run('2024 Region 7 (no round names)', `${H}/NJSIAA Region 7 - Brackets - FloWrestling.pdf`, `${H}/NJSIAARegion7.csv`, `${H}/NJSIAARegion7.csv`)
console.log(a && b ? '\nPASS' : '\nFAIL')
