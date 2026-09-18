import { readFileSync, writeFileSync } from 'fs'

const raw = readFileSync('/Users/thebrain/Desktop/wrestling_brackets/whizzer upload/Tournament Scores.rtf', 'latin1')

function stripRtf(rtf: string): string {
  let s = rtf
  s = s.replace(/\\uc0\\u8232\s*/g, '\n')
  s = s.replace(/\\'96/g, '–')
  s = s.replace(/\\'97/g, '—')
  s = s.replace(/\\'a0/g, ' ')
  s = s.replace(/\\'[0-9a-f]{2}/gi, '')
  // Extract hyperlink display text
  s = s.replace(/\{\\field\{[^}]*\}\{\\fldrslt ([^}]+)\}\}/gs, (_, inner) => {
    return inner.replace(/\\[a-z0-9*\s]+/gi, '').replace(/\s+/g, ' ').trim()
  })
  // Remove all RTF groups
  s = s.replace(/\{[^{}]*\}/gs, '')
  // Remove control words
  s = s.replace(/\\[a-z*][-]?\d*\n?/gi, '')
  // Clean up
  s = s.replace(/[ \t]+/g, ' ')
  s = s.replace(/^\s*/gm, '')
  return s
}

const text = stripRtf(raw)
writeFileSync('/tmp/tournament_scores_clean.txt', text, 'utf8')
console.log('Written to /tmp/tournament_scores_clean.txt')
console.log('Length:', text.length)

// Show sections around each tournament
const lines = text.split('\n').map(l => l.trim()).filter(l => l)
const KNOWN = ['Robin Leff', 'Elmwood Park', 'Dan Allen', 'Irvington', 'John and Betty', 'Powerade', 'Iron Man', 'Blue Devil', 'Wendy Pandy', 'Ramsey', 'Schalick', 'Ronald Bond', 'Frank M. Dawson', 'Caldwell', 'Harry McLaughlin', 'Pete Adams', 'Ricky I Memorial', 'Dover Holiday', 'Central Regional', 'Mike Dessino', 'Beast of the East', 'Cutter Classic', 'Mustang Invitational', 'A-Nice', 'Gator Beast', 'Laker Holiday', 'Ron Mazzola', 'Kearny Holiday', 'Garden State Classic', 'TCNJ Pride', 'Hammonton', 'Palmyra', 'Holmdel', 'Linn Crawn', 'Hunterdon Central', 'Bart Payne', 'Lenape Valley', 'Walter Woods', 'Bethlehem Holiday', 'Mustang Classic', 'Overbrook', 'King of The Castle', 'Parsippany Hills', 'Rahway', 'Tim Groves', 'East Brunswick']

for (let i = 0; i < lines.length; i++) {
  const l = lines[i]
  if (KNOWN.some(k => l.includes(k))) {
    console.log(`\n[Line ${i}] >>> ${l}`)
    // Show context
    for (let j = i+1; j < Math.min(i+5, lines.length); j++) {
      if (KNOWN.some(k => lines[j].includes(k))) break
      console.log(`  ${lines[j]}`)
    }
  }
}
