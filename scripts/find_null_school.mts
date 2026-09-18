import { parseDualMeetText } from '../src/lib/parseDualMeet'
import { readFileSync } from 'fs'

const envFile = readFileSync('.env.local', 'utf8')
for (const line of envFile.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/); if (m) process.env[m[1].trim()] = m[2].trim()
}

const raw = readFileSync('../Whizzer Upload/December 2025 Dual Results.rtf', 'latin1')
const text = raw
  .replace(/\\'([0-9a-fA-F]{2})/g, (_: string, h: string) => String.fromCharCode(parseInt(h, 16)))
  .replace(/\\par[d ]?/g, '\n')
  .replace(/\\[a-z]+[-]?[0-9]* ?/g, '')
  .replace(/[{}]/g, '')

const meets = parseDualMeetText(text)

let count = 0
for (const meet of meets) {
  for (const m of meet.matches) {
    if (m.isDoubleForfeit) continue
    // Winner with no school
    if (m.winnerName && !m.winnerSchoolRaw) {
      console.log(`WINNER null school: "${m.winnerName}" in ${meet.team1Name} vs ${meet.team2Name} (${meet.date}) wt=${m.weightClass}`)
      count++
    }
    // Loser with no school (for non-forfeit matches)
    if (!m.isForfeitWin && m.loserName && !m.loserSchoolRaw && !/^unknown$/i.test(m.loserName ?? '')) {
      console.log(`LOSER null school: "${m.loserName}" in ${meet.team1Name} vs ${meet.team2Name} (${meet.date}) wt=${m.weightClass}`)
      count++
    }
  }
}
console.log(`\nTotal wrestlers with null school (non-forfeit): ${count}`)
