/**
 * Extracts tournament venue + team score data from Tournament Scores.rtf
 * Handles 4 formats:
 *   1. RTF nested table (\nestcell / \nestrow)
 *   2. Powerade inline "(1) School score, ..."
 *   3. Numbered list "1. School - score"  (Cutter, Ron Mazzola, Robin Leff)
 *   4. Iron Man plain text "N School  score"
 */
import { readFileSync, writeFileSync } from 'fs'

const raw = readFileSync('/Users/thebrain/Desktop/wrestling_brackets/whizzer upload/Tournament Scores.rtf', 'latin1')

// ── Step 1: Fix hyperlinks first (before any stripping) ─────────────────────
// Pattern: {\field{\*\fldinst{HYPERLINK "url"}}{\fldrslt \cf8 \ul \ulc8 SchoolName}}
let rtf = raw.replace(/\{\\field\{[^}]+\}\{\\fldrslt ([^}]+)\}\}/g, (_, inner) => {
  // inner looks like: `\cf8 \ul \ulc8 \strokec8 School Name`
  return inner.replace(/\\[a-z0-9*]+\s*/gi, '').trim()
})

// ── Step 2: Extract all text & preserve nestcell structure ──────────────────
// Replace nestcell/nestrow with unique delimiters
rtf = rtf.replace(/\\nestcell\s*/g, '|CELL|')
rtf = rtf.replace(/\\nestrow\s*/g, '|ROW|\n')
// Unicode line separator
rtf = rtf.replace(/\\uc0\\u8232\s*/g, '\n')
// Special chars
rtf = rtf.replace(/\\'96/g, '–')
rtf = rtf.replace(/\\'97/g, '—')
rtf = rtf.replace(/\\'a0/g, ' ')
rtf = rtf.replace(/\\'[0-9a-f]{2}/gi, '')
// Remove all RTF control groups and words
rtf = rtf.replace(/\{[^{}]*\}/gs, ' ')
rtf = rtf.replace(/\\[a-z*]+[-]?\d*\s*/gi, ' ')
rtf = rtf.replace(/[{}]/g, '')
// Normalize whitespace but preserve newlines and our delimiters
rtf = rtf.replace(/[^\S\n|]+/g, ' ')

// ── Step 3: Parse nested table rows ─────────────────────────────────────────
// Each row looks like: ...text|CELL|...text|CELL|...text|CELL||ROW|
type NestRow = string[]
const nestRows: NestRow[] = []
const rowRegex = /([^|]*\|CELL\|[^|]*\|CELL\|[^|]*\|CELL\|)\|ROW\|/g
let m: RegExpExecArray | null
while ((m = rowRegex.exec(rtf)) !== null) {
  const cells = m[1].split('|CELL|').map(c => c.replace(/\s+/g, ' ').trim())
  if (cells.length >= 3) nestRows.push(cells)
}

// ── Step 4: Group nestRows into score tables ─────────────────────────────────
// A score table is a consecutive run of rows where:
//   col0 = place (number or empty)
//   col1 = school name (text)
//   col2 = score (number)
type TeamScore = { place: number; school: string; score: number }
type ScoreTable = { rows: TeamScore[] }

function isScoreRow(cells: string[]): boolean {
  if (cells.length < 3) return false
  const place = cells[0].trim()
  const score = parseFloat(cells[2].trim())
  return !isNaN(score) && score >= 0
}

function extractScoreTables(): Map<string, TeamScore[]> {
  // We'll assign score tables to tournaments by context — just return all tables
  const tables: TeamScore[][] = []
  let current: TeamScore[] = []

  for (const row of nestRows) {
    if (isScoreRow(row)) {
      const place = parseInt(row[0].trim()) || (current.length + 1)
      const school = row[1].replace(/\xa0|\s+/g, ' ').trim().replace(/\s+$/, '')
      const score = parseFloat(row[2].trim())
      current.push({ place, school, score })
    } else {
      if (current.length >= 2) tables.push([...current])
      current = []
    }
  }
  if (current.length >= 2) tables.push([...current])

  return tables as any
}

// ── Step 5: Parse plain text portion ────────────────────────────────────────
// Get a version of rtf without the nestrow/nestcell blocks
const plainText = rtf
  .replace(/[^|]+\|CELL\|[^|]+\|CELL\|[^|]+\|CELL\|\|ROW\|\n?/g, '')
  .replace(/\|CELL\|/g, ' ')
  .replace(/\|ROW\|/g, '\n')
  .split('\n')
  .map(l => l.trim())
  .filter(l => l && !l.match(/^[\\|]/))

// ── Step 6: Identify tournament blocks from plain text ───────────────────────
const TOURNAMENT_MAP: Record<string, string> = {
  'Robin Leff Tournament': 'Robin Leff Tournament',
  'Elmwood Park Crusader Classic': 'Elmwood Park Crusader Classic',
  'Dan Allen Clipper Classic': 'Dan Allen Clipper Classic',
  'Irvington Holiday Tournament': 'Irvington Holiday Tournament',
  'John and Betty Vogeding': 'John and Betty Vogeding',
  'Powerade': 'Powerade',
  'Iron Man Tournament': 'Iron Man Tournament',
  'Blue Devil Classic': 'Blue Devil Classic',
  'Wendy Pandy-Leh Wrestling Invitational': 'Wendy Pandy-Leh Wrestling Invitational',
  'Ramsey Invitational': 'Ramsey Invitational',
  'Schalick Classic': 'Schalick Classic',
  'Ronald Bond Wrestling Tournament': 'Ronald Bond Wrestling Tournament',
  'Frank M. Dawson Jr. Holiday Tournament': 'Frank M. Dawson Jr. Holiday Tournament',
  'Caldwell Tournament': 'Caldwell Tournament',
  'Harry McLaughlin Invitational': 'Harry McLaughlin Invitational',
  'Pete Adams Memorial': 'Pete Adams Memorial',
  'Ricky I Memorial Tournament': 'Ricky I Memorial Tournament',
  'Dover Holiday Tournament': 'Dover Holiday Tournament',
  'Central Regional Golden Eagle Classic': 'Central Regional Golden Eagle Classic',
  'Mike Dessino Invitational': 'Mike Dessino Invitational',
  'Beast of the East': 'Beast of the East',
  'Cutter Classic': 'Cutter Classic',
  'Mustang Invitational Tournament': 'Mustang Invitational Tournament',
  'A-Nice Invitational': 'A-Nice Invitational',
  'Gator Beast Wrestling Tournament': 'Gator Beast Wrestling Tournament',
  '12th Annual Laker Holiday Tournament': '12th Annual Laker Holiday Tournament',
  'Ron Mazzola Memorial Wrestling Tournament': 'Ron Mazzola Memorial Wrestling Tournament',
  'Kearny Holiday Tournament': 'Kearny Holiday Tournament',
  'Garden State Classic': 'Garden State Classic',
  'TCNJ Pride': 'TCNJ Pride',
  'Hammonton Kick-Off Tournament': 'Hammonton Kick-Off Tournament',
  'Palmyra Panther High School Wrestling Tournament': 'Palmyra Panther High School Wrestling Tournament',
  'Holmdel Holiday Tournament': 'Holmdel Holiday Tournament',
  'Linn Crawn Memorial Tournament': 'Linn Crawn Memorial Tournament',
  'Hunterdon Central Invitational': 'Hunterdon Central Invitational',
  'Bart Payne HT Holiday Tournament': 'Bart Payne HT Holiday Tournament',
  'Lenape Valley Tournament': 'Lenape Valley Tournament',
  'Walter Woods Holiday Tournament': 'Walter Woods Holiday Tournament',
  'Bethlehem Holiday Wrestling Classic': 'Bethlehem Holiday Wrestling Classic',
  'Mustang Classic': 'Mustang Classic',
  'Overbrook Holiday Wrestling Tournament': 'Overbrook Holiday Wrestling Tournament',
  'King of The Castle': 'King of The Castle',
  'Parsippany Hills Holiday Tournament': 'Parsippany Hills Holiday Tournament',
  'Rahway Holiday Tournament': 'Rahway Holiday Tournament',
  'Tim Groves Holiday Tournament': 'Tim Groves Holiday Tournament',
  'East Brunswick Bear Invitational': 'East Brunswick Bear Invitational',
}

function matchTournamentName(line: string): string | null {
  const clean = line.replace(/\s*—\s*$/, '').trim().replace(/\s+/g, ' ')
  for (const key of Object.keys(TOURNAMENT_MAP)) {
    if (clean === key || clean.startsWith(key) || clean.endsWith(key)) return key
  }
  return null
}

type TournamentInfo = {
  name: string
  venue: string | null
  address: string[]
  date: string | null
  textScores: TeamScore[]
}

const seen = new Set<string>()
const tournaments: TournamentInfo[] = []
let cur: TournamentInfo | null = null
let lastWasDate = false

for (const line of plainText) {
  const name = matchTournamentName(line)
  if (name && !seen.has(name)) {
    if (cur) tournaments.push(cur)
    seen.add(name)
    cur = { name, venue: null, address: [], date: null, textScores: [] }
    lastWasDate = false
    continue
  }
  if (!cur) continue

  // Date
  const dm = line.match(/—\s*(Dec\s+\d+(?:[–-]\d+)?,\s*202\d)/)
  if (dm) { cur.date = dm[1]; lastWasDate = true; continue }

  // Venue: line containing "High School", "Middle School", "Academy", etc.
  if (!cur.venue && line.match(/High School|Middle School|Regional|Academy|College|Center|Arena|University|Hall|Canon/i)
      && !line.match(/^\d/) && !line.match(/—/)) {
    cur.venue = line.replace(/\s*\\$/, '').trim()
    continue
  }

  // Address: line with NJ/PA/OH zip or street
  if (!lastWasDate && cur.venue && !cur.date && line.match(/\d{5}|Avenue|Street|Road|Drive|Boulevard|Ext|Blvd|St\b/i)) {
    cur.address.push(line.replace(/\s*\\$/, '').trim())
    continue
  }

  // Plain text scores: "1. School - 197" or "1) School 189.5" or "8. School - 87"
  const listM = line.match(/^(\d+)[.)]\s+(.+?)\s*[-–]\s*([\d.]+)$/)
  if (listM) {
    cur.textScores.push({ place: parseInt(listM[1]), school: listM[2].trim(), score: parseFloat(listM[3]) })
    continue
  }

  // Iron Man format: "1 Faith Christian Academy  141.0"
  const ironM = line.match(/^(\d+)\s+(.+?)\s{2,}([\d.]+)\s*$/)
  if (ironM && parseInt(ironM[1]) <= 100) {
    cur.textScores.push({ place: parseInt(ironM[1]), school: ironM[2].trim(), score: parseFloat(ironM[3]) })
    continue
  }

  // Powerade inline
  if (line.match(/\(\d+\)\s+.+[\d.]+,/)) {
    const matches = [...line.matchAll(/\((\d+)\)\s+([^(,]+?)\s+([\d.]+)(?:,|$)/g)]
    for (const mm of matches) {
      const school = mm[2].replace(/\xa0/g, '').trim()
      if (school && !school.match(/^\s*$/)) {
        cur.textScores.push({ place: parseInt(mm[1]), school, score: parseFloat(mm[3]) })
      }
    }
  }
}
if (cur) tournaments.push(cur)

// ── Step 7: Extract nestRow tables and assign to tournaments ─────────────────
const scoreTables = extractScoreTables()
const tableArr = Array.from(scoreTables as unknown as TeamScore[][])

// Print plain text summary first
console.log('=== TOURNAMENT VENUE & PLAIN TEXT SCORES ===\n')
for (const t of tournaments) {
  console.log(`${t.name}`)
  console.log(`  Venue:   ${t.venue ?? '(none)'}`)
  console.log(`  Address: ${t.address.join(', ') || '(none)'}`)
  console.log(`  Date:    ${t.date ?? '(none)'}`)
  if (t.textScores.length > 0) {
    console.log(`  Scores (${t.textScores.length} teams):`)
    for (const s of t.textScores.slice(0, 5)) {
      console.log(`    ${s.place}. ${s.school} — ${s.score}`)
    }
    if (t.textScores.length > 5) console.log(`    ...and ${t.textScores.length - 5} more`)
  }
  console.log()
}

console.log(`\n=== RTF NESTED TABLE SCORE TABLES (${tableArr.length} tables found) ===\n`)
for (let i = 0; i < tableArr.length; i++) {
  const table = tableArr[i]
  console.log(`Table ${i + 1} (${table.length} teams):`)
  for (const s of table.slice(0, 5)) {
    console.log(`  ${s.place}. ${s.school} — ${s.score}`)
  }
  if (table.length > 5) console.log(`  ...and ${table.length - 5} more`)
  console.log()
}
