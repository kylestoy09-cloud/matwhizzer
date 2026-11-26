// Does the fit check catch mistakes? Break the 2024 state results on purpose (src/lib/bracketIntake/practice.ts —
// the same set the Aesthetic Tool's Import review tab uses); each one marked caught must be flagged.
import fs from 'fs'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { pdfPages } from '@/lib/bracketIntake/pdfText'
import { readFloDraws } from '@/lib/bracketIntake/flo'
import { readFloResults } from '@/lib/bracketIntake/results'
import { reviewIntake } from '@/lib/bracketIntake/review'
import { PRACTICE } from '@/lib/bracketIntake/practice'
const H = '/Users/thebrain/Desktop/wrestling_brackets/History/2024'
const draws = readFloDraws(await pdfPages(pdfjs as never, new Uint8Array(fs.readFileSync(`${H}/NJSIAA State Championships - Brackets - FloWrestling.pdf`))))
const base = readFloResults(fs.readFileSync(`${H}/NJSIAAStateChampionships.csv`, 'utf8')).rows
let ok = true
for (const p of PRACTICE) {
  const rows = base.map(r => ({ ...r })); p.apply(rows)
  const { items } = reviewIntake(draws, rows)
  const hit = items.length > 0
  if (hit !== p.caught) ok = false
  console.log(`${hit ? 'CAUGHT' : 'MISSED'}${hit === p.caught ? '' : ' (UNEXPECTED)'} — ${p.label}`)
  for (const it of items) console.log(`    ${it.knockOn ? `[follows ${it.knockOn}] ` : ""}${it.weight} row ${it.row.row} · ${it.title}: ${it.reason}\n      hint: ${it.hint}\n      fixes: ${it.fixes.join(' | ')} · page ${it.show?.page} (${it.show?.weight}) y ${it.show?.top.toFixed(0)}–${it.show?.bottom.toFixed(0)} marks ${it.marks.map(m => `${m.tone}:${m.line + 1}`).join(',')}`)
}
console.log(ok ? '\nAS EXPECTED' : '\nUNEXPECTED RESULT')
