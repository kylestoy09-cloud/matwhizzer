/**
 * Direct raw-RTF extractor — searches for \nestcell triplets and plain-text score patterns
 */
import { readFileSync } from 'fs'

const raw = readFileSync('/Users/thebrain/Desktop/wrestling_brackets/whizzer upload/Tournament Scores.rtf', 'latin1')

function cleanRtfText(s: string): string {
  return s
    .replace(/\\[a-z*]+[-]?\d*\s*/gi, ' ')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\\'a0/g, ' ')
    .replace(/\\'[0-9a-f]{2}/gi, '')
    .replace(/\\uc0\\u\d+/g, '')
    .trim()
}

// ── Extract all nestrow blocks from raw RTF ──────────────────────────────────
// Each nestrow block: content between the PREVIOUS \nestrow and next \nestrow
// Within it: 3 cells separated by \nestcell
const nestRowPattern = /\\itap2[^]*?\\nestcell\s*\\nestrow/g
const allRows: { cells: string[] }[] = []

let match: RegExpExecArray | null
while ((match = nestRowPattern.exec(raw)) !== null) {
  const block = match[0]
  const parts = block.split('\\nestcell')
  if (parts.length >= 3) {
    const cells = parts.slice(0, 3).map(p => cleanRtfText(p))
    allRows.push({ cells })
  }
}

// Group rows into score tables (tournament boundary = non-numeric first cell after a gap)
type TeamScore = { place: number; school: string; score: number }
type ScoreTable = { rows: TeamScore[] }

const tables: ScoreTable[] = []
let curTable: TeamScore[] = []

for (const row of allRows) {
  const [p, school, scoreStr] = row.cells
  const place = parseInt(p.replace(/\D/g, '')) || (curTable.length + 1)
  const score = parseFloat(scoreStr.replace(/[^\d.]/g, ''))
  const schoolClean = school.replace(/^\s*\d+\s*/, '').trim()

  if (isNaN(score) || schoolClean.length === 0) {
    if (curTable.length >= 2) { tables.push({ rows: [...curTable] }); curTable = [] }
    continue
  }
  curTable.push({ place, school: schoolClean, score })
}
if (curTable.length >= 2) tables.push({ rows: [...curTable] })

console.log(`Found ${tables.length} RTF nested tables\n`)
for (let i = 0; i < tables.length; i++) {
  const t = tables[i]
  const winner = t.rows[0]
  console.log(`Table ${i + 1} (${t.rows.length} teams) — Winner: ${winner?.school} ${winner?.score}`)
  for (const r of t.rows.slice(0, 8)) {
    console.log(`  ${r.place}. ${r.school} — ${r.score}`)
  }
  if (t.rows.length > 8) console.log(`  ...${t.rows.length - 8} more`)
  console.log()
}

// ── Extract plain-text blocks between tournaments ────────────────────────────
// Powerade inline: "(1) School score, (2) School score ..."
const powerade = raw.match(/\(1\)\s+Lake Highland Prep[^\\]+/s)?.[0] ?? ''
if (powerade) {
  console.log('=== POWERADE INLINE SCORES ===')
  const ps = [...powerade.matchAll(/\((\d+)\)\s+([A-Z][^(,\d]{3,}?)\s+([\d.]+)(?:,|\s*\n|\\)/g)]
  for (const m of ps.slice(0, 10)) {
    console.log(`  ${m[1]}. ${m[2].trim()} — ${m[3]}`)
  }
  console.log(`  (${ps.length} total)`)
}

// East Brunswick plain text: "1 Brearley/Dayton 183.5"
const ebMatch = raw.match(/Brearley\/Dayton[^}]{0,2000}/s)?.[0] ?? ''
if (ebMatch) {
  console.log('\n=== EAST BRUNSWICK SCORES ===')
  const ems = [...ebMatch.matchAll(/(\d+)\s+([A-Z][^\\{\n]+?)\s+([\d.]+)\s*\\/g)]
  for (const m of ems.slice(0, 15)) {
    console.log(`  ${m[1]}. ${m[2].trim()} — ${m[3]}`)
  }
}

// Cutter Classic: "8. Elmwood Park - 87"
const cutterMatch = raw.match(/Elmwood Park - 87[^}]{0,1000}/s)?.[0] ?? ''
if (cutterMatch) {
  console.log('\n=== CUTTER CLASSIC (partial) ===')
  const cs = [...cutterMatch.matchAll(/(\d+)\.\s+(.+?)\s*-\s*([\d.]+)/g)]
  for (const m of cs) {
    console.log(`  ${m[1]}. ${m[2].trim()} — ${m[3]}`)
  }
}

// Robin Leff: "1. Metuchen - 215.5"
const robinMatch = raw.match(/Metuchen\s*-\s*215/)?.[0] ? raw : ''
const robinSearch = raw.match(/Metuchen[^}]{0,2000}/s)?.[0] ?? ''
if (robinSearch) {
  console.log('\n=== ROBIN LEFF (checking) ===')
  console.log(robinSearch.substring(0, 300))
}

// Ron Mazzola: "1. Old Bridge - 197"
const mazzSearch = raw.match(/Old Bridge - 197[^}]{0,2000}/s)?.[0] ?? ''
if (mazzSearch) {
  console.log('\n=== RON MAZZOLA ===')
  const ms = [...mazzSearch.matchAll(/(\d+)\.\s+(.+?)\s*-\s*([\d.]+)/g)]
  for (const m of ms) {
    console.log(`  ${m[1]}. ${m[2].trim()} — ${m[3]}`)
  }
}
