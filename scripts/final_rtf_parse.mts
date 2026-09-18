/**
 * Final RTF parser — splits on outer table boundaries (\itap1 between \itap2 blocks)
 */
import { readFileSync, writeFileSync } from 'fs'

const raw = readFileSync('/Users/thebrain/Desktop/wrestling_brackets/whizzer upload/Tournament Scores.rtf', 'latin1')

function cleanCell(s: string): string {
  return s
    .replace(/\\'a0/g, ' ')
    .replace(/\\'[0-9a-f]{2}/gi, '')
    .replace(/\\uc0\\u\d+\s*/g, '')
    .replace(/\\[a-z*!]+[-]?\d*\s*/gi, ' ')
    .replace(/[{}\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Split the RTF into segments at each outer-table paragraph marker
// \pard\intbl\itap1 = back in the outer table (between tournament score blocks)
const segments = raw.split(/\\pard\\intbl\\itap1/)

type TeamScore = { place: number; school: string; score: number }
type TournamentBlock = { contextText: string; scores: TeamScore[] }

const blocks: TournamentBlock[] = []

for (const seg of segments) {
  // Extract nested table rows from this segment
  // Pattern: \pard\intbl\itap2 ... content \nestcell ... content \nestcell ... content \nestcell \nestrow
  const rows: TeamScore[] = []

  const rowPattern = /\\pard\\intbl\\itap2[^\\]*(?:\\[^\n ]+\s*)*([^\\{]*(?:\\[^n][^\n ]*\s*[^\\{]*)*)\\nestcell[^\\{]*(?:\\[^n][^\n ]*\s*)*([\w\s,.'\-\/()áéíóú&]+)(?:\\[^\n ]+\s*)*\\nestcell[^\\{]*(?:\\[^n][^\n ]*\s*)*([\d.]+)\s*\\nestcell\s*\\nestrow/gi

  // Simpler: just find all nestcell sequences
  // Split segment by \nestrow to get individual rows
  const nestRowSections = seg.split('\\nestrow')

  for (const section of nestRowSections) {
    if (!section.includes('\\itap2')) continue

    // Get all nestcell content
    const cellParts = section.split('\\nestcell')
    if (cellParts.length < 3) continue

    const cells = cellParts.slice(0, 3).map(cleanCell)
    const [placeRaw, schoolRaw, scoreRaw] = cells

    const place = parseInt(placeRaw.replace(/\D/g, ''))
    const school = schoolRaw.replace(/^\d+\s*/, '').trim()
    const score = parseFloat(scoreRaw.replace(/[^\d.]/g, ''))

    if (!isNaN(score) && score > 0 && school.length > 1 && school.length < 80) {
      rows.push({ place: isNaN(place) ? rows.length + 1 : place, school, score })
    }
  }

  // Get context (text before any nested table) to identify tournament
  const contextText = cleanCell(seg.split('\\itap2')[0] || seg.substring(0, 200))

  if (rows.length >= 1 || contextText.length > 10) {
    blocks.push({ contextText, scores: rows })
  }
}

// Now assign scores to tournaments by looking at context text
const KNOWN: [string, string[]][] = [
  ['Robin Leff Tournament', ['Robin Leff']],
  ['Iron Man Tournament', ['Iron Man', 'Walsh Jesuit']],
  ['Blue Devil Classic', ['Blue Devil', 'Ewing']],
  ['Wendy Pandy-Leh Wrestling Invitational', ['Wendy Pandy', 'Delaware Valley']],
  ['Ramsey Invitational', ['Ramsey']],
  ['Schalick Classic', ['Schalick']],
  ['Ronald Bond Wrestling Tournament', ['Ronald Bond', 'Haddonfield']],
  ['Frank M. Dawson Jr. Holiday Tournament', ['Dawson', 'Garfield']],
  ['Caldwell Tournament', ['Caldwell']],
  ['Harry McLaughlin Invitational', ['McLaughlin', 'Ramapo Ridge']],
  ['Pete Adams Memorial', ['Pete Adams', 'Vineland']],
  ['Ricky I Memorial Tournament', ['Ricky', 'Governor Livingston']],
  ['Dover Holiday Tournament', ['Dover']],
  ['Central Regional Golden Eagle Classic', ['Central Regional']],
  ['Mike Dessino Invitational', ['Dessino', 'Middlesex']],
  ['Beast of the East', ['Beast', 'Carpenter']],
  ['Cutter Classic', ['Cutter', 'Fair Lawn']],
  ['Mustang Invitational Tournament', ['Mustang Invitational', 'Clifton']],
  ['A-Nice Invitational', ['A-Nice', 'Roselle Park']],
  ['Gator Beast Wrestling Tournament', ['Gator', 'Gateway']],
  ['12th Annual Laker Holiday Tournament', ['Laker', 'Mountain Lakes']],
  ['Ron Mazzola Memorial Wrestling Tournament', ['Mazzola', 'Old Bridge']],
  ['Kearny Holiday Tournament', ['Kearny']],
  ['Garden State Classic', ['Garden State']],
  ['TCNJ Pride', ['TCNJ']],
  ['Hammonton Kick-Off Tournament', ['Hammonton']],
  ['Elmwood Park Crusader Classic', ['Elmwood Park', 'Elmwood']],
  ['Dan Allen Clipper Classic', ['Dan Allen', 'Clayton']],
  ['Irvington Holiday Tournament', ['Irvington']],
  ['John and Betty Vogeding', ['Vogeding', 'Paulsboro']],
  ['Powerade', ['Powerade', 'McMillan', 'Canon']],
  ['Palmyra Panther High School Wrestling Tournament', ['Palmyra']],
  ['Holmdel Holiday Tournament', ['Holmdel']],
  ['Linn Crawn Memorial Tournament', ['Linn Crawn']],
  ['Hunterdon Central Invitational', ['Hunterdon Central']],
  ['Bart Payne HT Holiday Tournament', ['Bart Payne']],
  ['Lenape Valley Tournament', ['Lenape Valley']],
  ['Walter Woods Holiday Tournament', ['Walter Woods']],
  ['Bethlehem Holiday Wrestling Classic', ['Bethlehem']],
  ['Mustang Classic', ['Mustang Classic']],
  ['Overbrook Holiday Wrestling Tournament', ['Overbrook']],
  ['King of The Castle', ['King of']],
  ['Parsippany Hills Holiday Tournament', ['Parsippany Hills']],
  ['Rahway Holiday Tournament', ['Rahway']],
  ['Tim Groves Holiday Tournament', ['Tim Groves']],
  ['East Brunswick Bear Invitational', ['East Brunswick', 'Churchill']],
]

function matchTournament(context: string): string | null {
  for (const [name, keywords] of KNOWN) {
    if (keywords.some(k => context.includes(k))) return name
  }
  return null
}

const result: Record<string, { venue: string; scores: TeamScore[] }> = {}

for (const block of blocks) {
  const name = matchTournament(block.contextText)
  if (!name) continue
  if (!result[name]) result[name] = { venue: block.contextText.substring(0, 100), scores: [] }
  result[name].scores.push(...block.scores)
}

// Output
console.log('=== PARSED TOURNAMENT SCORES ===\n')
let withScores = 0
for (const [name, data] of Object.entries(result)) {
  if (data.scores.length === 0) continue
  withScores++
  console.log(`${name} (${data.scores.length} teams)`)
  for (const s of data.scores.slice(0, 6)) {
    console.log(`  ${s.place}. ${s.school} — ${s.score}`)
  }
  if (data.scores.length > 6) console.log(`  ...${data.scores.length - 6} more`)
  console.log()
}
console.log(`${withScores} tournaments with scores`)

// Also write full data to file for inspection
writeFileSync('/tmp/parsed_scores.json', JSON.stringify(result, null, 2))
console.log('\nFull data written to /tmp/parsed_scores.json')
