// Kyle 2026-11-17: a first draft of a transcript's entrant lines from a PDF with text (the NCAA DII bracket layout of
// 2024–2026: "(seed) FIRST LAST W-L" over "COLLEGE"), for a year whose file has entrants but no results, or as a start
// for typing up the bouts. Names as the text spells them (title case if the text is all capitals — then check Mc / Mac / De names).
//   npx tsx scripts/draft_transcript_entrants.mts "NCAA DII" 2025.pdf > draft.txt
import { readFileSync } from 'fs'
import { getDocumentProxy } from 'unpdf'
const [level, file] = process.argv.slice(2)
const pdf = await getDocumentProxy(new Uint8Array(readFileSync(`${process.env.HOME}/Desktop/wrestling_brackets/NCAA Tournament/${level.includes("/") ? level : "Mens/" + level}/${file}`)))
// the colleges as the team-score table spells them (mixed case), to undo the brackets' capitals
const teams: string[] = []
// (a soft hyphen in a record — 2019's "29­8" — reads as a hyphen)
const WEIGHTS = new Set([125, 133, 141, 149, 157, 165, 174, 184, 197, 285])
const title = (s: string) => s.toLowerCase().replace(/\b([a-z])/g, c => c.toUpperCase()).replace(/\bMc([a-z])/g, (_, c) => 'Mc' + c.toUpperCase()).replace(/'([a-z])/g, (_, c) => "'" + c.toUpperCase())
for (let p = 1; p <= pdf.numPages; p++) {
  const items = ((await (await pdf.getPage(p)).getTextContent()).items as { str: string; transform: number[] }[]).filter(i => i.str.trim()).map(i => ({ s: i.str.trim().replace(/\u00ad/g, '-'), x: i.transform[4], y: i.transform[5], size: Math.abs(i.transform[3]) }))
  if (items.some(i => /Team Scores/i.test(i.s))) { teams.push(...items.filter(i => /[a-z]/.test(i.s) && !/Team|Place|Points|Championships/.test(i.s)).map(i => i.s)); continue }
  const flat = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
  // 2024 layout: "(seed) First Last" over "College, W-L"; the weight alone at the top
  const top = Math.max(...items.map(i => i.y))
  // the weight: at the top, or printed large somewhere on the page (2018)
  const big = Math.max(...items.map(i => i.size))
  const w24 = items.find(i => /^\d{3}$/.test(i.s) && WEIGHTS.has(Number(i.s)) && (i.y > top - 5 || i.size >= big - 0.5))
  // 2014 layout: "(1) Dave Fogle (Pitt.-Johnstown) Sr (31-6)" — the number is the bracket line, not a seed
  const LINE14 = /^\(\d+\)\s+(.+?)\s+\((.+)\)\s+(?:RS\s+)?(?:Fr|So|Jr|Sr)\.?\s+\((\d+-\d+)\)$/
  if (w24 && items.some(i => LINE14.test(i.s))) {
    console.log(`\n@ ${w24.s}`)
    for (const it of items) { const m = it.s.replace(/[`’]/g, "'").match(LINE14); if (m) console.log(`- ${m[1]} | ${m[2]} | ${m[3]}`) }
    continue
  }
  if (w24 && items.some(i => /,\s*\d+[- ]\d+$/.test(i.s))) {
    console.log(`\n@ ${w24.s}`)
    const byName = new Map<string, { seed: string; college: string; rec: string }>()
    for (const it of items) {
      const m = it.s.replace(/[`’]/g, "'").match(/^(?:\((\d+)\)\s*)?([A-Z][A-Za-z' .-]+)$/)
      if (!m) continue
      const under = items.find(c => Math.abs(c.x - it.x) < 25 && it.y - c.y > 4 && it.y - c.y < 10 && /,\s*\d+[- ]\d+$/.test(c.s))
      if (!under) continue
      const u = under.s.replace(/(\d+) (\d+)$/, '$1-$2').match(/^(.+?)\s*,\s*(\d+-\d+)$/)!   // (2017 prints the hyphen as a space)
      const cur = byName.get(m[2].trim())
      byName.set(m[2].trim(), { seed: cur?.seed !== '-' && cur ? cur.seed : m[1] ?? '-', college: u[1].trim(), rec: u[2] })
    }
    // a long name wraps onto two lines ("Collin" / "Wickramaratna"): drop a piece when the whole name (same college and
    // record) is there too
    const full = [...byName]
    for (const [n, e] of full) {
      const whole = full.find(([m, f]) => m !== n && m.includes(n) && f.college === e.college && f.rec === e.rec)
      if (whole) { byName.delete(n); if (e.seed !== '-' && whole[1].seed === '-') whole[1].seed = e.seed }
    }
    for (const [n, e] of byName) console.log(`${e.seed} ${n} | ${e.college} | ${e.rec}`)
    continue
  }
  const head = items.find(i => /^(\d{3}) CHAMPIONSHIP$/.test(i.s))
  if (!head) continue
  console.log(`\n@ ${head.s.slice(0, 3)}`)
  const seen = new Set<string>()
  for (const it of items) {
    // "(seed) Name 27-3", or with a class year "(seed) Name, Sr 27-3" (DIII 2026)
    // (a medical-forfeit note after the name — "AJ Kowal (M. For) 36-6" — isn't part of it)
    const m = it.s.replace(/[`’]/g, "'").replace(/\s*\(M\. ?For\.?\)/i, '').replace(/,\s*(Fr|So|Jr|Sr|Gr|RS ?[A-Za-z]+)\.?(?=\s+\d+-\d+$)/, '').replace(/(\d+) (\d+)$/, '$1-$2').replace(/\s(\d{2,4})$/, ' $1-?').match(/^(?:\((\d+)\)\s*)?([A-Z][A-Za-z' .-]+?)\s+(\d+-(?:\d+|\?))$/)
    // (2019 drops the hyphen: "Ricky Cavallo 315" — the record can't be split, so it's left out)
    if (m && m[3].endsWith('-?')) m[3] = ''
    if (m && /^Loser of\b/i.test(m[2])) continue
    if (!m || seen.has(m[2]) || /^(dec|md|tf|sv|tb|utb|fall|for|inj|dq|mff)\b/i.test(m[2])) continue
    seen.add(m[2])
    const col = items.filter(c => Math.abs(c.x - it.x) < 6 && it.y - c.y > 5 && it.y - c.y < 20)[0]
    const colOk = col && !/\d/.test(col.s)
    const college = colOk ? teams.find(t => flat(t) === flat(col!.s)) ?? col!.s : '?'
    // capitals only when the PDF's text is in capitals
    const name = /[a-z]/.test(m[2]) ? m[2] : title(m[2])
    console.log(m[3] ? `${m[1] ?? '-'} ${name} | ${college} | ${m[3]}` : `${m[1] ?? '-'} ${name} | ${college}`)
  }
}
