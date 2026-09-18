import { parseDualMeetText } from '../src/lib/parseDualMeet'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'

const envFile = readFileSync('.env.local', 'utf8')
for (const line of envFile.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/); if (m) process.env[m[1].trim()] = m[2].trim()
}

// Use macOS textutil — same conversion as the user's clipboard paste
const text = execSync(
  'textutil -convert txt -stdout "/Users/thebrain/Desktop/wrestling_brackets/Whizzer Upload/December 2025 Dual Results.rtf"',
  { maxBuffer: 50 * 1024 * 1024 }
).toString()

const meets = parseDualMeetText(text)
console.log(`Parsed ${meets.length} meets`)

let count = 0
for (const meet of meets) {
  for (const m of meet.matches) {
    if (m.isDoubleForfeit) continue
    if (m.winnerName && !m.winnerSchoolRaw) {
      console.log(`WINNER null school: "${m.winnerName}" in "${meet.team1Name}" vs "${meet.team2Name}" (${meet.date}) wt=${m.weightClass}`)
      count++
    }
    if (!m.isForfeitWin && m.loserName && !m.loserSchoolRaw && !/^unknown$/i.test(m.loserName ?? '')) {
      console.log(`LOSER  null school: "${m.loserName}" in "${meet.team1Name}" vs "${meet.team2Name}" (${meet.date}) wt=${m.weightClass}`)
      count++
    }
  }
}
console.log(`\nTotal wrestlers with null school (non-forfeit): ${count}`)
