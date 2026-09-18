/**
 * Parses Tournament Scores.rtf to extract:
 *  - tournament name
 *  - venue + address
 *  - date
 *  - team scores (if present)
 */
import { readFileSync } from 'fs'

const raw = readFileSync('/Users/thebrain/Desktop/wrestling_brackets/whizzer upload/Tournament Scores.rtf', 'latin1')

// ── Step 1: strip RTF to plain text ──────────────────────────────────────────

function stripRtf(rtf: string): string {
  // Remove hyperlink fields, keeping the display text
  let s = rtf.replace(/\{\\field\{[^}]*\}\{\\fldrslt ([^}]*)\}\}/g, (_, inner) => {
    // inner is like `\cf8 \ul \ulc8 \strokec8 School Name`
    return inner.replace(/\\[a-z0-9]+\s*/gi, '').trim()
  })
  // Remove nested cell/row markers (preserve content between them)
  s = s.replace(/\\nestcell\s*/g, '\t')
  s = s.replace(/\\nestrow\s*/g, '\n')
  // Remove pard/paragraph commands
  s = s.replace(/\\pard[^\\]*/g, '')
  // Remove control words
  s = s.replace(/\\\*?\\[a-z]+[-]?\d*\s*/gi, '')
  // Unicode escapes like 舲 (line separator)
  s = s.replace(/\\uc0\\u\d+\s*/g, '\n')
  // RTF special chars
  s = s.replace(/\\'96/g, '–')
  s = s.replace(/\\'97/g, '—')
  s = s.replace(/\\'a0/g, ' ')
  s = s.replace(/\\'[0-9a-f]{2}/gi, '')
  // Remove braces
  s = s.replace(/[{}]/g, '')
  // Collapse multiple spaces
  s = s.replace(/[ \t]+/g, ' ')
  // Normalize line endings
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  return s
}

const text = stripRtf(raw)

// Split into lines and clean
const lines = text.split('\n')
  .map(l => l.trim())
  .filter(l => l.length > 0)
  .filter(l => !l.match(/^[\\{}\|]/)) // leftover RTF artifacts

// ── Step 2: parse into tournament blocks ─────────────────────────────────────

// Known tournament names from our DB
const KNOWN_NAMES = new Set([
  'Robin Leff Tournament', 'Elmwood Park Crusader Classic', 'Dan Allen Clipper Classic',
  'Irvington Holiday Tournament', 'John and Betty Vogeding', 'Powerade',
  'Iron Man Tournament', 'Blue Devil Classic', 'Wendy Pandy-Leh Wrestling Invitational',
  'Ramsey Invitational', 'Schalick Classic', 'Ronald Bond Wrestling Tournament',
  'Frank M. Dawson Jr. Holiday Tournament', 'Caldwell Tournament',
  'Harry McLaughlin Invitational', 'Pete Adams Memorial',
  'Ricky I Memorial Tournament', 'Dover Holiday Tournament',
  'Central Regional Golden Eagle Classic', 'Mike Dessino Invitational',
  'Beast of the East', 'Cutter Classic', 'Mustang Invitational Tournament',
  'A-Nice Invitational', 'Gator Beast Wrestling Tournament',
  '12th Annual Laker Holiday Tournament', 'Ron Mazzola Memorial Wrestling Tournament',
  'Kearny Holiday Tournament', 'Garden State Classic', 'TCNJ Pride',
  'Hammonton Kick-Off Tournament', 'Palmyra Panther High School Wrestling Tournament',
  'Holmdel Holiday Tournament', 'Linn Crawn Memorial Tournament',
  'Hunterdon Central Invitational', 'Bart Payne HT Holiday Tournament',
  'Lenape Valley Tournament', 'Walter Woods Holiday Tournament',
  'Bethlehem Holiday Wrestling Classic', 'Mustang Classic',
  'Overbrook Holiday Wrestling Tournament', 'King of The Castle',
  'Parsippany Hills Holiday Tournament', 'Rahway Holiday Tournament',
  'Tim Groves Holiday Tournament', 'East Brunswick Bear Invitational',
])

type TeamScore = { place: number; school: string; score: number | null }
type Tournament = {
  name: string
  venue: string | null
  address: string[]
  date: string | null
  scores: TeamScore[]
  rawLines: string[]
}

const tournaments: Tournament[] = []
let current: Tournament | null = null

function isTournamentName(line: string): boolean {
  const clean = line.replace(/\s+$/, '').trim()
  if (KNOWN_NAMES.has(clean)) return true
  // Also match with trailing dash (Powerade —)
  if (KNOWN_NAMES.has(clean.replace(/\s*—\s*$/, '').trim())) return true
  return false
}

function parseDate(line: string): string | null {
  const m = line.match(/—\s*Dec\s+(\d+)(?:–(\d+))?,\s*2025/)
  if (!m) return null
  if (m[2]) return `Dec ${m[1]}–${m[2]}, 2025`
  return `Dec ${m[1]}, 2025`
}

function parseScoreLine(line: string): TeamScore | null {
  // Table row format from RTF: "1\tSchool Name \t141.0"
  const tabMatch = line.match(/^(\d+)\t(.+?)\t([\d.]+)\s*$/)
  if (tabMatch) {
    return {
      place: parseInt(tabMatch[1]),
      school: tabMatch[2].trim().replace(/\xa0/g, '').trim(),
      score: parseFloat(tabMatch[3]),
    }
  }
  return null
}

// Parse Powerade inline scores: "(1) School 189.5, (2) ..."
function parsePowerade(text: string): TeamScore[] {
  const scores: TeamScore[] = []
  const matches = [...text.matchAll(/\((\d+)\)\s+([^(,]+?)\s+([\d.]+)(?:,|$)/g)]
  for (const m of matches) {
    scores.push({
      place: parseInt(m[1]),
      school: m[2].trim(),
      score: parseFloat(m[3]),
    })
  }
  return scores
}

// Walk lines
let i = 0
while (i < lines.length) {
  const line = lines[i]
  const cleanName = line.replace(/\s*—\s*$/, '').trim()

  if (isTournamentName(line)) {
    if (current) tournaments.push(current)
    current = { name: cleanName, venue: null, address: [], date: null, scores: [], rawLines: [] }
    i++
    continue
  }

  if (!current) { i++; continue }

  current.rawLines.push(line)

  // Date line
  const date = parseDate(line)
  if (date) {
    current.date = date
    i++
    continue
  }

  // Score row (tab-separated)
  const score = parseScoreLine(line)
  if (score) {
    current.scores.push(score)
    i++
    continue
  }

  // Powerade inline scores block
  if (line.includes('Lake Highland Prep') || line.match(/\(\d+\)\s+\w.+[\d.]+,/)) {
    const scores = parsePowerade(line)
    if (scores.length > 0) {
      current.scores.push(...scores)
      i++
      continue
    }
  }

  // Address lines (contains street/city/zip or "High School" / "School")
  if (!current.venue && (line.match(/High School|Middle School|Athletic|Academy|University|Walsh|Canon|Regional School/i))) {
    current.venue = line
  } else if (current.venue && !current.date && !score) {
    current.address.push(line)
  }

  i++
}

if (current) tournaments.push(current)

// ── Step 3: print structured output ──────────────────────────────────────────

for (const t of tournaments) {
  console.log(`\n=== ${t.name} ===`)
  console.log(`  Venue:   ${t.venue ?? '(none)'}`)
  console.log(`  Address: ${t.address.join(', ') || '(none)'}`)
  console.log(`  Date:    ${t.date ?? '(none)'}`)
  console.log(`  Scores:  ${t.scores.length} teams`)
  if (t.scores.length > 0) {
    for (const s of t.scores.slice(0, 5)) {
      console.log(`    ${s.place}. ${s.school} — ${s.score}`)
    }
    if (t.scores.length > 5) console.log(`    ...and ${t.scores.length - 5} more`)
  }
}

console.log(`\n\nTotal: ${tournaments.length} tournaments parsed`)
console.log(`With scores: ${tournaments.filter(t => t.scores.length > 0).length}`)
console.log(`Without scores: ${tournaments.filter(t => t.scores.length === 0).length}`)
