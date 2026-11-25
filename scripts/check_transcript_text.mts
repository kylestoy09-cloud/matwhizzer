// Kyle 2026-11-17: a transcript typed from a PDF that also has text (src/lib/ncaa/transcript.ts) — every entrant's name and
// college, and every bout result, should be in the PDF's text. Lists what isn't (a typo, or text the PDF splits).
//   npx tsx scripts/check_transcript_text.mts "NCAA DII" 2026
import { readFileSync } from 'fs'
import { getDocumentProxy } from 'unpdf'
import { parseTranscript } from '../src/lib/ncaa/transcript'
const [level, year] = process.argv.slice(2)
const text = readFileSync(`data/ncaa/transcripts/${level}/${year}.txt`, 'utf8')
const src = text.match(/source:\s*([^ (]+)/)?.[1] ?? `${year}.pdf`
const pdf = await getDocumentProxy(new Uint8Array(readFileSync(`${process.env.HOME}/Desktop/wrestling_brackets/NCAA Tournament/Mens/${level}/${src}`)))
let all = ''
for (let p = 1; p <= pdf.numPages; p++) all += ' ' + ((await (await pdf.getPage(p)).getTextContent()).items as { str: string }[]).map(i => i.str).join(' ')
const flat = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const hay = flat(all)
const t = parseTranscript(text)
const miss: string[] = []
for (const w of t.weights) for (const e of w.entrants) {
  if (!hay.includes(flat(e.name))) miss.push(`${w.weight} name ${e.name}`)
  if (!hay.includes(flat(e.school))) miss.push(`${w.weight} college ${e.school}`)
  // the record follows the name ("Name 27-3") or the college ("College, 27-3") depending on the layout
  if (e.record && !hay.includes(flat(`${e.name} ${e.record}`)) && !hay.includes(flat(`${e.school} ${e.record}`))) miss.push(`${w.weight} record ${e.name} ${e.record}`)
}
for (const b of t.bouts) if (b.result && !hay.includes(flat(b.result))) miss.push(`${b.weight} result ${b.round} ${b.winner.name}: ${b.result}`)
console.log(miss.length ? miss.join('\n') : 'everything found in the PDF text')
