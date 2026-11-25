// dev: every school name / abbreviation across the D1 files
import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { getDocumentProxy } from 'unpdf'
import { parseNcaa, type Item } from '../../src/lib/ncaa/parse'
const dir = `${process.env.HOME}/Desktop/wrestling_brackets/NCAA Tournament/Mens/NCAA DI`
const full = new Map<string, number[]>(), abbr = new Map<string, number[]>()
const teamNames = new Set<string>()
for (const f of readdirSync(dir).filter(f => /^\d{4}.*\.pdf$/.test(f)).sort()) {
  const y = Number(f.slice(0, 4))
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(`${dir}/${f}`)))
  const items: Item[] = []
  for (let p = 1; p <= pdf.numPages; p++) { const tc = await (await pdf.getPage(p)).getTextContent(); for (const it of tc.items as any[]) if (it.str?.trim()) items.push({ p, s: it.str.trim(), x: it.transform[4], y: it.transform[5], w: it.width }) }
  const r = parseNcaa(items)
  for (const w of r.weights) for (const e of [...w.entrants, ...w.placers]) {
    const m = /^[A-Z&]{2,6}$/.test(e.school) ? abbr : full
    m.set(e.school, [...new Set([...(m.get(e.school) ?? []), y])])
  }
  // team score pages (2018 picture aside): "<place> <Team Name> <points>" rows give full names
  if (r.format !== 'stats') for (const it of items.filter(i => i.p <= 2)) if (/^[A-Z][A-Za-z.&' -]+$/.test(it.s) && it.s.length > 3 && !/Team|Place|Points|Championships|Scores/.test(it.s)) teamNames.add(it.s)
}
writeFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/ncaa_schools.json', JSON.stringify({ full: [...full], abbr: [...abbr], teamNames: [...teamNames] }))
console.log('full names', full.size, 'abbreviations', abbr.size, 'team-score names', teamNames.size)
console.log('ABBR:', [...abbr.keys()].sort().join(' '))
