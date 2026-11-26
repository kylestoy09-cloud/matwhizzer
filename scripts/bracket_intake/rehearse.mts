// The TypeScript importer on the rehearsal set: Flo PDF draw + CSV results, every bout must fit.
// npx tsx --tsconfig tsconfig.json scripts/bracket_intake/rehearse.mts [History dir]
import fs from 'fs'
import path from 'path'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { pdfPages } from '@/lib/bracketIntake/pdfText'
import { readFloDraws } from '@/lib/bracketIntake/flo'
import { readFloResults } from '@/lib/bracketIntake/results'
import { fitWeight } from '@/lib/bracketIntake/fit'
const H = process.argv[2] ?? '/Users/thebrain/Desktop/wrestling_brackets/History'
const jobs: [string, string, string][] = []
for (let y = 2013; y <= 2024; y++) {
  const files = fs.readdirSync(path.join(H, String(y)))
  jobs.push([path.join(H, String(y), files.find(f => /State.*FloWrestling\.pdf$/.test(f))!), path.join(H, String(y), files.find(f => /StateChampionships\.csv$/.test(f))!), `${y} State`])
}
jobs.push([`${H}/2024/NJSIAA Region 7 - Brackets - FloWrestling.pdf`, `${H}/2024/NJSIAARegion7.csv`, '2024 Region 7'])
jobs.push([`${H}/2013/District 24 Brackets/NJSIAA District 24 - Brackets - FloWrestling.pdf`, `${H}/2013/District 24 Brackets/NJSIAADistrict24.csv`, '2013 District 24'])
jobs.push([`${H}/2024-25/2025 Union County Conference - Brackets - FloWrestling.pdf`, `${H}/2024-25/2025UnionCountyConference.csv`, '2025 Union County'])
jobs.push([`${H}/2024-25/SCIAA Somerset County Tournament - Brackets - FloWrestling.pdf`, `${H}/2024-25/SCIAASomersetCountyTournament.csv`, '2025 Somerset County'])
jobs.push([`${H}/2024-25/Shore Conference Individual Championship - Brackets.pdf`, `${H}/2024-25/ShoreConferenceIndividualChampionship.csv`, '2025 Shore Conference'])
let allOk = true
for (const [pdf, csv, label] of jobs) {
  const draws = readFloDraws(await pdfPages(pdfjs as never, new Uint8Array(fs.readFileSync(pdf))))
  const { rows, problems } = readFloResults(fs.readFileSync(csv, 'utf8'))
  let champ = 0, cons = 0, flagged = 0; const notes: string[] = [...problems]
  for (const d of draws) {
    const f = fitWeight(d, rows.filter(r => r.weight === d.weight))
    champ += f.placed.filter(p => p.side === 'champ').length; cons += f.placed.filter(p => p.side === 'cons').length; flagged += f.flags.length
    if (f.flags.length) notes.push(`${d.weight} (${d.lines.length} lines): ${f.flags.slice(0, 2).map(x => x.reason).join(' | ')}${f.flags.length > 2 ? ` (+${f.flags.length - 2})` : ''}`)
  }
  if (flagged || draws.length !== 14) allOk = false
  console.log(`${label}: ${draws.length} weights · ${champ} championship + ${cons} consolation bouts placed · ${flagged} for review`)
  notes.slice(0, 5).forEach(n => console.log('   ', n))
}
console.log(allOk ? '\nALL FIT' : '\nSOME NEED REVIEW')
